from flask import Flask, request, Response, jsonify, stream_with_context
from flask_cors import CORS
import yt_dlp
import os
import json
import threading
import uuid
import tempfile
import shutil

app = Flask(__name__)

CORS(app, origins=[
    "http://localhost:5173",
    "https://stucon.netlify.app"
])

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COOKIE_FILE = os.path.join(BASE_DIR, "cookies.txt")

# If cookies stored in environment (Render)
if os.getenv("YTDLP_COOKIES"):
    with open(COOKIE_FILE, "w", encoding="utf-8") as f:
        f.write(os.getenv("YTDLP_COOKIES"))

# ─────────────────────────────────────────────
# PROGRESS TRACKING
# ─────────────────────────────────────────────
progress_store = {}
progress_lock = threading.Lock()

def update_progress(job_id, data):
    with progress_lock:
        progress_store[job_id] = data

def cleanup_job(job_id):
    with progress_lock:
        progress_store.pop(job_id, None)

# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────
@app.route("/")
def home():
    return jsonify({"status": "✅ Advanced YT-DLP API Running", "version": "3.0"})

# ─────────────────────────────────────────────
# METADATA / INFO
# ─────────────────────────────────────────────
@app.route("/info", methods=["POST"])
def get_info():
    data = request.json
    url = data.get("url")
    if not url:
        return jsonify({"error": "URL required"}), 400

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "cookiefile": COOKIE_FILE
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        formats = []
        seen = set()
        for f in info.get("formats", []):
            height = f.get("height")
            ext = f.get("ext")
            vcodec = f.get("vcodec", "none")

            if height and vcodec != "none" and ext == "mp4":
                label = f"{height}p"
                if label not in seen:
                    seen.add(label)
                    formats.append({
                        "label": label,
                        "height": height,
                        "filesize": f.get("filesize") or f.get("filesize_approx")
                    })

        formats.sort(key=lambda x: x["height"], reverse=True)

        return jsonify({
            "title": info.get("title"),
            "uploader": info.get("uploader"),
            "duration": info.get("duration"),
            "view_count": info.get("view_count"),
            "thumbnail": info.get("thumbnail"),
            "formats": formats,
            "webpage_url": info.get("webpage_url"),
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─────────────────────────────────────────────
# DOWNLOAD
# ─────────────────────────────────────────────
@app.route("/download", methods=["POST"])
def download():
    data = request.json
    url = data.get("url")
    file_type = data.get("type", "mp4")
    quality = data.get("quality", "1080")

    if not url:
        return jsonify({"error": "URL required"}), 400

    tmp_dir = tempfile.mkdtemp()

    try:
        output_template = os.path.join(tmp_dir, "%(title)s.%(ext)s")

        if file_type in ("mp4", "webm"):
            fmt = f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]"
            ydl_opts = {
                "format": fmt,
                "merge_output_format": file_type,
                "outtmpl": output_template,
                "cookiefile": COOKIE_FILE
            }

        elif file_type == "mp3":
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": output_template,
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": str(quality),
                }],
                "cookiefile": COOKIE_FILE
            }

        else:
            return jsonify({"error": "Unsupported type"}), 400

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        downloaded = os.path.join(tmp_dir, os.listdir(tmp_dir)[0])

        if not os.path.exists(downloaded):
            return jsonify({"error": "Download failed"}), 500

        title = info.get("title", "download").replace("/", "_")
        ext = os.path.splitext(downloaded)[1]
        safe_name = f"{title}{ext}"

        def generate_and_cleanup():
            try:
                with open(downloaded, "rb") as f:
                    while chunk := f.read(1024 * 256):
                        yield chunk
            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)

        return Response(
            stream_with_context(generate_and_cleanup()),
            mimetype="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}"'
            }
        )

    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return jsonify({"error": str(e)}), 500

# ─────────────────────────────────────────────
# SUBTITLES
# ─────────────────────────────────────────────
@app.route("/subtitles", methods=["POST"])
def list_subtitles():
    data = request.json
    url = data.get("url")

    if not url:
        return jsonify({"error": "URL required"}), 400

    ydl_opts = {
        "quiet": True,
        "skip_download": True,
        "writesubtitles": True,
        "allsubtitles": True,
        "cookiefile": COOKIE_FILE
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        return jsonify({
            "manual": list(info.get("subtitles", {}).keys()),
            "automatic": list(info.get("automatic_captions", {}).keys())
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, threaded=True)
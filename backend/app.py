from flask import Flask, request, Response, jsonify, stream_with_context
from flask_cors import CORS
import yt_dlp
import os
import io
import subprocess
import json
import threading
import uuid
import tempfile
import shutil

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# PROGRESS TRACKING (in-memory, auto-cleaned)
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
# METADATA / INFO (no download)
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
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        # Build available formats
        formats = []
        seen = set()
        for f in info.get("formats", []):
            height = f.get("height")
            ext = f.get("ext")
            vcodec = f.get("vcodec", "none")
            acodec = f.get("acodec", "none")
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

        # Playlist support
        is_playlist = info.get("_type") == "playlist"
        entries = []
        if is_playlist:
            for e in (info.get("entries") or [])[:50]:  # cap at 50
                if e:
                    entries.append({
                        "id": e.get("id"),
                        "title": e.get("title"),
                        "duration": e.get("duration"),
                        "thumbnail": e.get("thumbnail"),
                        "url": e.get("webpage_url") or f"https://www.youtube.com/watch?v={e.get('id')}"
                    })

        result = {
            "title": info.get("title"),
            "uploader": info.get("uploader"),
            "duration": info.get("duration"),
            "view_count": info.get("view_count"),
            "like_count": info.get("like_count"),
            "thumbnail": info.get("thumbnail"),
            "description": (info.get("description") or "")[:500],
            "upload_date": info.get("upload_date"),
            "formats": formats,
            "is_playlist": is_playlist,
            "playlist_count": info.get("playlist_count"),
            "entries": entries,
            "webpage_url": info.get("webpage_url"),
            "extractor": info.get("extractor"),
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# PROGRESS SSE STREAM
# ─────────────────────────────────────────────
@app.route("/progress/<job_id>")
def progress(job_id):
    def generate():
        import time
        timeout = 300  # 5 min max
        start = time.time()
        while time.time() - start < timeout:
            with progress_lock:
                data = progress_store.get(job_id)
            if data:
                yield f"data: {json.dumps(data)}\n\n"
                if data.get("status") in ("done", "error"):
                    break
            time.sleep(0.5)

    return Response(stream_with_context(generate()),
                    mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ─────────────────────────────────────────────
# STREAMING DOWNLOAD — NO STORAGE ON SERVER
# ─────────────────────────────────────────────
@app.route("/download", methods=["POST"])
def download():
    data = request.json
    url = data.get("url")
    file_type = data.get("type", "mp4")   # mp4 | mp3 | webm | wav | ogg | opus
    quality = data.get("quality", "1080") # height for video, bitrate for audio
    job_id = data.get("job_id", str(uuid.uuid4()))
    subtitle_lang = data.get("subtitle_lang")  # e.g. "en"
    embed_subs = data.get("embed_subs", False)
    speed_limit = data.get("speed_limit")  # e.g. "5M"
    proxy = data.get("proxy")  # optional proxy

    if not url:
        return jsonify({"error": "URL required"}), 400

    # Use a temp dir that we fully control
    tmp_dir = tempfile.mkdtemp()

    try:
        output_template = os.path.join(tmp_dir, "%(title)s.%(ext)s")
        filepath_holder = {}

        def progress_hook(d):
            if d["status"] == "downloading":
                pct = d.get("_percent_str", "0%").strip()
                speed = d.get("_speed_str", "?").strip()
                eta = d.get("_eta_str", "?").strip()
                update_progress(job_id, {
                    "status": "downloading",
                    "percent": pct,
                    "speed": speed,
                    "eta": eta,
                    "filename": d.get("filename", "")
                })
            elif d["status"] == "finished":
                filepath_holder["path"] = d["filename"]
                update_progress(job_id, {"status": "processing"})

        # ── MP4 / WEBM ──────────────────────────────────────
        if file_type in ("mp4", "webm"):
            fmt = f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]"
            ydl_opts = {
                "format": fmt,
                "merge_output_format": file_type,
                "outtmpl": output_template,
                "progress_hooks": [progress_hook],
                "postprocessors": [],
            }
            if embed_subs and subtitle_lang:
                ydl_opts["writesubtitles"] = True
                ydl_opts["subtitleslangs"] = [subtitle_lang]
                ydl_opts["postprocessors"].append({"key": "FFmpegEmbedSubtitle"})

        # ── MP3 ─────────────────────────────────────────────
        elif file_type == "mp3":
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": output_template,
                "progress_hooks": [progress_hook],
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": str(quality),
                }],
            }

        # ── WAV ─────────────────────────────────────────────
        elif file_type == "wav":
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": output_template,
                "progress_hooks": [progress_hook],
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "wav",
                }],
            }

        # ── OPUS / OGG ──────────────────────────────────────
        elif file_type in ("opus", "ogg"):
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": output_template,
                "progress_hooks": [progress_hook],
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": file_type,
                }],
            }

        else:
            return jsonify({"error": f"Unsupported type: {file_type}"}), 400

        # Optional extras
        if speed_limit:
            ydl_opts["ratelimit"] = speed_limit
        if proxy:
            ydl_opts["proxy"] = proxy

        ydl_opts["quiet"] = False
        ydl_opts["no_warnings"] = False

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)

        # Find the downloaded file
        downloaded = None
        for f in os.listdir(tmp_dir):
            downloaded = os.path.join(tmp_dir, f)
            break

        if not downloaded or not os.path.exists(downloaded):
            update_progress(job_id, {"status": "error", "message": "File not found after download"})
            return jsonify({"error": "Download failed - file not found"}), 500

        title = info.get("title", "download").replace("/", "_")
        ext = os.path.splitext(downloaded)[1]
        safe_name = f"{title}{ext}"

        update_progress(job_id, {"status": "done"})

        # ── Stream file to client, then delete ──────────────
        def generate_and_cleanup():
            try:
                with open(downloaded, "rb") as f:
                    while chunk := f.read(1024 * 256):  # 256KB chunks
                        yield chunk
            finally:
                shutil.rmtree(tmp_dir, ignore_errors=True)
                cleanup_job(job_id)

        mime_map = {
            "mp4": "video/mp4",
            "webm": "video/webm",
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "opus": "audio/opus",
            "ogg": "audio/ogg",
        }
        mime = mime_map.get(file_type, "application/octet-stream")

        return Response(
            stream_with_context(generate_and_cleanup()),
            mimetype=mime,
            headers={
                "Content-Disposition": f'attachment; filename="{safe_name}"',
                "Content-Length": str(os.path.getsize(downloaded)),
                "X-Job-Id": job_id,
            }
        )

    except Exception as e:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        update_progress(job_id, {"status": "error", "message": str(e)})
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# THUMBNAIL DOWNLOAD
# ─────────────────────────────────────────────
@app.route("/thumbnail", methods=["POST"])
def thumbnail():
    data = request.json
    url = data.get("url")
    if not url:
        return jsonify({"error": "URL required"}), 400

    ydl_opts = {"quiet": True, "skip_download": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
        thumb_url = info.get("thumbnail")
        if not thumb_url:
            return jsonify({"error": "No thumbnail found"}), 404

        import urllib.request
        with urllib.request.urlopen(thumb_url) as r:
            data = r.read()

        return Response(data, mimetype="image/jpeg",
                        headers={"Content-Disposition": 'attachment; filename="thumbnail.jpg"'})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# SUBTITLES LIST
# ─────────────────────────────────────────────
@app.route("/subtitles", methods=["POST"])
def list_subtitles():
    data = request.json
    url = data.get("url")
    if not url:
        return jsonify({"error": "URL required"}), 400

    ydl_opts = {"quiet": True, "skip_download": True, "writesubtitles": True, "allsubtitles": True}
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        subs = info.get("subtitles", {})
        auto_subs = info.get("automatic_captions", {})
        return jsonify({
            "manual": list(subs.keys()),
            "automatic": list(auto_subs.keys())
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# SUPPORTED SITES
# ─────────────────────────────────────────────
@app.route("/supported-sites")
def supported_sites():
    try:
        extractors = yt_dlp.extractor.gen_extractors()
        sites = list(set(
            e.IE_NAME for e in extractors if not e.IE_NAME.startswith("_")
        ))
        return jsonify({"count": len(sites), "sites": sorted(sites)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, threaded=True)
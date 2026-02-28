import React from "react"; 
import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://localhost:5000";

const AUDIO_FORMATS = ["mp3", "wav", "opus", "ogg"];
const VIDEO_FORMATS = ["mp4", "webm"];
const AUDIO_QUALITIES = ["320", "256", "192", "128", "96", "64"];
const VIDEO_QUALITIES = ["2160", "1440", "1080", "720", "480", "360", "240", "144"];

function fmtDuration(s) {
  if (!s) return "--";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
}
function fmtViews(n) {
  if (!n) return "--";
  if (n >= 1e9) return (n/1e9).toFixed(1)+"B";
  if (n >= 1e6) return (n/1e6).toFixed(1)+"M";
  if (n >= 1e3) return (n/1e3).toFixed(1)+"K";
  return n.toString();
}
function fmtBytes(b) {
  if (!b) return null;
  if (b >= 1e9) return (b/1e9).toFixed(1)+" GB";
  if (b >= 1e6) return (b/1e6).toFixed(1)+" MB";
  return (b/1e3).toFixed(0)+" KB";
}
function fmtDate(d) {
  if (!d) return "--";
  return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
}

const Icon = ({ d, size = 18, stroke = "currentColor", fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const Icons = {
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  search: "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  globe: "M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  image: "M21 15l-5-5L5 21M3 3h18a2 2 0 012 2v14a2 2 0 01-2 2H3a2 2 0 01-2-2V5a2 2 0 012-2zm6.5 6.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  cc: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  rss: "M4 11a9 9 0 019 9M4 4a16 16 0 0116 16M5 19a1 1 0 100-2 1 1 0 000 2z",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5",
  twitter: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  arrowRight: "M5 12h14M12 5l7 7-7 7",
  youtube: "M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.96A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
};

const BLOGS = [
  { id:1, category:"AI News", tag:"🔥 Hot", title:"GPT-5 vs Gemini Ultra 2: The Battle for AI Supremacy in 2025", excerpt:"OpenAI and Google are racing to dominate the LLM landscape. Here's what each model does best and where they fall short.", date:"Feb 28, 2025", read:"6 min", color:"#ef4444" },
  { id:2, category:"Tutorial", tag:"📹 Video", title:"How to Download Any YouTube Video in 4K Without Losing Quality", excerpt:"Step-by-step guide using yt-dlp and stucon to grab ultra-high-definition content from any platform.", date:"Feb 27, 2025", read:"4 min", color:"#3b82f6" },
  { id:3, category:"AI News", tag:"🆕 New", title:"Anthropic's Claude 4 Scores Near-Perfect on Coding Benchmarks", excerpt:"Claude 4 Opus has outperformed all previous AI models on SWE-bench, handling full software engineering tasks autonomously.", date:"Feb 26, 2025", read:"5 min", color:"#8b5cf6" },
  { id:4, category:"Tips & Tricks", tag:"💡 Tip", title:"Extract Audio from Any Streaming Service: A Complete Guide", excerpt:"Convert streams from Spotify, Tidal, Apple Music, and 1700+ platforms to high-quality MP3, FLAC, or WAV files.", date:"Feb 25, 2025", read:"7 min", color:"#10b981" },
  { id:5, category:"AI News", tag:"🚀 Launch", title:"Google Releases Veo 3: AI Video Generator That Rivals Hollywood", excerpt:"Veo 3 can generate photorealistic 4K video clips from simple text prompts, marking a new era for content creators.", date:"Feb 24, 2025", read:"5 min", color:"#f59e0b" },
  { id:6, category:"Deep Dive", tag:"📊 Stats", title:"2025 State of Media Downloading: Platforms, Trends & Legal Landscape", excerpt:"An in-depth look at how content downloading has evolved, what's legal, what's not, and where the industry is heading.", date:"Feb 23, 2025", read:"12 min", color:"#06b6d4" },
];

const AI_NEWS = [
  { title:"OpenAI launches o3-mini with major reasoning improvements", time:"2h ago", hot:true },
  { title:"Meta AI now embedded in WhatsApp for 3B+ users worldwide", time:"5h ago", hot:true },
  { title:"Mistral releases Mistral Large 3 open-weights model", time:"8h ago", hot:false },
  { title:"EU AI Act enforcement begins — companies scramble to comply", time:"12h ago", hot:false },
  { title:"Perplexity AI hits 100M monthly active users milestone", time:"1d ago", hot:true },
  { title:"Stability AI releases SDXL Turbo 2 for real-time image gen", time:"1d ago", hot:false },
  { title:"DeepMind AlphaFold 3 now predicts drug-protein interactions", time:"2d ago", hot:false },
  { title:"Runway Gen-4 introduces cinematic camera controls for AI video", time:"2d ago", hot:true },
];

const STATS = [
  { label:"Supported Sites", value:"1,700+", icon:Icons.globe, color:"#2563eb" },
  { label:"Output Formats", value:"6", icon:Icons.download, color:"#059669" },
  { label:"Max Resolution", value:"4K·8K", icon:Icons.star, color:"#7c3aed" },
  { label:"Server Storage", value:"Zero", icon:Icons.shield, color:"#dc2626" },
];

const PLATFORMS = ["YouTube","Vimeo","Twitter/X","Instagram","TikTok","Facebook","Twitch","Dailymotion","SoundCloud","Reddit","LinkedIn","Pinterest","Bilibili","Niconico","Rumble","Odysee","Mixcloud","Bandcamp","Pornhub","VK","Weibo","NicoVideo","Crunchyroll"];

function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, add };
}

function ProgressBar({ value, label }) {
  const pct = parseFloat(value) || 0;
  return (
    <div style={{ marginTop:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#6b7280", marginBottom:4 }}>
        <span>{label}</span>
        <span style={{ fontWeight:700, color:"#1d4ed8" }}>{value}</span>
      </div>
      <div style={{ height:7, borderRadius:999, background:"#e5e7eb", overflow:"hidden" }}>
        <div style={{
          height:"100%", width:`${Math.min(pct,100)}%`,
          background:"linear-gradient(90deg,#2563eb,#1d4ed8)",
          borderRadius:999, transition:"width 0.4s ease",
          boxShadow:"0 0 6px #2563eb88"
        }} />
      </div>
    </div>
  );
}

function VideoCard({ info }) {
  if (!info) return null;
  return (
    <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, overflow:"hidden", display:"flex", marginTop:16, boxShadow:"0 4px 24px rgba(37,99,235,0.07)" }}>
      {info.thumbnail && (
        <div style={{ position:"relative", flexShrink:0, width:200 }}>
          <img src={info.thumbnail} alt={info.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.82)", color:"#fff", fontSize:11, padding:"2px 7px", borderRadius:5, fontFamily:"monospace", fontWeight:700 }}>
            {fmtDuration(info.duration)}
          </div>
        </div>
      )}
      <div style={{ padding:"16px 20px", flex:1, minWidth:0 }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#111827", marginBottom:4, lineHeight:1.35, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
          {info.title}
        </div>
        <div style={{ fontSize:12, color:"#6b7280", marginBottom:10, fontWeight:600 }}>{info.uploader}</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
          {[["👁",fmtViews(info.view_count),"#dbeafe","#1d4ed8"],["❤️",fmtViews(info.like_count),"#fce7f3","#be185d"],["📅",fmtDate(info.upload_date),"#f0fdf4","#166534"],["🌐",info.extractor,"#fef9c3","#92400e"]].map(([icon,val,bg,col]) => val&&val!=="--" ? (
            <span key={icon} style={{ background:bg, borderRadius:6, padding:"3px 9px", fontSize:11, color:col, fontWeight:700 }}>
              {icon} {val}
            </span>
          ) : null)}
        </div>
        {info.description && (
          <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
            {info.description}
          </div>
        )}
        {info.is_playlist && (
          <div style={{ marginTop:8 }}>
            <span style={{ background:"#ede9fe", color:"#7c3aed", fontSize:11, padding:"3px 9px", borderRadius:6, fontWeight:700 }}>
              📋 Playlist · {info.playlist_count || info.entries?.length} videos
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function QueueItem({ item, onRemove }) {
  const colors = { pending:"#9ca3af", downloading:"#2563eb", processing:"#f59e0b", done:"#10b981", error:"#ef4444" };
  const bgs = { pending:"#f9fafb", downloading:"#eff6ff", processing:"#fffbeb", done:"#f0fdf4", error:"#fef2f2" };
  const color = colors[item.status]||"#9ca3af";
  return (
    <div style={{ background:bgs[item.status]||"#f9fafb", border:`1.5px solid ${color}33`, borderRadius:12, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:"#111827", fontWeight:600, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
          {item.title||item.url}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:3, alignItems:"center" }}>
          <span style={{ fontSize:10, color, fontWeight:800, textTransform:"uppercase", background:`${color}18`, padding:"1px 7px", borderRadius:4 }}>{item.status}</span>
          {item.status==="downloading"&&item.progress&&(<>
            <span style={{ fontSize:10, color:"#6b7280" }}>{item.progress.percent}</span>
            <span style={{ fontSize:10, color:"#6b7280" }}>⚡ {item.progress.speed}</span>
            <span style={{ fontSize:10, color:"#6b7280" }}>⏱ {item.progress.eta}</span>
          </>)}
          {item.status==="error"&&<span style={{ fontSize:10, color:"#ef4444" }}>{item.error}</span>}
        </div>
        {item.status==="downloading"&&item.progress?.percent&&<ProgressBar value={item.progress.percent} label="" />}
      </div>
      <div style={{ display:"flex", gap:4, flexShrink:0, alignItems:"center" }}>
        <span style={{ fontSize:10, background:"#f3f4f6", padding:"2px 7px", borderRadius:4, color:"#374151", border:"1px solid #e5e7eb", fontWeight:700 }}>{item.format?.toUpperCase()}</span>
        {(item.status==="done"||item.status==="error")&&(
          <button onClick={()=>onRemove(item.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:2, borderRadius:4 }}>
            <Icon d={Icons.x} size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function AiNewsSidebar() {
  return (
    <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ background:"#ef4444", borderRadius:8, padding:"5px 7px", display:"flex" }}>
          <Icon d={Icons.rss} size={14} stroke="#fff" />
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:"#111827" }}>Live AI News</div>
          <div style={{ fontSize:10, color:"#9ca3af" }}>Updated every hour</div>
        </div>
      </div>
      <div style={{ display:"flex", flexDirection:"column" }}>
        {AI_NEWS.map((n,i)=>(
          <div key={i} style={{ padding:"10px 0", borderBottom:i<AI_NEWS.length-1?"1px solid #f3f4f6":"none", cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
              {n.hot&&<span style={{ background:"#fef2f2", color:"#ef4444", fontSize:9, fontWeight:800, padding:"2px 5px", borderRadius:4, flexShrink:0, marginTop:2 }}>🔥</span>}
              <div style={{ fontSize:12, color:"#374151", lineHeight:1.4, fontWeight:n.hot?700:500 }}>{n.title}</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:4 }}>
              <Icon d={Icons.clock} size={10} stroke="#9ca3af" />
              <span style={{ fontSize:10, color:"#9ca3af" }}>{n.time}</span>
            </div>
          </div>
        ))}
      </div>
      <button style={{ marginTop:12, width:"100%", background:"#f8faff", border:"1.5px solid #dbeafe", borderRadius:8, padding:"8px 0", fontSize:12, color:"#2563eb", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
        View All AI News <Icon d={Icons.arrowRight} size={13} />
      </button>
    </div>
  );
}

function BlogSidebar() {
  return (
    <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
        <div style={{ background:"#2563eb", borderRadius:8, padding:"5px 7px", display:"flex" }}>
          <Icon d={Icons.trending} size={14} stroke="#fff" />
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:"#111827" }}>Trending Articles</div>
          <div style={{ fontSize:10, color:"#9ca3af" }}>Most read this week</div>
        </div>
      </div>
      {BLOGS.slice(0,5).map((b,i)=>(
        <div key={b.id} style={{ display:"flex", gap:10, paddingBottom:12, marginBottom:12, borderBottom:i<4?"1px solid #f3f4f6":"none", cursor:"pointer" }}>
          <div style={{ width:32, height:32, flexShrink:0, borderRadius:8, background:`${b.color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:b.color, border:`1.5px solid ${b.color}22` }}>
            {i+1}
          </div>
          <div>
            <div style={{ fontSize:11, color:b.color, fontWeight:700, marginBottom:2 }}>{b.category}</div>
            <div style={{ fontSize:12, color:"#374151", fontWeight:600, lineHeight:1.35 }}>{b.title}</div>
            <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center" }}>
              <span style={{ fontSize:10, color:"#9ca3af" }}>{b.date}</span>
              <span style={{ fontSize:10, color:"#9ca3af" }}>· {b.read} read</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatsBar() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
      {STATS.map((s,i)=>(
        <div key={i} style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:14, padding:"16px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.04)", display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
          <div style={{ background:`${s.color}12`, borderRadius:9, padding:"7px 8px", display:"flex" }}>
            <Icon d={s.icon} size={17} stroke={s.color} />
          </div>
          <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
          <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textAlign:"center" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function BlogGrid() {
  return (
    <div style={{ marginTop:44 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:"#111827", letterSpacing:"-0.5px" }}>Latest from stucon Blog</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:3 }}>Tutorials, AI news, and media tips for power users</div>
        </div>
        <button style={{ background:"#eff6ff", border:"1.5px solid #bfdbfe", borderRadius:8, padding:"7px 16px", fontSize:12, color:"#2563eb", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
          All Articles <Icon d={Icons.arrowRight} size={13} />
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
        {BLOGS.map(b=>(
          <div key={b.id} style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:14, overflow:"hidden", cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", transition:"box-shadow 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 28px rgba(37,99,235,0.13)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.04)"}>
            <div style={{ background:`linear-gradient(135deg,${b.color}16,${b.color}06)`, padding:"18px 18px 12px", borderBottom:`3px solid ${b.color}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ background:b.color, color:"#fff", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:5 }}>{b.category}</span>
                <span style={{ background:"#f3f4f6", color:"#6b7280", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:5 }}>{b.tag}</span>
              </div>
              <div style={{ fontSize:14, fontWeight:800, color:"#111827", lineHeight:1.4 }}>{b.title}</div>
            </div>
            <div style={{ padding:"14px 18px" }}>
              <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.65, marginBottom:12 }}>{b.excerpt}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <Icon d={Icons.clock} size={11} stroke="#9ca3af" />
                  <span style={{ fontSize:11, color:"#9ca3af" }}>{b.date}</span>
                </div>
                <span style={{ fontSize:11, color:b.color, fontWeight:800 }}>{b.read} read →</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n:"01", title:"Paste Your URL", desc:"Copy any video URL from YouTube, Vimeo, Twitter, Instagram, TikTok or 1700+ sites and paste it into stucon." },
    { n:"02", title:"Fetch & Choose Quality", desc:"Click Fetch to preview the video, see available resolutions, file sizes, and pick your format: MP4, WebM, MP3, WAV, Opus, or OGG." },
    { n:"03", title:"Download Instantly", desc:"Hit Download. Your file streams directly to your device — nothing is stored on our servers. 100% private and instant." },
  ];
  return (
    <div style={{ background:"linear-gradient(135deg,#f0f9ff,#f8faff)", border:"1.5px solid #bae6fd", borderRadius:20, padding:"28px 28px 24px", marginTop:44 }}>
      <div style={{ fontSize:20, fontWeight:900, color:"#111827", marginBottom:4, letterSpacing:"-0.3px" }}>How stucon Works</div>
      <div style={{ fontSize:13, color:"#6b7280", marginBottom:24 }}>Three simple steps — fast, free, and private</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20 }}>
        {steps.map((s,i)=>(
          <div key={i} style={{ position:"relative" }}>
            {i<2&&<div style={{ position:"absolute", top:18, right:-18, width:36, height:2, background:"linear-gradient(90deg,#93c5fd,#dbeafe)", zIndex:1 }} />}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"#fff", width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, flexShrink:0 }}>{s.n}</div>
              <div style={{ fontSize:14, fontWeight:800, color:"#1e3a8a" }}>{s.title}</div>
            </div>
            <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.65, paddingLeft:46 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformMarquee() {
  return (
    <div style={{ overflow:"hidden", borderTop:"1.5px solid #e5e7eb", borderBottom:"1.5px solid #e5e7eb", padding:"10px 0", background:"#f9fafb", marginTop:44 }}>
      <div style={{ display:"flex", gap:14, animation:"marquee 32s linear infinite", whiteSpace:"nowrap" }}>
        {[...PLATFORMS,...PLATFORMS].map((p,i)=>(
          <span key={i} style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:20, padding:"5px 14px", fontSize:12, color:"#374151", fontWeight:700, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", flexShrink:0 }}>
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function FAQ() {
  const [open,setOpen]=useState(null);
  const items=[
    { q:"Is stucon free to use?", a:"Yes, stucon is completely free with no hidden charges, subscriptions, or download limits. Just paste and download." },
    { q:"Does stucon store my downloaded videos?", a:"Never. stucon uses streaming delivery — files go directly from the source to your browser and are deleted from our temporary buffer the moment the transfer is complete. Zero server storage." },
    { q:"What video qualities are supported?", a:"stucon supports up to 8K (7680×4320) for compatible sources, all the way down to 144p. For audio, bitrates range from 64 kbps to 320 kbps lossless." },
    { q:"Can I download entire playlists?", a:"Yes! Paste a YouTube playlist URL, click Fetch, then select individual videos or hit 'Select All' to queue them for sequential download." },
    { q:"Which output formats does stucon support?", a:"Video: MP4, WebM. Audio: MP3, WAV, Opus, OGG. You can also download video thumbnails as JPEG, and embed subtitles directly into MP4 files." },
    { q:"Is downloading videos legal?", a:"Downloading content for personal use may be legal in some jurisdictions. Always check the platform's terms of service and respect copyright law. stucon is a tool — use it responsibly and ethically." },
  ];
  return (
    <div style={{ marginTop:44 }}>
      <div style={{ fontSize:22, fontWeight:900, color:"#111827", marginBottom:4, letterSpacing:"-0.3px" }}>Frequently Asked Questions</div>
      <div style={{ fontSize:13, color:"#6b7280", marginBottom:20 }}>Everything you need to know about stucon</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ background:"#fff", border:`1.5px solid ${open===i?"#bfdbfe":"#e5e7eb"}`, borderRadius:12, overflow:"hidden", transition:"border-color 0.2s" }}>
            <button onClick={()=>setOpen(open===i?null:i)} style={{ width:"100%", background:"none", border:"none", padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
              <span style={{ fontSize:14, fontWeight:700, color:"#111827" }}>{item.q}</span>
              <span style={{ fontSize:20, color:"#2563eb", transform:open===i?"rotate(45deg)":"none", transition:"transform 0.2s", lineHeight:1, flexShrink:0, marginLeft:12 }}>+</span>
            </button>
            {open===i&&<div style={{ padding:"0 18px 14px", fontSize:13, color:"#6b7280", lineHeight:1.7 }}>{item.a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBadges() {
  const items=[
    { icon:"🔒", title:"Zero Data Storage", desc:"Files stream directly to you. We never save anything on our servers." },
    { icon:"⚡", title:"Lightning Fast", desc:"Direct streaming with 256KB chunks for maximum download speed." },
    { icon:"🌍", title:"1700+ Platforms", desc:"YouTube, TikTok, Instagram, Vimeo, and 1700+ more sites." },
    { icon:"🆓", title:"Always Free", desc:"No subscriptions, no account needed, no download limits ever." },
  ];
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginTop:44, background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:20, padding:28, boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
      {items.map((b,i)=>(
        <div key={i} style={{ textAlign:"center", padding:"8px 4px" }}>
          <div style={{ fontSize:34, marginBottom:10 }}>{b.icon}</div>
          <div style={{ fontSize:13, fontWeight:800, color:"#111827", marginBottom:5 }}>{b.title}</div>
          <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.6 }}>{b.desc}</div>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [url,setUrl]=useState("");
  const [info,setInfo]=useState(null);
  const [loading,setLoading]=useState(false);
  const [fileType,setFileType]=useState("mp4");
  const [quality,setQuality]=useState("1080");
  const [downloading,setDownloading]=useState(false);
  const [progress,setProgress]=useState(null);
  const [queue,setQueue]=useState([]);
  const [activeTab,setActiveTab]=useState("download");
  const [subtitles,setSubtitles]=useState(null);
  const [subLang,setSubLang]=useState("");
  const [embedSubs,setEmbedSubs]=useState(false);
  const [speedLimit,setSpeedLimit]=useState("");
  const [proxy,setProxy]=useState("");
  const [showAdvanced,setShowAdvanced]=useState(false);
  const [supportedSites,setSupportedSites]=useState(null);
  const [siteSearch,setSiteSearch]=useState("");
  const [selectedPlaylistItems,setSelectedPlaylistItems]=useState([]);
  const { toasts,add:addToast }=useToast();
  const evtRef=useRef(null);

  const isAudio=AUDIO_FORMATS.includes(fileType);
  const qualities=isAudio?AUDIO_QUALITIES:VIDEO_QUALITIES;

  useEffect(()=>{ setQuality(isAudio?"320":"1080"); },[isAudio]);

  async function loadSites() {
    if(supportedSites){ setActiveTab("sites"); return; }
    try {
      const r=await fetch(`${API}/supported-sites`);
      const d=await r.json();
      setSupportedSites(d); setActiveTab("sites");
    } catch { addToast("Failed to load supported sites","error"); }
  }

  async function fetchInfo() {
    if(!url.trim()){ addToast("Please enter a URL","error"); return; }
    setLoading(true); setInfo(null); setSubtitles(null);
    try {
      const r=await fetch(`${API}/info`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url:url.trim()}) });
      const d=await r.json();
      if(d.error) throw new Error(d.error);
      setInfo(d);
      if(d.formats?.length>0&&!isAudio) setQuality(String(d.formats[0].height));
      addToast("Info loaded ✓","success");
    } catch(e){ addToast(e.message,"error"); }
    finally { setLoading(false); }
  }

  async function fetchSubtitles() {
    if(!url.trim()){ addToast("Enter a URL first","error"); return; }
    try {
      const r=await fetch(`${API}/subtitles`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url:url.trim()}) });
      const d=await r.json();
      if(d.error) throw new Error(d.error);
      setSubtitles(d); setActiveTab("subtitles");
      addToast("Subtitles fetched ✓","success");
    } catch(e){ addToast(e.message,"error"); }
  }

  function startProgressSSE(jobId,queueId) {
    if(evtRef.current) evtRef.current.close();
    const es=new EventSource(`${API}/progress/${jobId}`);
    evtRef.current=es;
    es.onmessage=(e)=>{
      const data=JSON.parse(e.data);
      setProgress(data);
      setQueue(q=>q.map(item=>item.id===queueId?{...item,status:data.status,progress:data}:item));
      if(data.status==="done"||data.status==="error"){ es.close(); setProgress(null); }
    };
    es.onerror=()=>es.close();
  }

  async function downloadFile(targetUrl=null,overrideTitle=null) {
    const dlUrl=targetUrl||url.trim();
    if(!dlUrl){ addToast("Please enter a URL","error"); return; }
    setDownloading(true);
    const jobId=crypto.randomUUID();
    const queueId=crypto.randomUUID();
    const queueItem={ id:queueId, jobId, url:dlUrl, title:overrideTitle||info?.title||dlUrl, format:fileType, quality, status:"pending", progress:null, error:null };
    setQueue(q=>[queueItem,...q]);
    setTimeout(()=>startProgressSSE(jobId,queueId),500);
    setQueue(q=>q.map(i=>i.id===queueId?{...i,status:"downloading"}:i));
    try {
      const body={ url:dlUrl, type:fileType, quality, job_id:jobId, ...(subLang&&{subtitle_lang:subLang}), embed_subs:embedSubs, ...(speedLimit&&{speed_limit:speedLimit}), ...(proxy&&{proxy}) };
      const r=await fetch(`${API}/download`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      if(!r.ok){ const err=await r.json(); throw new Error(err.error||"Download failed"); }
      const blob=await r.blob();
      const disposition=r.headers.get("Content-Disposition")||"";
      const nameMatch=disposition.match(/filename="([^"]+)"/);
      const fileName=nameMatch?nameMatch[1]:`download.${fileType}`;
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob); a.download=fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      setQueue(q=>q.map(i=>i.id===queueId?{...i,status:"done"}:i));
      addToast(`✅ Downloaded: ${fileName}`,"success");
    } catch(e){
      setQueue(q=>q.map(i=>i.id===queueId?{...i,status:"error",error:e.message}:i));
      addToast(e.message,"error");
    } finally { setDownloading(false); }
  }

  async function downloadThumbnail() {
    if(!url.trim()){ addToast("Enter a URL first","error"); return; }
    try {
      const r=await fetch(`${API}/thumbnail`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({url:url.trim()}) });
      if(!r.ok) throw new Error("Failed");
      const blob=await r.blob();
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob); a.download="thumbnail.jpg";
      a.click(); URL.revokeObjectURL(a.href);
      addToast("Thumbnail downloaded ✓","success");
    } catch(e){ addToast(e.message,"error"); }
  }

  async function downloadPlaylistSelected() {
    for(const entry of selectedPlaylistItems){
      await downloadFile(entry.url,entry.title);
      await new Promise(r=>setTimeout(r,1000));
    }
  }

  const filteredSites=supportedSites?.sites.filter(s=>s.toLowerCase().includes(siteSearch.toLowerCase()));

  const btn=(bg="#2563eb",outline=false)=>({
    background:outline?"transparent":bg, border:outline?`1.5px solid ${bg}`:"none",
    borderRadius:10, color:outline?bg:"#fff", fontSize:13, fontWeight:700,
    padding:"10px 18px", cursor:"pointer", display:"flex", alignItems:"center", gap:6,
    whiteSpace:"nowrap", transition:"all 0.18s", boxShadow:outline?"none":`0 2px 10px ${bg}44`,
    fontFamily:"inherit",
  });
  const fmtBtn=(active)=>({
    padding:"8px 6px", borderRadius:8,
    border:`1.5px solid ${active?"#2563eb":"#e5e7eb"}`,
    background:active?"#eff6ff":"#f9fafb",
    color:active?"#1d4ed8":"#6b7280",
    fontSize:12, fontWeight:active?800:600, cursor:"pointer", textAlign:"center",
    transition:"all 0.15s", fontFamily:"inherit",
  });
  const tabStyle=(active)=>({
    flex:1, padding:"9px 4px", borderRadius:9, border:"none",
    background:active?"#2563eb":"transparent",
    color:active?"#fff":"#6b7280", fontSize:12, fontWeight:active?800:600,
    cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center",
    justifyContent:"center", gap:5, fontFamily:"inherit",
  });
  const inp={
    background:"#f8faff", border:"1.5px solid #dbeafe", borderRadius:10,
    padding:"12px 16px", color:"#111827", fontSize:14, outline:"none",
    transition:"border-color 0.2s", fontFamily:"inherit", width:"100%", boxSizing:"border-box",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f8faff", color:"#111827", fontFamily:"'Plus Jakarta Sans','DM Sans',system-ui,sans-serif" }}>

      {/* Toasts */}
      <div style={{ position:"fixed", top:16, right:16, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
        {toasts.map(t=>(
          <div key={t.id} style={{
            background:t.type==="error"?"#fef2f2":t.type==="success"?"#f0fdf4":"#eff6ff",
            border:`1.5px solid ${t.type==="error"?"#fca5a5":t.type==="success"?"#86efac":"#bfdbfe"}`,
            color:t.type==="error"?"#991b1b":t.type==="success"?"#166534":"#1e40af",
            padding:"10px 16px", borderRadius:10, fontSize:13, fontWeight:700,
            maxWidth:320, boxShadow:"0 4px 12px rgba(0,0,0,0.1)", animation:"slideIn 0.3s ease",
          }}>{t.msg}</div>
        ))}
      </div>

      {/* ══════ HEADER ══════ */}
      <header style={{ background:"#fff", borderBottom:"1.5px solid #e5e7eb", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", height:64 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:36 }}>
            <div style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px #2563eb44" }}>
              <Icon d={Icons.zap} size={19} stroke="#fff" fill="#fff" />
            </div>
            <div>
              <div style={{ fontSize:21, fontWeight:900, color:"#111827", letterSpacing:"-0.6px", lineHeight:1 }}>
                stu<span style={{ color:"#2563eb" }}>con</span>
              </div>
              <div style={{ fontSize:9, color:"#9ca3af", fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>Media Downloader</div>
            </div>
          </div>
          <nav style={{ display:"flex", gap:2, flex:1 }}>
            {[["Home","#"],["Downloader","#"],["Blog","#"],["Supported Sites","#"],["API Docs","#"],["About","#"]].map(([label,href])=>(
              <a key={label} href={href} style={{
                padding:"6px 13px", borderRadius:8, fontSize:13, fontWeight:600,
                color:label==="Downloader"?"#2563eb":"#6b7280",
                background:label==="Downloader"?"#eff6ff":"transparent",
                textDecoration:"none", transition:"all 0.15s",
              }}
                onMouseEnter={e=>{ if(label!=="Downloader"){ e.currentTarget.style.color="#111827"; e.currentTarget.style.background="#f3f4f6"; } }}
                onMouseLeave={e=>{ if(label!=="Downloader"){ e.currentTarget.style.color="#6b7280"; e.currentTarget.style.background="transparent"; } }}
              >{label}</a>
            ))}
          </nav>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:20, padding:"4px 12px", display:"flex", alignItems:"center", gap:6, fontSize:11, color:"#166534", fontWeight:700 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", animation:"pulse 2s infinite" }} />
              API Online
            </div>
            <button style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:9, padding:"8px 18px", color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 2px 8px #2563eb44", fontFamily:"inherit" }}>
              Get API Key
            </button>
          </div>
        </div>
      </header>

      {/* ══════ HERO ══════ */}
      <div style={{ background:"linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 45%,#2563eb 70%,#3b82f6 100%)", padding:"52px 24px 44px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.06, backgroundImage:"radial-gradient(circle at 20% 50%,#fff 1px,transparent 1px),radial-gradient(circle at 80% 50%,#fff 1px,transparent 1px)", backgroundSize:"38px 38px" }} />
        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:20, padding:"5px 14px", fontSize:11, color:"#bfdbfe", fontWeight:700, marginBottom:18, backdropFilter:"blur(10px)" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e" }} />
            1700+ Sites · Zero Storage · Always Free · 4K Support
          </div>
          <h1 style={{ fontSize:42, fontWeight:900, color:"#fff", letterSpacing:"-1.5px", lineHeight:1.1, marginBottom:14, margin:"0 0 14px" }}>
            Download Any Video or Audio<br />
            <span style={{ color:"#93c5fd" }}>from Anywhere on the Internet</span>
          </h1>
          <p style={{ fontSize:15, color:"#bfdbfe", maxWidth:560, margin:"0 auto 28px", lineHeight:1.65 }}>
            stucon is a powerful, privacy-first media downloader. Paste a URL, choose your quality, and get your file instantly — YouTube, TikTok, Instagram, Twitter/X, and 1700+ more platforms.
          </p>
          <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
            {["🎬 MP4 · WebM","🎵 MP3 · WAV · OGG · Opus","📋 Full Playlist Support","🔒 No Data Stored","📺 Up to 4K · 8K","⚡ Real-time Progress"].map((f,i)=>(
              <span key={i} style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:20, padding:"5px 13px", fontSize:12, color:"#e0f2fe", fontWeight:600 }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ MAIN LAYOUT ══════ */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"32px 24px" }}>
        <StatsBar />

        <div style={{ display:"grid", gridTemplateColumns:"260px 1fr 260px", gap:24 }}>

          {/* LEFT SIDEBAR */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <AiNewsSidebar />
            <div style={{ background:"linear-gradient(135deg,#eff6ff,#f0fdf4)", border:"1.5px solid #bfdbfe", borderRadius:16, padding:18 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#1e3a8a", marginBottom:12 }}>💡 Power User Tips</div>
              {["Paste playlist URLs to batch-download entire channels","Use WAV format for lossless audio editing in DAWs","Set speed limit on shared networks to avoid throttling","Fetch subtitles first to see all available languages","WebM often has smaller file sizes than MP4 at same quality","Use proxy option to bypass regional restrictions"].map((tip,i)=>(
                <div key={i} style={{ display:"flex", gap:8, marginBottom:9, alignItems:"flex-start" }}>
                  <span style={{ color:"#2563eb", fontWeight:900, fontSize:14, lineHeight:1.3, flexShrink:0 }}>→</span>
                  <span style={{ fontSize:11, color:"#374151", lineHeight:1.55 }}>{tip}</span>
                </div>
              ))}
            </div>
            {/* Supported formats quick ref */}
            <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:18 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#111827", marginBottom:12 }}>🎯 Supported Formats</div>
              {[
                { label:"Video", items:["MP4 (H.264/H.265)","WebM (VP9)","4K · 1080p · 720p"], color:"#3b82f6" },
                { label:"Audio", items:["MP3 (up to 320kbps)","WAV (lossless)","Opus · OGG"], color:"#10b981" },
                { label:"Extras", items:["JPEG Thumbnails","SRT/VTT Subtitles","Embedded Subs"], color:"#f59e0b" },
              ].map(g=>(
                <div key={g.label} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, color:g.color, fontWeight:800, textTransform:"uppercase", letterSpacing:1, marginBottom:5 }}>{g.label}</div>
                  {g.items.map(item=>(
                    <div key={item} style={{ fontSize:11, color:"#6b7280", marginBottom:3, display:"flex", gap:6, alignItems:"center" }}>
                      <div style={{ width:4, height:4, borderRadius:"50%", background:g.color, flexShrink:0 }} />
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* CENTER DOWNLOADER */}
          <div>
            {/* URL Box */}
            <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:24, boxShadow:"0 4px 20px rgba(37,99,235,0.06)" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#111827", marginBottom:4 }}>🔗 Enter Media URL</div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:14 }}>Supports YouTube, TikTok, Instagram, Twitter/X, Vimeo and 1700+ more platforms</div>
              <div style={{ display:"flex", gap:8 }}>
                <input
                  style={{ ...inp, flex:1, width:"auto" }}
                  placeholder="https://youtube.com/watch?v=... or any video URL"
                  value={url}
                  onChange={e=>setUrl(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&fetchInfo()}
                  onFocus={e=>e.target.style.borderColor="#2563eb"}
                  onBlur={e=>e.target.style.borderColor="#dbeafe"}
                />
                <button style={btn()} onClick={fetchInfo} disabled={loading}>
                  <Icon d={Icons.search} size={16} />
                  {loading?"Fetching...":"Fetch Info"}
                </button>
              </div>
            </div>

            <VideoCard info={info} />

            {/* Tabs */}
            <div style={{ display:"flex", gap:2, marginTop:14, background:"#f3f4f6", borderRadius:12, padding:4, border:"1.5px solid #e5e7eb" }}>
              {[["download",Icons.download,"Download"],["queue",Icons.list,`Queue${queue.length?` (${queue.length})`:""}`],["subtitles",Icons.cc,"Subtitles"],["sites",Icons.globe,"Sites"]].map(([id,icon,label])=>(
                <button key={id} style={tabStyle(activeTab===id)} onClick={()=>id==="sites"?loadSites():setActiveTab(id)}>
                  <Icon d={icon} size={13} />{label}
                </button>
              ))}
            </div>

            {/* ─── DOWNLOAD TAB ─── */}
            {activeTab==="download"&&(
              <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:22, marginTop:8, boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>Output Format</div>
                <div style={{ display:"flex", gap:10, marginBottom:20 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:"#6b7280", fontWeight:700, marginBottom:6 }}>🎬 VIDEO</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:6 }}>
                      {VIDEO_FORMATS.map(f=><button key={f} style={fmtBtn(fileType===f)} onClick={()=>setFileType(f)}>{f.toUpperCase()}</button>)}
                    </div>
                  </div>
                  <div style={{ width:1, background:"#f3f4f6" }} />
                  <div style={{ flex:2 }}>
                    <div style={{ fontSize:11, color:"#6b7280", fontWeight:700, marginBottom:6 }}>🎵 AUDIO</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
                      {AUDIO_FORMATS.map(f=><button key={f} style={fmtBtn(fileType===f)} onClick={()=>setFileType(f)}>{f.toUpperCase()}</button>)}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, marginBottom:8, textTransform:"uppercase", letterSpacing:0.5 }}>
                  {isAudio?"Audio Bitrate (kbps)":"Max Resolution"}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:18 }}>
                  {!isAudio&&info?.formats?.length>0
                    ?info.formats.map(f=>(
                      <button key={f.height} style={fmtBtn(quality===String(f.height))} onClick={()=>setQuality(String(f.height))}>
                        {f.label}
                        {f.filesize&&<div style={{ fontSize:9, color:"#9ca3af" }}>{fmtBytes(f.filesize)}</div>}
                      </button>
                    ))
                    :qualities.map(q=><button key={q} style={fmtBtn(quality===q)} onClick={()=>setQuality(q)}>{isAudio?`${q}k`:`${q}p`}</button>)
                  }
                </div>

                <button onClick={()=>setShowAdvanced(!showAdvanced)} style={{ ...btn("#f3f4f6",false), background:"#f3f4f6", color:"#374151", boxShadow:"none", marginBottom:12, fontSize:12, border:"1.5px solid #e5e7eb" }}>
                  <Icon d={Icons.settings} size={14} stroke="#374151" />
                  {showAdvanced?"Hide":"Show"} Advanced Options
                </button>

                {showAdvanced&&(
                  <div style={{ background:"#f8faff", borderRadius:12, padding:16, border:"1.5px solid #dbeafe", marginBottom:14 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>Speed Limit</div>
                        <input style={{ ...inp, padding:"8px 10px", fontSize:12 }} placeholder="e.g. 5M, 500K" value={speedLimit} onChange={e=>setSpeedLimit(e.target.value)} />
                      </div>
                      <div>
                        <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>Proxy</div>
                        <input style={{ ...inp, padding:"8px 10px", fontSize:12 }} placeholder="socks5://... or http://..." value={proxy} onChange={e=>setProxy(e.target.value)} />
                      </div>
                    </div>
                    {!isAudio&&(
                      <div>
                        <div style={{ fontSize:11, color:"#9ca3af", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>Subtitle Language (for embed)</div>
                        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                          <input style={{ ...inp, padding:"8px 10px", fontSize:12, width:110 }} placeholder="en, fr, ja..." value={subLang} onChange={e=>setSubLang(e.target.value)} />
                          <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#6b7280", cursor:"pointer", fontWeight:600 }}>
                            <input type="checkbox" checked={embedSubs} onChange={e=>setEmbedSubs(e.target.checked)} style={{ accentColor:"#2563eb" }} />
                            Embed subtitles into video
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <button style={{ ...btn("#2563eb"), flex:1 }} onClick={()=>downloadFile()} disabled={downloading}>
                    <Icon d={Icons.download} size={16} />
                    {downloading?"Downloading...": `Download ${fileType.toUpperCase()}`}
                  </button>
                  <button style={btn("#059669",true)} onClick={downloadThumbnail}>
                    <Icon d={Icons.image} size={15} stroke="#059669" />Thumbnail
                  </button>
                  <button style={btn("#7c3aed",true)} onClick={fetchSubtitles}>
                    <Icon d={Icons.cc} size={15} stroke="#7c3aed" />Subtitles
                  </button>
                </div>

                {downloading&&progress&&(
                  <div style={{ marginTop:12 }}>
                    {progress.status==="downloading"&&<ProgressBar value={progress.percent} label={`⚡ ${progress.speed} · ETA ${progress.eta}`} />}
                    {progress.status==="processing"&&(
                      <div style={{ fontSize:12, color:"#d97706", marginTop:8, fontWeight:700, background:"#fffbeb", padding:"8px 12px", borderRadius:8, border:"1px solid #fde68a" }}>
                        ⚙️ Processing — merging video + audio / converting format...
                      </div>
                    )}
                  </div>
                )}

                {info?.is_playlist&&info.entries?.length>0&&(
                  <div style={{ marginTop:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:"#111827" }}>📋 Playlist — {info.entries.length} videos</div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button style={{ ...btn("#6b7280",true), fontSize:11, padding:"5px 10px", boxShadow:"none" }} onClick={()=>setSelectedPlaylistItems(info.entries)}>Select All</button>
                        <button style={{ ...btn("#2563eb"), fontSize:11, padding:"5px 10px" }} onClick={downloadPlaylistSelected} disabled={selectedPlaylistItems.length===0||downloading}>
                          Download ({selectedPlaylistItems.length})
                        </button>
                      </div>
                    </div>
                    <div style={{ maxHeight:280, overflowY:"auto", display:"flex", flexDirection:"column", gap:5 }}>
                      {info.entries.map(entry=>{
                        const selected=selectedPlaylistItems.some(x=>x.id===entry.id);
                        return (
                          <div key={entry.id} onClick={()=>setSelectedPlaylistItems(sel=>selected?sel.filter(x=>x.id!==entry.id):[...sel,entry])}
                            style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, cursor:"pointer", background:selected?"#eff6ff":"#f9fafb", border:`1.5px solid ${selected?"#93c5fd":"#e5e7eb"}`, transition:"all 0.15s" }}>
                            {entry.thumbnail&&<img src={entry.thumbnail} style={{ width:48, height:27, objectFit:"cover", borderRadius:4 }} alt="" />}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, color:"#111827", fontWeight:600, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{entry.title}</div>
                              <div style={{ fontSize:10, color:"#9ca3af" }}>{fmtDuration(entry.duration)}</div>
                            </div>
                            <div style={{ width:18, height:18, borderRadius:"50%", flexShrink:0, border:`2px solid ${selected?"#2563eb":"#d1d5db"}`, background:selected?"#2563eb":"transparent", display:"flex", alignItems:"center", justifyContent:"center" }}>
                              {selected&&<Icon d={Icons.check} size={10} stroke="#fff" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ─── QUEUE TAB ─── */}
            {activeTab==="queue"&&(
              <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20, marginTop:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"#111827" }}>Download Queue</div>
                  {queue.length>0&&(
                    <button style={{ ...btn("#6b7280",true), fontSize:11, padding:"4px 10px", boxShadow:"none" }}
                      onClick={()=>setQueue(q=>q.filter(i=>i.status==="downloading"||i.status==="pending"))}>
                      <Icon d={Icons.trash} size={12} stroke="#6b7280" /> Clear Done
                    </button>
                  )}
                </div>
                {queue.length===0
                  ?<div style={{ textAlign:"center", color:"#9ca3af", padding:"40px 0", fontSize:13 }}>No downloads yet.<br />Start a download to see progress here.</div>
                  :<div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {queue.map(item=><QueueItem key={item.id} item={item} onRemove={id=>setQueue(q=>q.filter(i=>i.id!==id))} />)}
                  </div>
                }
              </div>
            )}

            {/* ─── SUBTITLES TAB ─── */}
            {activeTab==="subtitles"&&(
              <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20, marginTop:8 }}>
                <div style={{ fontSize:13, fontWeight:800, color:"#111827", marginBottom:12 }}>Available Subtitles</div>
                {!subtitles
                  ?<div style={{ textAlign:"center", color:"#9ca3af", padding:"40px 0", fontSize:13 }}>Enter a URL above and click <strong>"Subtitles"</strong> to fetch available languages.</div>
                  :<>
                    {subtitles.manual?.length>0&&(
                      <div style={{ marginBottom:16 }}>
                        <div style={{ fontSize:12, color:"#166534", fontWeight:800, marginBottom:8, background:"#f0fdf4", padding:"6px 10px", borderRadius:7, display:"inline-block" }}>
                          ✅ Manual Subtitles ({subtitles.manual.length})
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                          {subtitles.manual.map(lang=>(
                            <button key={lang} style={fmtBtn(subLang===lang)} onClick={()=>{ setSubLang(lang); setActiveTab("download"); addToast(`Language set to "${lang}"`,"success"); }}>{lang}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {subtitles.automatic?.length>0&&(
                      <div>
                        <div style={{ fontSize:12, color:"#92400e", fontWeight:800, marginBottom:8, background:"#fffbeb", padding:"6px 10px", borderRadius:7, display:"inline-block" }}>
                          🤖 Auto-generated ({subtitles.automatic.length})
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                          {subtitles.automatic.map(lang=>(
                            <button key={lang} style={fmtBtn(subLang===lang)} onClick={()=>{ setSubLang(lang); setActiveTab("download"); addToast(`Auto subtitle set: "${lang}"`,"success"); }}>{lang}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {subtitles.manual?.length===0&&subtitles.automatic?.length===0&&<div style={{ color:"#6b7280", fontSize:13 }}>No subtitles available for this video.</div>}
                  </>
                }
              </div>
            )}

            {/* ─── SITES TAB ─── */}
            {activeTab==="sites"&&(
              <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:20, marginTop:8 }}>
                <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"center" }}>
                  <input style={{ ...inp, flex:1, width:"auto", padding:"8px 12px", fontSize:13 }} placeholder="Search 1700+ supported sites..." value={siteSearch} onChange={e=>setSiteSearch(e.target.value)} />
                  {supportedSites&&<div style={{ fontSize:12, color:"#6b7280", fontWeight:700, whiteSpace:"nowrap" }}>{filteredSites?.length}/{supportedSites.count}</div>}
                </div>
                {!supportedSites
                  ?<div style={{ textAlign:"center", color:"#9ca3af", padding:"40px 0" }}>Loading sites...</div>
                  :<div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))", gap:6, maxHeight:400, overflowY:"auto" }}>
                    {filteredSites?.map(site=>(
                      <div key={site} style={{ background:"#f8faff", borderRadius:7, padding:"6px 10px", fontSize:11, color:"#374151", border:"1.5px solid #e5e7eb", fontWeight:600, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis", cursor:"pointer", transition:"all 0.15s" }}
                        onMouseEnter={e=>{ e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.borderColor="#bfdbfe"; e.currentTarget.style.color="#1d4ed8"; }}
                        onMouseLeave={e=>{ e.currentTarget.style.background="#f8faff"; e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#374151"; }}>
                        {site}
                      </div>
                    ))}
                  </div>
                }
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <BlogSidebar />
            <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#111827", marginBottom:12 }}>📢 Share stucon</div>
              {[
                { label:"Share on Twitter/X", color:"#1d9bf0", icon:Icons.twitter },
                { label:"Share on Facebook", color:"#1877f2", icon:Icons.globe },
                { label:"Copy Link", color:"#6b7280", icon:Icons.external },
              ].map((s,i)=>(
                <button key={i} style={{ width:"100%", background:`${s.color}0d`, border:`1.5px solid ${s.color}22`, borderRadius:8, padding:"8px 12px", color:s.color, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, marginBottom:6, fontFamily:"inherit" }}>
                  <Icon d={s.icon} size={14} stroke={s.color} />{s.label}
                </button>
              ))}
            </div>
            <div style={{ background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)", borderRadius:16, padding:18 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#fff", marginBottom:4 }}>📬 Stay Updated</div>
              <div style={{ fontSize:11, color:"#bfdbfe", marginBottom:12, lineHeight:1.55 }}>Get weekly AI news, downloader tips, and platform updates in your inbox.</div>
              <input style={{ width:"100%", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12, outline:"none", fontFamily:"inherit", boxSizing:"border-box", marginBottom:8 }} placeholder="your@email.com" />
              <button style={{ width:"100%", background:"#fff", border:"none", borderRadius:8, padding:"8px 0", fontSize:12, color:"#1d4ed8", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>Subscribe Free →</button>
            </div>
            {/* Quick site links */}
            <div style={{ background:"#fff", border:"1.5px solid #e5e7eb", borderRadius:16, padding:18 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#111827", marginBottom:12 }}>⚡ Popular Platforms</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {["YouTube","TikTok","Instagram","Twitter/X","Vimeo","Twitch","Facebook","Reddit","SoundCloud","Spotify"].map(p=>(
                  <button key={p} onClick={()=>{ addToast(`Tip: Paste a ${p} URL above to download!`,"info"); }} style={{ background:"#f3f4f6", border:"1.5px solid #e5e7eb", borderRadius:20, padding:"4px 10px", fontSize:11, color:"#374151", fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.borderColor="#bfdbfe"; e.currentTarget.style.color="#2563eb"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="#f3f4f6"; e.currentTarget.style.borderColor="#e5e7eb"; e.currentTarget.style.color="#374151"; }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <PlatformMarquee />
        <HowItWorks />
        <BlogGrid />
        <FAQ />
        <TrustBadges />
      </div>

      {/* ══════ FOOTER ══════ */}
      <footer style={{ background:"#111827", borderTop:"1.5px solid #1f2937", marginTop:60, padding:"52px 24px 32px" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:40, marginBottom:44 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", borderRadius:10, width:38, height:38, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Icon d={Icons.zap} size={19} stroke="#fff" fill="#fff" />
                </div>
                <div style={{ fontSize:21, fontWeight:900, color:"#fff", letterSpacing:"-0.6px" }}>
                  stu<span style={{ color:"#60a5fa" }}>con</span>
                </div>
              </div>
              <div style={{ fontSize:13, color:"#9ca3af", lineHeight:1.7, maxWidth:290, marginBottom:16 }}>
                stucon is a free, privacy-first media downloader supporting 1700+ platforms worldwide. Download video and audio in any format without storing a single byte on our servers.
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {[Icons.twitter,Icons.youtube,Icons.rss,Icons.mail].map((icon,i)=>(
                  <button key={i} style={{ background:"#1f2937", border:"1px solid #374151", borderRadius:8, width:34, height:34, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s" }}
                    onMouseEnter={e=>{ e.currentTarget.style.background="#2563eb"; e.currentTarget.style.borderColor="#2563eb"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background="#1f2937"; e.currentTarget.style.borderColor="#374151"; }}>
                    <Icon d={icon} size={14} stroke="#9ca3af" />
                  </button>
                ))}
              </div>
            </div>
            {[
              { title:"Product", links:["Downloader","Batch Download","API Access","Chrome Extension","Browser Bookmarklet"] },
              { title:"Resources", links:["Documentation","Supported Sites","Changelog","Status Page","Open Source"] },
              { title:"Company", links:["About stucon","Blog","Privacy Policy","Terms of Service","Contact Us"] },
            ].map(col=>(
              <div key={col.title}>
                <div style={{ fontSize:11, fontWeight:800, color:"#fff", marginBottom:14, textTransform:"uppercase", letterSpacing:1.5 }}>{col.title}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  {col.links.map(link=>(
                    <a key={link} href="#" style={{ fontSize:13, color:"#9ca3af", textDecoration:"none", fontWeight:500, transition:"color 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.color="#60a5fa"}
                      onMouseLeave={e=>e.currentTarget.style.color="#9ca3af"}>{link}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:"1px solid #1f2937", paddingTop:24, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
            <div style={{ fontSize:12, color:"#4b5563" }}>© 2025 stucon. Built with yt-dlp &amp; FFmpeg · All rights reserved.</div>
            <div style={{ display:"flex", gap:16, alignItems:"center" }}>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#22c55e", animation:"pulse 2s infinite" }} />
                <span style={{ fontSize:11, color:"#6b7280", fontWeight:600 }}>All systems operational</span>
              </div>
              <span style={{ fontSize:11, color:"#4b5563" }}>Powered by yt-dlp &amp; FFmpeg</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}
        body{margin:0;background:#f8faff;}
        input::placeholder{color:#9ca3af;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:999px;}
        ::-webkit-scrollbar-thumb:hover{background:#9ca3af;}
        @keyframes slideIn{from{transform:translateX(20px);opacity:0;}to{transform:translateX(0);opacity:1;}}
        @keyframes marquee{from{transform:translateX(0);}to{transform:translateX(-50%);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
      `}</style>
    </div>
  );
}
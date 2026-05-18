import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "mentekun-v1";
const CATEGORIES = {
  car:       { label: "クルマ",   icon: "🚗", color: "#FF6B35", bg: "#FF6B3515" },
  home:      { label: "住まい",   icon: "🏠", color: "#4A9EFF", bg: "#4A9EFF15" },
  appliance: { label: "家電",     icon: "🔧", color: "#2ECC71", bg: "#2ECC7115" },
  health:    { label: "健康",     icon: "💊", color: "#A855F7", bg: "#A855F715" },
  custom:    { label: "その他",   icon: "📌", color: "#F59E0B", bg: "#F59E0B15" },
};
const PRESETS = [
  { name: "車検", category: "car", intervalDays: 730, icon: "🚗" },
  { name: "エンジンオイル", category: "car", intervalDays: 90, icon: "🛢️" },
  { name: "タイヤ交換", category: "car", intervalDays: 180, icon: "⚙️" },
  { name: "洗車", category: "car", intervalDays: 30, icon: "🫧" },
  { name: "エアコンフィルター", category: "appliance", intervalDays: 365, icon: "❄️" },
  { name: "洗濯槽クリーニング", category: "appliance", intervalDays: 90, icon: "🌀" },
  { name: "冷蔵庫掃除", category: "appliance", intervalDays: 90, icon: "🧊" },
  { name: "給湯器点検", category: "home", intervalDays: 365, icon: "🔥" },
  { name: "換気扇掃除", category: "home", intervalDays: 90, icon: "💨" },
  { name: "火災報知機", category: "home", intervalDays: 180, icon: "🔔" },
  { name: "歯科検診", category: "health", intervalDays: 180, icon: "🦷" },
  { name: "目の検診", category: "health", intervalDays: 365, icon: "👁️" },
];
const DEFAULT_ITEMS = [
  { id: 1, name: "車検", category: "car", icon: "🚗", intervalDays: 730, nextDate: "2025-11-15", note: "トヨタディーラー", history: [] },
  { id: 2, name: "エンジンオイル交換", category: "car", icon: "🛢️", intervalDays: 90, nextDate: "2026-06-01", note: "", history: [] },
  { id: 3, name: "エアコンフィルター", category: "appliance", icon: "❄️", intervalDays: 365, nextDate: "2026-05-20", note: "リビングと寝室", history: [] },
  { id: 4, name: "換気扇掃除", category: "home", icon: "💨", intervalDays: 90, nextDate: "2026-07-01", note: "", history: [] },
  { id: 5, name: "歯科検診", category: "health", icon: "🦷", intervalDays: 180, nextDate: "2026-08-10", note: "○○歯科", history: [] },
];

function getDays(d) {
  if (!d) return null;
  const t = new Date(); t.setHours(0,0,0,0);
  return Math.ceil((new Date(d) - t) / 86400000);
}
function fmt(d) {
  if (!d) return "未設定";
  const x = new Date(d);
  return x.getFullYear() + "/" + String(x.getMonth()+1).padStart(2,"0") + "/" + String(x.getDate()).padStart(2,"0");
}
function addDays(n) {
  const d = new Date(); d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
}
function urg(days) {
  if (days === null) return { color: "#94A3B8", label: "未設定", ring: "#94A3B820" };
  if (days < 0) return { color: "#EF4444", label: Math.abs(days)+"日超過", ring: "#EF444430" };
  if (days === 0) return { color: "#EF4444", label: "今日！", ring: "#EF444430" };
  if (days <= 7) return { color: "#F97316", label: "あと"+days+"日", ring: "#F9731625" };
  if (days <= 30) return { color: "#EAB308", label: "あと"+days+"日", ring: "#EAB30820" };
  return { color: "#22C55E", label: "あと"+days+"日", ring: "#22C55E15" };
}
function load() {
  try { const v = localStorage.getItem(STORAGE_KEY); return v ? JSON.parse(v) : null; } catch { return null; }
}
function save(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

function Ring({ days, size }) {
  size = size || 56;
  const r = size/2 - 5;
  const c = 2 * Math.PI * r;
  const pct = days !== null && days >= 0 ? Math.max(0, Math.min(1, days/365)) : 1;
  const col = urg(days).color;
  return (
    <svg width={size} height={size} style={{flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E293B" strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={4}
        strokeDasharray={c} strokeDashoffset={c*(1-pct)} strokeLinecap="round"
        transform={"rotate(-90 "+(size/2)+" "+(size/2)+")"}/>
    </svg>
  );
}

function Toast(props) {
  return (
    <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:"#1E293B",color:"#F1F5F9",padding:"10px 22px",borderRadius:30,fontSize:13,fontWeight:600,border:"1px solid #334155",zIndex:9999,whiteSpace:"nowrap"}}>
      {props.msg}
    </div>
  );
}

function playTap() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 523;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    o.start(); o.stop(ctx.currentTime + 0.08);
  } catch(e) {}
}
function playDone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523,659,784].forEach(function(freq, i) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.start(t); o.stop(t + 0.3);
    });
  } catch(e) {}
}
function playDel() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 196;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    o.start(); o.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

export default function App() {
  const [items, setItems] = useState(null);
  const [view, setView] = useState("home");
  const [selId, setSelId] = useState(null);
  const [cat, setCat] = useState("all");
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState({ name:"", category:"car", icon:"🔧", intervalDays:365, nextDate:"", note:"" });
  const [showPre, setShowPre] = useState(true);

  useEffect(function() {
    var saved = load();
    setItems(saved || DEFAULT_ITEMS);
  }, []);

  useEffect(function() {
    if (items !== null) save(items);
  }, [items]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(function() { setToast(null); }, 2400);
  }

  if (items === null) {
    return (
      <div style={{background:"#020817",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
        <div style={{fontSize:48}}>🔧</div>
        <div style={{color:"#64748B",fontSize:14}}>読み込み中...</div>
      </div>
    );
  }

  var sorted = items.slice().sort(function(a,b) {
    var da = getDays(a.nextDate); if (da === null) da = 9999;
    var db = getDays(b.nextDate); if (db === null) db = 9999;
    return da - db;
  });
  var filtered = cat === "all" ? sorted : sorted.filter(function(i) { return i.category === cat; });
  var urgCount = items.filter(function(i) { var d=getDays(i.nextDate); return d!==null&&d<=30; }).length;
  var sel = items.find(function(i) { return i.id === selId; });

  function doComplete(id) {
    playDone();
    setItems(function(prev) {
      return prev.map(function(item) {
        if (item.id !== id) return item;
        var today = new Date().toISOString().split("T")[0];
        var hist = (item.history || []).concat([today]).slice(-10);
        return Object.assign({}, item, { nextDate: addDays(item.intervalDays), history: hist });
      });
    });
    showToast("🎉 完了！次回日程を更新しました");
  }

  function doDelete(id) {
    playDel();
    setItems(function(prev) { return prev.filter(function(i) { return i.id !== id; }); });
    setView("home");
    showToast("🗑️ 削除しました");
  }

  function doSave() {
    if (!form.name.trim()) return;
    playTap();
    var newItem = Object.assign({}, form, { id: Date.now(), history: [] });
    setItems(function(prev) { return prev.concat([newItem]); });
    setView("home");
    showToast("✅ 追加しました");
  }

  var R = {
    root: { fontFamily:"sans-serif", background:"#020817", minHeight:"100vh", maxWidth:430, margin:"0 auto", color:"#F1F5F9", position:"relative" },
    hdr:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 16px 12px", borderBottom:"1px solid #0F172A" },
    bar:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px 12px", borderBottom:"1px solid #0F172A" },
    card: { background:"#0F172A", borderRadius:14, border:"1px solid #1E293B", cursor:"pointer" },
    box:  { background:"#0F172A", borderRadius:14, border:"1px solid #1E293B", overflow:"hidden", marginBottom:16 },
    inp:  { width:"100%", background:"#0F172A", border:"1px solid #1E293B", borderRadius:10, padding:"12px", color:"#F1F5F9", fontSize:14, outline:"none", boxSizing:"border-box" },
    btn:  { width:"100%", border:"none", borderRadius:14, padding:15, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:10, color:"#fff" },
    fab:  { position:"fixed", bottom:52, right:"calc(50% - 199px)", width:54, height:54, borderRadius:"50%", background:"linear-gradient(135deg,#4A9EFF,#6D5FFA)", color:"#fff", fontSize:26, fontWeight:900, border:"none", cursor:"pointer", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" },
    ad:   { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:"#020817", borderTop:"1px solid #0F172A", padding:"9px 16px", zIndex:100 },
    ibtn: { background:"#0F172A", border:"1px solid #1E293B", borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" },
  };

  if (view === "detail" && sel) {
    var days0 = getDays(sel.nextDate);
    var u0 = urg(days0);
    var c0 = CATEGORIES[sel.category] || CATEGORIES.custom;
    return (
      <div style={R.root}>
        <div style={R.bar}>
          <button style={R.ibtn} onClick={function() { playTap(); setView("home"); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span style={{fontSize:16,fontWeight:700,color:"#F1F5F9"}}>詳細</span>
          <div style={{width:36}}/>
        </div>
        <div style={{padding:"16px 16px 100px",overflowY:"auto"}}>
          <div style={{background:u0.ring,border:"1.5px solid "+u0.color+"30",borderRadius:16,padding:"28px 20px",textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:56,marginBottom:10}}>{sel.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:"#F1F5F9",marginBottom:8}}>{sel.name}</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:u0.color+"20",border:"1px solid "+u0.color,borderRadius:20,padding:"6px 16px",marginBottom:12}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:u0.color,display:"inline-block"}}/>
              <span style={{color:u0.color,fontWeight:700,fontSize:14}}>{u0.label}</span>
            </div>
            <div style={{fontSize:12,color:"#64748B"}}>{c0.icon} {c0.label} ・ {sel.intervalDays}日ごと</div>
          </div>
          <div style={R.box}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px"}}>
              <span style={{fontSize:13,color:"#64748B"}}>次回予定日</span>
              <span style={{fontSize:13,fontWeight:700,color:u0.color}}>{fmt(sel.nextDate)}</span>
            </div>
            <div style={{height:1,background:"#1E293B"}}/>
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px"}}>
              <span style={{fontSize:13,color:"#64748B"}}>インターバル</span>
              <span style={{fontSize:13,fontWeight:700,color:"#CBD5E1"}}>{sel.intervalDays}日</span>
            </div>
            {sel.note ? (
              <div>
                <div style={{height:1,background:"#1E293B"}}/>
                <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px"}}>
                  <span style={{fontSize:13,color:"#64748B"}}>メモ</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#CBD5E1"}}>{sel.note}</span>
                </div>
              </div>
            ) : null}
          </div>
          {sel.history && sel.history.length > 0 ? (
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#475569",fontWeight:700,marginBottom:8}}>📅 完了履歴</div>
              <div style={R.box}>
                {sel.history.slice().reverse().map(function(d,i) {
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",fontSize:13}}>
                      <span style={{color:"#94A3B8"}}>✅ 完了</span>
                      <span style={{color:"#CBD5E1"}}>{fmt(d)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <button style={Object.assign({},R.btn,{background:"linear-gradient(135deg,"+u0.color+","+u0.color+"99)"})}
            onClick={function() { doComplete(sel.id); setView("home"); }}>
            ✅ 完了して次回日程を更新
          </button>
          <button style={{width:"100%",background:"transparent",color:"#EF4444",border:"1px solid #EF444430",borderRadius:14,padding:13,fontSize:14,fontWeight:700,cursor:"pointer"}}
            onClick={function() { doDelete(sel.id); }}>
            🗑️ このメンテを削除
          </button>
        </div>
        {toast ? <Toast msg={toast}/> : null}
      </div>
    );
  }

  if (view === "add") {
    return (
      <div style={R.root}>
        <div style={R.bar}>
          <button style={R.ibtn} onClick={function() { playTap(); setView("home"); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span style={{fontSize:16,fontWeight:700,color:"#F1F5F9"}}>メンテを追加</span>
          <div style={{width:36}}/>
        </div>
        <div style={{padding:"8px 16px 100px",overflowY:"auto"}}>
          {showPre ? (
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:"#475569",fontWeight:700,marginBottom:10}}>📋 テンプレート</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {PRESETS.map(function(p,i) {
                  var c = CATEGORIES[p.category];
                  return (
                    <button key={i} onClick={function() {
                      playTap();
                      setForm(function(f) { return Object.assign({},f,p,{nextDate:addDays(p.intervalDays)}); });
                      setShowPre(false);
                    }} style={{background:c.bg,border:"1.5px solid "+c.color+"40",borderRadius:12,padding:"12px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <span style={{fontSize:24}}>{p.icon}</span>
                      <span style={{fontSize:10,color:"#CBD5E1",textAlign:"center",lineHeight:1.3}}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{textAlign:"center",color:"#475569",fontSize:12,margin:"16px 0 4px"}}>または手動で入力</div>
            </div>
          ) : null}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6}}>アイコン</div>
            <input style={Object.assign({},R.inp,{width:60,fontSize:22,textAlign:"center",padding:"8px"})} value={form.icon} onChange={function(e){setForm(function(f){return Object.assign({},f,{icon:e.target.value});});}} maxLength={2}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6}}>名前</div>
            <input style={R.inp} value={form.name} onChange={function(e){setForm(function(f){return Object.assign({},f,{name:e.target.value});});}} placeholder="例：エアコンフィルター交換"/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6}}>カテゴリ</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.entries(CATEGORIES).map(function(entry) {
                var k=entry[0], v=entry[1];
                return (
                  <button key={k} onClick={function(){playTap();setForm(function(f){return Object.assign({},f,{category:k});});}}
                    style={{borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",border:"1.5px solid "+v.color,background:form.category===k?v.color:"transparent",color:form.category===k?"#fff":v.color}}>
                    {v.icon} {v.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6}}>インターバル</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {[{d:30,l:"1ヶ月"},{d:90,l:"3ヶ月"},{d:180,l:"半年"},{d:365,l:"1年"},{d:730,l:"2年"}].map(function(x) {
                return (
                  <button key={x.d} onClick={function(){playTap();setForm(function(f){return Object.assign({},f,{intervalDays:x.d});});}}
                    style={{borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",background:form.intervalDays===x.d?"#4A9EFF":"#1E293B",color:form.intervalDays===x.d?"#fff":"#64748B",border:"1px solid "+(form.intervalDays===x.d?"#4A9EFF":"#334155")}}>
                    {x.l}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6}}>次回予定日</div>
            <input type="date" style={R.inp} value={form.nextDate} onChange={function(e){setForm(function(f){return Object.assign({},f,{nextDate:e.target.value});});}}/>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,marginBottom:6}}>メモ（任意）</div>
            <input style={R.inp} value={form.note} onChange={function(e){setForm(function(f){return Object.assign({},f,{note:e.target.value});});}} placeholder="例：○○ディーラー"/>
          </div>
          <button onClick={doSave} style={Object.assign({},R.btn,{background:"linear-gradient(135deg,#4A9EFF,#6D5FFA)",opacity:form.name.trim()?1:0.4})}>
            ＋ 追加する
          </button>
        </div>
        {toast ? <Toast msg={toast}/> : null}
      </div>
    );
  }

  var over = items.filter(function(i){var d=getDays(i.nextDate);return d!==null&&d<0;});
  var soon = items.filter(function(i){var d=getDays(i.nextDate);return d!==null&&d>=0&&d<=7;});
  var ok   = items.filter(function(i){var d=getDays(i.nextDate);return d!==null&&d>30;});
  var cats = Object.keys(CATEGORIES).map(function(k){return {key:k,count:items.filter(function(i){return i.category===k;}).length};}).filter(function(x){return x.count>0;});

  return (
    <div style={R.root}>
      <div style={R.hdr}>
        <div>
          <div style={{fontSize:22,fontWeight:900,color:"#F1F5F9"}}>🔧 メンテくん</div>
          <div style={{fontSize:11,color:"#475569",marginTop:1}}>定期メンテナンス管理</div>
        </div>
        {urgCount > 0 ? (
          <div style={{background:"#EF444420",border:"1px solid #EF444450",color:"#EF4444",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700}}>
            ⚠️ {urgCount}件
          </div>
        ) : null}
      </div>
      <div style={{display:"flex",margin:"0 16px 12px",background:"#0F172A",borderRadius:12,padding:4}}>
        {[["list","📋 リ

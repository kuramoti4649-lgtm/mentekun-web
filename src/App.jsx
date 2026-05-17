import { useState, useEffect, useCallback } from "react";
import * as Tone from "tone";

let audioReady = false;
async function startAudio() {
  if (!audioReady) { await Tone.start(); audioReady = true; }
}
function playTap() {
  startAudio().then(() => {
    const s = new Tone.Synth({ oscillator:{type:"sine"}, envelope:{attack:0.001,decay:0.06,sustain:0,release:0.04}, volume:-20 }).toDestination();
    s.triggerAttackRelease("C5","32n");
    setTimeout(()=>s.dispose(),400);
  });
}
function playAdd() {
  startAudio().then(() => {
    const s = new Tone.Synth({ oscillator:{type:"sine"}, envelope:{attack:0.005,decay:0.18,sustain:0,release:0.1}, volume:-16 }).toDestination();
    const now = Tone.now();
    s.triggerAttackRelease("E5","16n", now);
    s.triggerAttackRelease("G5","16n", now+0.1);
    setTimeout(()=>s.dispose(),800);
  });
}
function playComplete() {
  startAudio().then(() => {
    const s = new Tone.PolySynth(Tone.Synth, { oscillator:{type:"sine"}, envelope:{attack:0.005,decay:0.35,sustain:0.05,release:0.4}, volume:-14 }).toDestination();
    s.triggerAttackRelease(["C5","E5","G5"],"8n");
    setTimeout(()=>s.dispose(),2000);
  });
}
function playDelete() {
  startAudio().then(() => {
    const s = new Tone.Synth({ oscillator:{type:"triangle"}, envelope:{attack:0.001,decay:0.12,sustain:0,release:0.08}, volume:-20 }).toDestination();
    s.triggerAttackRelease("G3","16n");
    setTimeout(()=>s.dispose(),400);
  });
}

const STORAGE_KEY = "mentekun-items-v2";
const CATEGORIES = {
  car:       { label: "クルマ",   icon: "🚗", color: "#FF6B35", bg: "#FF6B3515" },
  home:      { label: "住まい",   icon: "🏠", color: "#4A9EFF", bg: "#4A9EFF15" },
  appliance: { label: "家電",     icon: "🔧", color: "#2ECC71", bg: "#2ECC7115" },
  health:    { label: "健康",     icon: "💊", color: "#A855F7", bg: "#A855F715" },
  custom:    { label: "その他",   icon: "📌", color: "#F59E0B", bg: "#F59E0B15" },
};
const PRESETS = [
  { name: "車検",               category: "car",       intervalDays: 730, icon: "🚗" },
  { name: "エンジンオイル",     category: "car",       intervalDays: 90,  icon: "🛢️" },
  { name: "タイヤ交換",         category: "car",       intervalDays: 180, icon: "⚙️" },
  { name: "洗車",               category: "car",       intervalDays: 30,  icon: "🫧" },
  { name: "エアコンフィルター", category: "appliance", intervalDays: 365, icon: "❄️" },
  { name: "洗濯槽クリーニング", category: "appliance", intervalDays: 90,  icon: "🌀" },
  { name: "冷蔵庫掃除",         category: "appliance", intervalDays: 90,  icon: "🧊" },
  { name: "給湯器点検",         category: "home",      intervalDays: 365, icon: "🔥" },
  { name: "換気扇掃除",         category: "home",      intervalDays: 90,  icon: "💨" },
  { name: "火災報知機",         category: "home",      intervalDays: 180, icon: "🔔" },
  { name: "歯科検診",           category: "health",    intervalDays: 180, icon: "🦷" },
  { name: "目の検診",           category: "health",    intervalDays: 365, icon: "👁️" },
];
const DEFAULT_ITEMS = [
  { id: 1, name: "車検",               category: "car",       icon: "🚗", intervalDays: 730, nextDate: "2025-11-15", note: "トヨタディーラー", history: [] },
  { id: 2, name: "エンジンオイル交換", category: "car",       icon: "🛢️", intervalDays: 90,  nextDate: "2026-06-01", note: "",               history: [] },
  { id: 3, name: "エアコンフィルター", category: "appliance", icon: "❄️", intervalDays: 365, nextDate: "2026-05-20", note: "リビングと寝室",   history: [] },
  { id: 4, name: "換気扇掃除",         category: "home",      icon: "💨", intervalDays: 90,  nextDate: "2026-07-01", note: "",               history: [] },
  { id: 5, name: "歯科検診",           category: "health",    icon: "🦷", intervalDays: 180, nextDate: "2026-08-10", note: "○○歯科",         history: [] },
];

function getDaysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(dateStr) - today) / 86400000);
}
function fmt(dateStr) {
  if (!dateStr) return "未設定";
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}
function addDays(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function urgencyInfo(days) {
  if (days === null) return { color: "#94A3B8", label: "未設定",           ring: "#94A3B820" };
  if (days < 0)      return { color: "#EF4444", label: `${Math.abs(days)}日超過`, ring: "#EF444430" };
  if (days === 0)    return { color: "#EF4444", label: "今日！",           ring: "#EF444430" };
  if (days <= 7)     return { color: "#F97316", label: `あと${days}日`,   ring: "#F9731625" };
  if (days <= 30)    return { color: "#EAB308", label: `あと${days}日`,   ring: "#EAB30820" };
  return               { color: "#22C55E", label: `あと${days}日`,   ring: "#22C55E15" };
}
async function loadItems() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (r && r.value) return JSON.parse(r.value);
  } catch (_) {}
  return null;
}
async function saveItems(items) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(items)); } catch (_) {}
}
function ProgressRing({ days, size = 56 }) {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  let pct = 1;
  if (days !== null && days >= 0) pct = Math.max(0, Math.min(1, days / 365));
  const { color } = urgencyInfo(days);
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E293B" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:"stroke-dashoffset .6s ease"}} />
    </svg>
  );
}
function Toast({ msg }) {
  return (
    <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:"#1E293B",color:"#F1F5F9",padding:"10px 22px",borderRadius:30,fontSize:13,fontWeight:600,border:"1px solid #334155",zIndex:9999,boxShadow:"0 8px 32px #0008",whiteSpace:"nowrap"}}>
      {msg}
    </div>
  );
}
export default function MenteKun() {
  const [items, setItems]           = useState(null);
  const [view, setView]             = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [filterCat, setFilterCat]   = useState("all");
  const [toast, setToast]           = useState(null);
  const [form, setForm]             = useState({ name:"", category:"car", icon:"🔧", intervalDays:365, nextDate:"", note:"" });
  const [showPresets, setShowPresets] = useState(true);
  const [tab, setTab]               = useState("list");

  useEffect(() => {
    loadItems().then(saved => setItems(saved || DEFAULT_ITEMS));
  }, []);
  useEffect(() => {
    if (items !== null) saveItems(items);
  }, [items]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  if (items === null) return (
    <div style={{...S.root,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
      <div style={{fontSize:48}}>🔧</div>
      <div style={{color:"#64748B",fontSize:14}}>読み込み中...</div>
    </div>
  );

  const sorted   = [...items].sort((a,b)=>(getDaysUntil(a.nextDate)??9999)-(getDaysUntil(b.nextDate)??9999));
  const filtered = filterCat==="all" ? sorted : sorted.filter(i=>i.category===filterCat);
  const urgentCount = items.filter(i=>{const d=getDaysUntil(i.nextDate);return d!==null&&d<=30;}).length;
  const selected = items.find(i=>i.id===selectedId);

  const handleComplete = (id) => {
    playComplete();
    setItems(prev=>prev.map(item=>{
      if(item.id!==id) return item;
      const today=new Date().toISOString().split("T")[0];
      return {...item,nextDate:addDays(item.intervalDays),history:[...(item.history||[]),today].slice(-10)};
    }));
    showToast("🎉 完了！次回日程を更新しました");
  };
  const handleDelete = (id) => {
    playDelete();
    setItems(prev=>prev.filter(i=>i.id!==id));
    setView("home");
    showToast("🗑️ 削除しました");
  };
  const handleSave = () => {
    if(!form.name.trim()) return;
    playAdd();
    setItems(prev=>[...prev,{...form,id:Date.now(),history:[]}]);
    setView("home");
    showToast("✅ 追加しました");
  };
  const handlePreset = (p) => {
    playTap();
    setForm(f=>({...f,...p,nextDate:addDays(p.intervalDays)}));
    setShowPresets(false);
  };

  if (view==="detail" && selected) {
    const days=getDaysUntil(selected.nextDate);
    const {color,label,ring}=urgencyInfo(days);
    const cat=CATEGORIES[selected.category]||CATEGORIES.custom;
    return (
      <div style={S.root}>
        <style>{ANIM}</style>
        <div style={S.topBar}>
          <button style={S.iconBtn} onClick={()=>{playTap();setView("home");}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span style={{fontSize:16,fontWeight:700,color:"#F1F5F9"}}>詳細</span>
          <div style={{width:36}}/>
        </div>
        <div style={{padding:"0 16px 100px",overflowY:"auto"}}>
          <div style={{...S.card,padding:"28px 20px",textAlign:"center",marginBottom:16,background:ring,border:`1.5px solid ${color}30`}}>
            <div style={{fontSize:60,marginBottom:10}}>{selected.icon}</div>
            <div style={{fontSize:22,fontWeight:800,color:"#F1F5F9",marginBottom:8}}>{selected.name}</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:color+"20",border:`1px solid ${color}`,borderRadius:20,padding:"6px 16px",marginBottom:14}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:color,display:"inline-block"}}/>
              <span style={{color,fontWeight:700,fontSize:14}}>{label}</span>
            </div>
            <div style={{fontSize:12,color:"#64748B"}}>{cat.icon} {cat.label} · {selected.intervalDays}日ごと</div>
          </div>
          <div style={S.infoBox}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px"}}>
              <span style={{fontSize:13,color:"#64748B"}}>次回予定日</span>
              <span style={{fontSize:13,fontWeight:700,color}}>{fmt(selected.nextDate)}</span>
            </div>
            <div style={{height:1,background:"#1E293B"}}/>
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px"}}>
              <span style={{fontSize:13,color:"#64748B"}}>インターバル</span>
              <span style={{fontSize:13,fontWeight:700,color:"#CBD5E1"}}>{selected.intervalDays}日</span>
            </div>
            {selected.note&&<><div style={{height:1,background:"#1E293B"}}/><div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px"}}><span style={{fontSize:13,color:"#64748B"}}>メモ</span><span style={{fontSize:13,fontWeight:700,color:"#CBD5E1"}}>{selected.note}</span></div></>}
          </div>
          {selected.history?.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#475569",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>📅 完了履歴</div>
              <div style={S.infoBox}>
                {[...selected.history].reverse().map((d,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",color:"#94A3B8",fontSize:13}}>
                    <span>✅ 完了</span><span style={{color:"#CBD5E1"}}>{fmt(d)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button style={{width:"100%",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:10,color:"#fff",background:`linear-gradient(135deg,${color},${color}99)`}}
            onClick={()=>{handleComplete(selected.id);setView("home");}}>
            ✅ 完了して次回日程を更新
          </button>
          <button style={{width:"100%",background:"transparent",color:"#EF4444",border:"1px solid #EF444430",borderRadius:14,padding:13,fontSize:14,fontWeight:700,cursor:"pointer"}}
            onClick={()=>handleDelete(selected.id)}>
            🗑️ このメンテを削除
          </button>
        </div>
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  if (view==="add") {
    return (
      <div style={S.root}>
        <style>{ANIM}</style>
        <div style={S.topBar}>
          <button style={S.iconBtn} onClick={()=>{playTap();setView("home");}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span style={{fontSize:16,fontWeight:700,color:"#F1F5F9"}}>メンテを追加</span>
          <div style={{width:36}}/>
        </div>
        <div style={{padding:"8px 16px 100px",overflowY:"auto"}}>
          {showPresets&&(
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11,color:"#475569",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>📋 テンプレートから選ぶ</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {PRESETS.map((p,i)=>{
                  const cat=CATEGORIES[p.category];
                  return (
                    <button key={i} onClick={()=>handlePreset(p)}
                      style={{background:cat.bg,border:`1.5px solid ${cat.color}40`,borderRadius:12,padding:"12px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                      <span style={{fontSize:24}}>{p.icon}</span>
                      <span style={{fontSize:10,color:"#CBD5E1",textAlign:"center",lineHeight:1.3}}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{textAlign:"center",color:"#475569",fontSize:12,margin:"16px 0 4px"}}>── または手動で入力 ──</div>
            </div>
          )}
          {[["アイコン","icon",{width:60,fontSize:22,textAlign:"center",padding:"8px"}],["名前 *","name",{}],["メモ（任意）","note",{}]].map(([label,key,extra])=>(
            <div key={key} style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#64748B",fontWeight:700,letterSpacing:.5,marginBottom:7,textTransform:"uppercase"}}>{label}</div>
              <input style={{...S.input,...extra}} placeholder={key==="name"?"例：エアコンフィルター交換":key==="note"?"例：○○ディーラー":""}
                value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} maxLength={key==="icon"?2:undefined}/>
            </div>
          ))}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,letterSpacing:.5,marginBottom:7,textTransform:"uppercase"}}>カテゴリ</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {Object.entries(CATEGORIES).map(([k,v])=>(
                <button key={k} onClick={()=>{playTap();setForm(f=>({...f,category:k}));}}
                  style={{borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",border:`1.5px solid ${v.color}`,background:form.category===k?v.color:"transparent",color:form.category===k?"#fff":v.color}}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,letterSpacing:.5,marginBottom:7,textTransform:"uppercase"}}>インターバル</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              {[{d:30,l:"1ヶ月"},{d:90,l:"3ヶ月"},{d:180,l:"半年"},{d:365,l:"1年"},{d:730,l:"2年"}].map(({d,l})=>(
                <button key={d} onClick={()=>{playTap();setForm(f=>({...f,intervalDays:d}));}}
                  style={{borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer",background:form.intervalDays===d?"#4A9EFF":"#1E293B",color:form.intervalDays===d?"#fff":"#64748B",border:`1px solid ${form.intervalDays===d?"#4A9EFF":"#334155"}`}}>
                  {l}
                </button>
              ))}
            </div>
            <input type="number" style={S.input} placeholder="カスタム日数"
              value={form.intervalDays} onChange={e=>setForm(f=>({...f,intervalDays:Number(e.target.value)}))}/>
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:"#64748B",fontWeight:700,letterSpacing:.5,marginBottom:7,textTransform:"uppercase"}}>次回予定日</div>
            <input type="date" style={S.input} value={form.nextDate} onChange={e=>setForm(f=>({...f,nextDate:e.target.value}))}/>
          </div>
          <button onClick={handleSave} style={{width:"100%",border:"none",borderRadius:14,padding:"15px",fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:10,color:"#fff",background:"linear-gradient(135deg,#4A9EFF,#6D5FFA)",opacity:form.name.trim()?1:0.4}}>
            ＋ 追加する
          </button>
        </div>
        {toast&&<Toast msg={toast}/>}
      </div>
    );
  }

  const overdueItems=items.filter(i=>{const d=getDaysUntil(i.nextDate);return d!==null&&d<0;});
  const soonItems=items.filter(i=>{const d=getDaysUntil(i.nextDate);return d!==null&&d>=0&&d<=7;});
  const okItems=items.filter(i=>{const d=getDaysUntil(i.nextDate);return d!==null&&d>30;});
  const catCounts=Object.keys(CATEGORIES).map(k=>({key:k,count:items.filter(i=>i.category===k).length})).filter(x=>x.count>0);

  return (
    <div style={S.root}>
      <style>{ANIM}</style>
      <div style={S.header}>
        <div>
          <div style={{fontSize:22,fontWeight:900,letterSpacing:"-0.5px",color:"#F1F5F9"}}>🔧 メンテくん</div>
          <div style={{fontSize:11,color:"#475569",marginTop:1}}>定期メンテナンス管理</div>
        </div>
        {urgentCount>0&&(
          <div style={{background:"#EF444420",border:"1px solid #EF444450",color:"#EF4444",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:700}}>
            ⚠️ {urgentCount}件
          </div>
        )}
      </div>
      <div style={{display:"flex",margin:"0 16px 12px",background:"#0F172A",borderRadius:12,padding:4}}>
        {[["list","📋 リスト"],["stats","📊 統計"]].map(([t,l])=>(
          <button key={t} onClick={()=>{playTap();setTab(t);}}
            style={{flex:1,padding:"8px 0",borderRadius:9,border:"none",cursor:"pointer",fontWeight:600,fontSize:13,background:tab===t?"#1E293B":"transparent",color:tab===t?"#F1F5F9":"#475569"}}>
            {l}
          </button>
        ))}
      </div>
      {tab==="stats"&&(
        <div style={{padding:"0 16px 100px",overflowY:"auto"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            {[["登録件数",items.length,"#4A9EFF"],["要対応",overdueItems.length+soonItems.length,"#EF4444"],["今週期限",soonItems.length,"#F97316"],["問題なし",okItems.length,"#22C55E"]].map(([label,value,color])=>(
              <div key={label} style={{background:"#0F172A",border:`1px solid ${color}30`,borderRadius:14,padding:"16px 14px"}}>
                <div style={{fontSize:11,color:"#475569",marginBottom:6}}>{label}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <span style={{fontSize:32,fontWeight:900,color}}>{value}</span>
                  <span style={{fontSize:12,color:"#475569"}}>件</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:"#475569",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>カテゴリ別</div>
          <div style={S.infoBox}>
            {catCounts.map(({key,count})=>{
              const cat=CATEGORIES[key];
              const pct=Math.round(count/items.length*100);
              return (
                <div key={key} style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,color:"#CBD5E1"}}>{cat.icon} {cat.label}</span>
                    <span style={{fontSize:13,fontWeight:700,color:cat.color}}>{count}件</span>
                  </div>
                  <div style={{height:5,background:"#1E293B",borderRadius:99}}>
                    <div style={{height:"100%",width:`${pct}%`,background:cat.color,borderRadius:99}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tab==="list"&&(<>
        <div style={{display:"flex",gap:6,padding:"0 16px 12px",overflowX:"auto",scrollbarWidth:"none"}}>
          {[["all","すべて","#4A9EFF"],...Object.entries(CATEGORIES).filter(([k])=>items.find(i=>i.category===k)).map(([k,v])=>[k,`${v.icon}${v.label}`,v.color])].map(([k,l,c])=>(
            <button key={k} onClick={()=>{playTap();setFilterCat(k);}}
              style={{borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",background:filterCat===k?c:"#0F172A",color:filterCat===k?"#fff":"#64748B",border:`1.5px solid ${filterCat===k?c:"#1E293B"}`,whiteSpace:"nowrap",flexShrink:0}}>
              {l}
            </button>
          ))}
        </div>
        <div style={{padding:"0 16px 120px"}}>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:48}}>🔧</div>
              <div style={{color:"#475569",marginTop:12,fontSize:14}}>まだ登録がありません<br/>＋ボタンから追加しましょう</div>
            </div>
          )}
          {filtered.map(item=>{
            const days=getDaysUntil(item.nextDate);
            const {color,label,ring}=urgencyInfo(days);
            const cat=CATEGORIES[item.category]||CATEGORIES.custom;
            return (
              <button key={item.id} style={{...S.card,display:"flex",alignItems:"center",gap:12,padding:"14px",marginBottom:10,width:"100%",textAlign:"left",borderLeft:`3px solid ${cat.color}`}}
                onClick={()=>{playTap();setSelectedId(item.id);setView("detail");}}>
                <div style={{position:"relative",width:56,height:56,flexShrink:0}}>
                  <ProgressRing days={days} size={56}/>
                  <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{item.icon}</div>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:15,fontWeight:700,color:"#F1F5F9",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                  <div style={{fontSize:11,color:"#475569",marginTop:2}}>{cat.icon} {cat.label} · {fmt(item.nextDate)}</div>
                  {item.note&&<div style={{fontSize:11,color:"#334155",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {item.note}</div>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                  <div style={{fontSize:11,fontWeight:700,color,background:ring,border:`1px solid ${color}40`,borderRadius:20,padding:"3px 10px",whiteSpace:"nowrap"}}>{label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </>)}
      <div style={S.adBanner}>
        <span style={{fontSize:10,color:"#334155",background:"#1E293B",borderRadius:4,padding:"1px 5px",marginRight:8}}>広告</span>
        <span style={{fontSize:11,color:"#475569"}}>AdSense審査通過後に広告が表示されます</span>
      </div>
      <button onClick={()=>{playTap();setForm({name:"",category:"car",icon:"🔧",intervalDays:365,nextDate:"",note:""});setShowPresets(true);setView("add");}} style={S.fab}>＋</button>
      {toast&&<Toast msg={toast}/>}
    </div>
  );
}

function FilterChip({label,active,color,onClick}){return(<button onClick={onClick} style={{borderRadius:20,padding:"6px 12px",fontSize:12,fontWeight:600,cursor:"pointer",background:active?color:"#0F172A",color:active?"#fff":"#64748B",border:`1.5px solid ${active?color:"#1E293B"}`,whiteSpace:"nowrap",flexShrink:0}}>{label}</button>);}
function StatCard({label,value,unit,color}){return(<div style={{background:"#0F172A",border:`1px solid ${color}30`,borderRadius:14,padding:"16px 14px"}}><div style={{fontSize:11,color:"#475569",marginBottom:6}}>{label}</div><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:32,fontWeight:900,color}}>{value}</span><span style={{fontSize:12,color:"#475569"}}>{unit}</span></div></div>);}

const S={
  root:{fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',-apple-system,sans-serif",background:"#020817",minHeight:"100vh",maxWidth:430,margin:"0 auto",color:"#F1F5F9",position:"relative",overflowX:"hidden"},
  header:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 16px 12px",borderBottom:"1px solid #0F172A"},
  topBar:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 16px 12px",borderBottom:"1px solid #0F172A"},
  iconBtn:{background:"#0F172A",border:"1px solid #1E293B",borderRadius:10,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},
  card:{background:"#0F172A",borderRadius:14,border:"1px solid #1E293B",cursor:"pointer"},
  infoBox:{background:"#0F172A",borderRadius:14,border:"1px solid #1E293B",overflow:"hidden",marginBottom:16},
  input:{width:"100%",background:"#0F172A",border:"1px solid #1E293B",borderRadius:10,padding:"12px",color:"#F1F5F9",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  adBanner:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#020817",borderTop:"1px solid #0F172A",padding:"9px 16px",display:"flex",alignItems:"center",zIndex:100},
  fab:{position:"fixed",bottom:52,right:"calc(50% - 199px)",width:54,height:54,borderRadius:"50%",background:"linear-gradient(135deg,#4A9EFF,#6D5FFA)",color:"#fff",fontSize:26,fontWeight:900,border:"none",cursor:"pointer",boxShadow:"0 4px 24px #4A9EF

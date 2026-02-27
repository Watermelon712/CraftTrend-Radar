const $ = (id)=>document.getElementById(id);
const DAY = 24*60*60*1000;

let DATA = { meta:{generated_at:new Date().toISOString()}, items:[] };
let ACTIVE_TAGS = new Set();
let ALL_TAGS = [];

function toDate(ts){ const d = new Date(ts); return isNaN(d)?null:d; }
function fmtDate(ts){ const d=toDate(ts); return d?d.toLocaleString():"-"; }
function daysAgo(ts){ const d=toDate(ts); return d?Math.floor((Date.now()-d.getTime())/DAY):99999; }
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m])); }

function loadFav(){ try{return JSON.parse(localStorage.getItem("ctr_fav")||"[]");}catch{return [];} }
function saveFav(list){ localStorage.setItem("ctr_fav", JSON.stringify(list)); }
function isFav(id){ return loadFav().some(x=>x.id===id); }

function toggleFav(item){
  const fav = loadFav();
  const idx = fav.findIndex(x=>x.id===item.id);
  if(idx>=0) fav.splice(idx,1); else fav.unshift(item);
  saveFav(fav);
  renderFav();
  renderFeed();
}

function buildTags(items){
  const set = new Set();
  items.forEach(it => (it.tags||[]).forEach(t=>set.add(t)));
  ALL_TAGS = Array.from(set).sort();
  const wrap = $("tagChips");
  wrap.innerHTML = ALL_TAGS.map(t=>`<span class="chip" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join("");
  wrap.querySelectorAll(".chip").forEach(ch=>{
    ch.addEventListener("click", ()=>{
      const tag = ch.dataset.tag;
      if(ACTIVE_TAGS.has(tag)) ACTIVE_TAGS.delete(tag); else ACTIVE_TAGS.add(tag);
      ch.classList.toggle("on");
      renderFeed();
    });
  });
}

function filterItems(items){
  const q = ($("q").value||"").trim().toLowerCase();
  const region = $("region").value;
  const range = parseInt($("range").value,10);

  return items.filter(it=>{
    if(daysAgo(it.published_at) > range) return false;
    if(region!=="all" && it.region!==region) return false;

    if(ACTIVE_TAGS.size){
      const tags = new Set(it.tags||[]);
      for(const t of ACTIVE_TAGS){ if(!tags.has(t)) return false; }
    }

    if(q){
      const hay = `${it.title||""} ${it.source||""} ${(it.tags||[]).join(" ")} ${it.summary||""}`.toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
}

function ideaFromItem(it){
  const region = it.region==="cn" ? "国内" : "海外";
  const tags = (it.tags||[]).slice(0,6);
  const core = tags[0] || "手工DIY";
  const title1 = `【${core}】${region}最新趋势复刻：材料清单+步骤（新手可做）`;
  const title2 = `最近爆火的「${core}」怎么做？0失败教程+避坑`;
  const title3 = `把${region}热门${core}做成小红书同款：成本/时间/成品实测`;

  const outline = [
    "开头：成品强展示 + 一句话利益点（好看/解压/好卖）",
    "趋势解释：它为什么火（审美/情绪价值/场景）",
    "材料清单：预算区间 + 平替材料",
    "步骤：3-6步（每步关键细节）",
    "避坑：2-3条（比例/工具/固化/针号等）",
    "拍摄：封面构图/手部特写/对比图",
    "结尾：互动引导（留言想看哪个款式）"
  ];

  const hashtag = [
    "#手工", "#手工DIY", "#DIY教程", "#解压", "#手工日常",
    ...tags.map(t=>"#"+t.replace(/\s+/g,""))
  ].slice(0,12);

  return [
    `选题源：${it.title}`,
    `来源：${it.source}｜${fmtDate(it.published_at)}`,
    "",
    "可用标题（选1）：",
    `1) ${title1}`,
    `2) ${title2}`,
    `3) ${title3}`,
    "",
    "笔记结构：",
    ...outline.map((x,i)=>`${i+1}. ${x}`),
    "",
    "建议话题：",
    hashtag.join(" ")
  ].join("\n");
}

function itemCard(it){
  const badge = it.region==="cn"
    ? `<span class="badge cn">国内</span>`
    : `<span class="badge gl">海外</span>`;
  const tags = (it.tags||[]).slice(0,6).map(t=>`<span class="badge">${escapeHtml(t)}</span>`).join(" ");
  const fav = isFav(it.id) ? "★" : "☆";

  return `
    <div class="item" data-id="${escapeHtml(it.id)}">
      <div class="itemTop">
        <div class="title">
          <a href="${escapeHtml(it.url)}" target="_blank" rel="noreferrer">${escapeHtml(it.title)}</a>
        </div>
        <div class="meta">
          ${badge}
          <span>${escapeHtml(it.source || "-")}</span>
          <span>·</span>
          <span>${fmtDate(it.published_at)}</span>
        </div>
      </div>
      <div class="meta" style="margin-top:8px">${tags}</div>
      <div class="actions">
        <button class="primary small" data-act="idea">生成小红书选题</button>
        <button class="small" data-act="fav">${fav} 收藏</button>
      </div>
    </div>
  `;
}

function bindItemActions(container){
  container.querySelectorAll(".item").forEach(el=>{
    const id = el.dataset.id;
    const it = DATA.items.find(x=>x.id===id);
    if(!it) return;

    el.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        e.preventDefault();
        const act = btn.dataset.act;
        if(act==="idea") $("ideaBox").value = ideaFromItem(it);
        if(act==="fav") toggleFav(it);
      });
    });
  });
}

function renderFeed(){
  const items = filterItems(DATA.items);
  const feed = $("feed");
  feed.innerHTML = items.slice(0,80).map(itemCard).join("") || `<div class="muted">没有匹配结果，换个关键词或清空筛选。</div>`;
  bindItemActions(feed);
  $("status").textContent = `已加载 ${DATA.items.length} 条｜当前显示 ${Math.min(items.length,80)} 条`;
}

function renderFav(){
  const fav = loadFav();
  const box = $("favFeed");
  box.innerHTML = fav.map(itemCard).join("") || `<div class="muted">暂无收藏。回到趋势流点 ☆ 收藏。</div>`;
  bindItemActions(box);
}

function exportJSON(){
  const blob = new Blob([JSON.stringify(filterItems(DATA.items), null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "craft_trends_export.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportCSV(){
  const items = filterItems(DATA.items);
  const header = ["title","source","region","published_at","url","tags"].join(",");
  const rows = items.map(it=>{
    const cols = [
      `"${(it.title||"").replace(/"/g,'""')}"`,
      `"${(it.source||"").replace(/"/g,'""')}"`,
      it.region||"",
      it.published_at||"",
      it.url||"",
      `"${(it.tags||[]).join("|").replace(/"/g,'""')}"`
    ];
    return cols.join(",");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "craft_trends_export.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function dailyBrief(){
  const items = filterItems(DATA.items).slice(0,20);
  const byTag = new Map();
  items.forEach(it=>{
    (it.tags||[]).slice(0,3).forEach(t=>byTag.set(t, (byTag.get(t)||0)+1));
  });
  const hotTags = Array.from(byTag.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6);

  const lines = [
    `【今日手工趋势简报】${new Date().toLocaleDateString()}`,
    "",
    `Top 标签：${hotTags.map(([t,n])=>`${t}(${n})`).join(" / ") || "暂无"}`,
    "",
    "重点趋势（可转小红书选题）：",
    ...items.slice(0,8).map((it,i)=>`${i+1}. ${it.title}（${it.source}）`)
  ].join("\n");

  const box = $("briefBox");
  box.style.display = "block";
  box.textContent = lines;
}

function switchTab(tab){
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active", t.dataset.tab===tab));
  $("feedView").style.display = tab==="feed" ? "block" : "none";
  $("favView").style.display = tab==="fav" ? "block" : "none";
  if(tab==="fav") renderFav();
}

async function init(){
  // 读 trends.json
  const resp = await fetch("./trends.json", {cache:"no-store"});
  DATA = await resp.json();

  $("lastUpdate").textContent = "Last update: " + fmtDate(DATA.meta.generated_at);

  buildTags(DATA.items);

  $("searchBtn").addEventListener("click", renderFeed);
  $("resetBtn").addEventListener("click", ()=>{
    $("q").value="";
    $("region").value="all";
    $("range").value="30";
    ACTIVE_TAGS.clear();
    document.querySelectorAll(".chip").forEach(ch=>ch.classList.remove("on"));
    renderFeed();
  });

  $("exportJSON").addEventListener("click", exportJSON);
  $("exportCSV").addEventListener("click", exportCSV);
  $("dailyBrief").addEventListener("click", dailyBrief);

  $("copyIdea").addEventListener("click", ()=>{
    navigator.clipboard.writeText($("ideaBox").value || "").then(()=>alert("已复制选题"));
  });

  $("clearFav").addEventListener("click", ()=>{ saveFav([]); renderFav(); });

  $("openFav").addEventListener("click", ()=>switchTab("fav"));
  $("tabs").addEventListener("click",(e)=>{
    const el = e.target.closest(".tab");
    if(el) switchTab(el.dataset.tab);
  });

  renderFeed();
}

init().catch(err=>{
  $("status").textContent = "加载失败：请确认 trends.json 和 app.js 已在仓库根目录";
  console.error(err);
});
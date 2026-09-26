
/* ---------- content (loaded from content.json + imports) ---------- */
const DIFF_LABEL={1:"Tes accords",2:"Accessible",3:"Plus exigeant"};
let KNOWN=[],CHORDS={},SONGS=[],EXERCISES=[],ALL=[],PLAN=[],REVIEW_FROM=7,BASE=null,CUSTOM=null;
const EX_DEFAULTS={genre:"Exercice",key:"",bpm:60,bpb:4,pattern:"D-DU-UDU",simple:"D-D-D-D-",diff:2,note:""};
const SONG_DEFAULTS={genre:"Autre",key:"",year:null,bpb:4,pattern:"D-DU-UDU",simple:"D-D-D-D-",diff:2,note:""};
const emptyCustom=()=>({chords:{},songs:[],exercises:[],plan:[],planMode:"append",known:[]});
const barsOf=bar=>Array.isArray(bar)?bar.map(x=>String(x).trim()).filter(Boolean):String(bar).trim().split(/\s+/);
function normItem(x,isEx){
  const o=Object.assign({},isEx?EX_DEFAULTS:SONG_DEFAULTS,x);
  if(isEx){o.exercise=true;o.artist=o.artist||o.desc||"";if(!["strum","change","seq"].includes(o.cat))o.cat="seq";}
  if(!o.simple)o.simple=o.bpb===3?"D-D-D-":o.bpb===6?"D--D--":"D-D-D-D-";
  o.sections=(o.sections||[]).map(sec=>({name:sec.name||"Grille",rep:sec.rep||"",bars:(sec.bars||[]).map(barsOf)}));
  return o;
}
const normPlanItem=it=>Array.isArray(it)?[String(it[0]),+it[1]||2,+it[2]||70]:[String(it.id),+it.minutes||2,+it.speed||70];
const addChords=s=>{const set=[];s.sections.forEach(sec=>sec.bars.forEach(bar=>bar.forEach(c=>{if(!set.includes(c))set.push(c)})));s.chords=set;s.newChords=set.filter(c=>!KNOWN.includes(c));};
const mergeById=(a,b)=>{const m=new Map(a.map(x=>[x.id,x]));b.forEach(x=>m.set(x.id,x));return [...m.values()];};
function buildContent(){
  const c=CUSTOM;
  KNOWN=[...new Set([...(BASE.known||[]),...(c.known||[])])];
  CHORDS=Object.assign({},BASE.chords,c.chords);
  const customIds=new Set([...c.songs,...c.exercises].map(x=>x.id));
  SONGS=mergeById(BASE.songs,c.songs).map(x=>normItem(x,false));
  EXERCISES=mergeById(BASE.exercises,c.exercises).map(x=>normItem(x,true));
  ALL=SONGS.concat(EXERCISES);
  ALL.forEach(s=>{addChords(s);s.custom=customIds.has(s.id);});
  const cp=(c.plan||[]).map(sess=>sess.map(normPlanItem));
  PLAN=(c.planMode==="replace"&&cp.length)?cp:(BASE.plan||[]).map(sess=>sess.map(normPlanItem)).concat(cp);
  const rf=(c.planMode==="replace"&&cp.length)?(c.reviewFrom||0):(BASE.reviewFrom||0);
  REVIEW_FROM=Math.max(0,Math.min(rf,PLAN.length-1));
}
function sessionAt(i){
  if(!PLAN.length)return {n:i+1,review:false,items:[]};
  if(i<PLAN.length)return {n:i+1,review:false,items:PLAN[i]};
  const span=PLAN.length-REVIEW_FROM;
  return {n:i+1,review:true,items:PLAN[REVIEW_FROM+((i-PLAN.length)%span)]};
}

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem("uku:"+k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem("uku:"+k,JSON.stringify(v))}catch(e){}}};
function diagram(name){
  const c=CHORDS[name];const xs=[20,40,60,80];const top=26,fs=22,nf=4;
  let s=`<svg class="dia" viewBox="0 0 100 132" role="img" aria-label="Schéma de l'accord ${name}">`;
  for(let f=0;f<=nf;f++){const y=top+f*fs;s+=`<line x1="20" x2="80" y1="${y}" y2="${y}" class="${f===0?"nut":"fret"}"/>`;}
  xs.forEach(x=>{s+=`<line x1="${x}" x2="${x}" y1="${top}" y2="${top+nf*fs}" class="str"/>`;});
  c.frets.forEach((f,i)=>{
    if(f===0){s+=`<circle cx="${xs[i]}" cy="${top-10}" r="4" class="open"/>`;}
    else{const y=top+(f-.5)*fs;s+=`<circle cx="${xs[i]}" cy="${y}" r="8" class="dot"/><text x="${xs[i]}" y="${y+3.6}" class="fing">${c.fingers[i]}</text>`;}
  });
  ["G","C","E","A"].forEach((l,i)=>{s+=`<text x="${xs[i]}" y="126" class="slab">${l}</text>`;});
  return s+"</svg>";
}
const dotsHtml=d=>`<span class="dots">${[1,2,3].map(i=>`<i class="${i<=d?"on":""}"></i>`).join("")}</span>`;

/* ---------- chords view ---------- */
function renderChords(){
  $("#known-grid").innerHTML=KNOWN.map(n=>`<button class="chord-card known" data-chord="${n}"><span class="nm">${n}</span>${diagram(n)}</button>`).join("");
  const others=Object.keys(CHORDS).filter(n=>!KNOWN.includes(n)).map(n=>({n,count:SONGS.filter(s=>s.chords.includes(n)).length})).sort((a,b)=>b.count-a.count);
  $("#new-grid").innerHTML=others.map(o=>`<button class="chord-card" data-chord="${o.n}"><span class="nm">${o.n}</span>${diagram(o.n)}<span class="unl">Dans ${o.count} chanson${o.count>1?"s":""}</span></button>`).join("");
}

/* ---------- songs view ---------- */
let filter=store.get("filter","Toutes");
function renderFilters(){
  const genres=["Toutes","Mes accords seulement","Français","Español",...new Set(SONGS.map(s=>s.genre))];
  $("#filters").innerHTML=genres.map(g=>`<button class="fchip" data-filter="${g}" aria-pressed="${g===filter}">${g}</button>`).join("");
}
const LANG={"Français":"fr","Español":"es"};
const norm=t=>t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
let query="";
const tagsOf=s=>s.tags||(!s.exercise?["r","a"]:s.cat==="strum"?["r"]:["a"]);
const tagsHtml=s=>tagsOf(s).map(t=>t==="r"?'<span class="chip tag-r">Rythme</span>':'<span class="chip tag-a">Accords</span>').join("");
const arrows=p=>[...p].map(ch=>ch==="D"?"↓":ch==="U"?"↑":"·").join(" ");
function card(s){
  return `<button class="song" data-song="${s.id}">
      <span><span class="song-title">${s.title}</span><span class="song-artist">${s.artist}${s.year?" · "+s.year:""}</span></span>
      <span class="diff" aria-label="Difficulté ${s.diff} sur 3">${dotsHtml(s.diff)}<small>${DIFF_LABEL[s.diff]}</small></span>
      <span class="song-meta">${s.exercise
        ?tagsHtml(s)+(s.cat==="strum"?`<span class="ex-pattern">${arrows(s.pattern)}</span><span class="chip">${s.bpb===6?"6/8":s.bpb+"/4"}</span>`:"")
        :`<span class="chip genre">${s.genre}</span><span class="chip">en ${s.key}</span>`}
        <span class="chordlist">${s.chords.map(c=>`<span class="${KNOWN.includes(c)?"":"new"}">${c}</span>`).join("")}</span></span>
    </button>`;
}
function renderSongs(){
  const words=norm(query).split(/\s+/).filter(Boolean);
  const list=SONGS.filter(s=>filter==="Toutes"||(filter==="Mes accords seulement"?s.newChords.length===0:LANG[filter]?s.lang===LANG[filter]:s.genre===filter))
    .filter(s=>{if(!words.length)return true;const hay=norm([s.title,s.artist,s.genre,s.lang==="fr"?"français":s.lang==="es"?"español espagnol":"",s.chords.join(" ")].join(" "));return words.every(w=>hay.includes(w));})
    .sort((a,b)=>a.diff-b.diff);
  $("#song-list").innerHTML=list.length?list.map(card).join(""):`<p class="empty">${words.length?"Aucune chanson ne correspond à « "+query.replace(/</g,"&lt;")+" ».":"Aucune chanson dans ce filtre."}</p>`;
}
function renderTraining(){
  $("#ex-strum").innerHTML=EXERCISES.filter(e=>e.cat==="strum").map(card).join("");
  $("#ex-change").innerHTML=EXERCISES.filter(e=>e.cat==="change").map(card).join("");
  $("#ex-seq").innerHTML=EXERCISES.filter(e=>e.cat==="seq").map(card).join("");
}

/* ---------- today ---------- */
let PROG={session:0,done:{},history:[],updated:0};
const KIND={strum:"Rythme",change:"Changement d'accords",seq:"Enchaînement"};
const checkSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const fmtDate=t=>new Date(t).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
function saveProgress(){
  PROG.updated=Date.now();store.set("progress",PROG);
}
function renderToday(){
  const S=sessionAt(PROG.session);
  const mins=S.items.reduce((a,it)=>a+it[1],0);
  const doneCount=S.items.filter((it,k)=>PROG.done[PROG.session+":"+k]).length;
  $("#today-title").textContent=(S.review?"Révision · séance ":"Séance ")+S.n;
  $("#today-sub").textContent=`${S.items.length} exercices · environ ${mins} min · ${doneCount}/${S.items.length} faits`;
  const total=PLAN.length;
  $("#qbar").innerHTML=Array.from({length:total},(_,i)=>`<i class="${i<Math.min(PROG.session,total)?"done":i===PROG.session?"cur":""}"></i>`).join("");
  $("#qpos").textContent=PROG.session<total?`Parcours débutant : séance ${PROG.session+1} sur ${total}`:"Parcours terminé · révisions en boucle";
  const last=PROG.history.length?PROG.history[PROG.history.length-1].t:null;
  $("#qlast").textContent=last?"Dernière séance : "+fmtDate(last):"Première séance";
  $("#today-items").innerHTML=S.items.map((it,k)=>{
    const s=ALL.find(x=>x.id===it[0]);if(!s)return "";
    const key=PROG.session+":"+k,done=!!PROG.done[key];
    const kind=s.exercise?KIND[s.cat]:"Chanson";
    return `<div class="item ${done?"is-done":""}">
      <button class="check" data-check="${key}" aria-pressed="${done}" aria-label="${done?"Fait":"Marquer comme fait"} : ${s.title}">${checkSvg}</button>
      <button class="song" data-today="${k}">
        <span><span class="kind">${kind}</span><span class="song-title">${s.title}</span><span class="song-artist">${s.artist}</span></span>
        <span class="diff">${dotsHtml(s.diff)}</span>
        <span class="song-meta">${tagsHtml(s)}<span class="chip goalchip">${it[1]} min · ${it[2]} %</span>${s.exercise&&s.cat==="strum"?`<span class="ex-pattern">${arrows(s.pattern)}</span>`:""}<span class="chordlist">${s.chords.map(c=>`<span class="${KNOWN.includes(c)?"":"new"}">${c}</span>`).join("")}</span></span>
      </button></div>`;
  }).join("");
  const all=doneCount===S.items.length;
  const fb=$("#finish");fb.textContent=all?"Séance terminée · passer à la suivante":"Passer à la séance suivante";fb.classList.toggle("soft",!all);
  $("#prev-session").hidden=PROG.session===0;
  const last2=PROG.history.length?PROG.history[PROG.history.length-1].t:0;
  $("#saveinfo").textContent="Progression enregistrée sur ce téléphone."+(PROG.history.length>=3&&store.get("lastExport",0)<last2-14*864e5?" Pense à exporter une sauvegarde de temps en temps.":"");
}
function toggleDone(key){PROG.done[key]=!PROG.done[key];if(!PROG.done[key])delete PROG.done[key];saveProgress();renderToday();}
function finishSession(){
  const S=sessionAt(PROG.session);
  S.items.forEach((_,k)=>delete PROG.done[PROG.session+":"+k]);
  PROG.history.push({t:Date.now(),s:PROG.session});PROG.history=PROG.history.slice(-40);
  PROG.session++;saveProgress();renderToday();window.scrollTo(0,0);
}
function prevSession(){if(PROG.session>0){PROG.session--;saveProgress();renderToday();}}
function initProgress(){
  const local=store.get("progress",null);
  if(local&&typeof local==="object")PROG=Object.assign({session:0,done:{},history:[],updated:0},local);
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();}catch(e){}
}

/* ---------- song view ---------- */
let cur=null,backTo="songs";
function openSong(id,opts){
  opts=opts||{};
  const found=ALL.find(s=>s.id===id);if(!found)return;
  backTo=opts.from||(found.exercise?"training":"songs");
  cur=found;
  stop();
  const s=cur;let n=0;
  const secs=s.sections.map(sec=>`<div class="section"><div class="section-name">${sec.name}${sec.rep?` <small>${sec.rep}</small>`:""}</div><div class="grid">${
    sec.bars.map(bar=>{n++;return `<div class="bar" data-bar="${n-1}"><span class="num">${n}</span>${bar.map(c=>`<button class="cb ${KNOWN.includes(c)?"":"new"}" data-chord="${c}">${c}</button>`).join("")}</div>`}).join("")
  }</div></div>`).join("");
  const q=encodeURIComponent(s.title+" "+s.artist.replace("Traditionnel","").replace("·",""));
  const meter=s.bpb===6?"6/8":s.bpb+"/4";
  $("#view-song").innerHTML=`
    <button class="back" data-back>← ${{today:"Aujourd'hui",training:"Entraînement",songs:"Chansons"}[backTo]}</button>
    <h2>${s.title}</h2>
    <p class="sub">${s.artist}${s.year?" · "+s.year:""}</p>
    <div class="facts">${s.exercise?tagsHtml(s):`<span class="chip genre">${s.genre}</span><span class="chip">Tonalité ${s.key}</span>`}<span class="chip">${meter}</span><span class="chip">${DIFF_LABEL[s.diff]}</span></div>
    ${opts.minutes?`<div class="goal"><span class="chip goalchip">Objectif : ${opts.minutes} min à ${opts.speed} %</span>${opts.key?`<button class="donebtn" data-donekey="${opts.key}">${PROG.done[opts.key]?"Déjà fait ✓":"C'est fait, retour à la séance"}</button>`:""}</div>`:""}
    ${s.note?`<p class="note">${s.note}</p>`:""}
    <h3>${s.exercise?"Accords de l'exercice":"Accords du morceau"}</h3>
    <div class="strip">${s.chords.map(c=>`<button class="mini ${KNOWN.includes(c)?"":"new"}" data-chord="${c}"><span class="nm">${c}</span>${diagram(c)}</button>`).join("")}</div>
    <h3>Grille · une case = une mesure</h3>
    ${secs}
    ${s.exercise?"":`<a class="ext" href="https://www.ultimate-guitar.com/search.php?search_type=title&value=${q}" target="_blank" rel="noopener">Paroles et versions complètes sur Ultimate Guitar ↗</a>`}`;
  show("song");
  P.loop=!!s.exercise||!!opts.minutes;$("#loop").checked=P.loop;
  if(opts.speed){P.speed=opts.speed/100;$("#speed").value=P.speed;}
  renderPattern();updateBpm();
  $("#nowchord").textContent=s.sections[0].bars[0][0];
  $("#nextchord").textContent="prêt";
  window.scrollTo(0,0);
}

/* ---------- navigation ---------- */
function show(v){
  ["today","chords","songs","training","manage","song"].forEach(k=>{$("#view-"+k).hidden=v!==k;});
  $("#tabs").hidden=v==="song";$("#player").hidden=v!=="song";
  $("#app").classList.toggle("in-song",v==="song");
  document.querySelectorAll(".tab").forEach(t=>t.setAttribute("aria-selected",t.dataset.tab===v));
  if(v!=="song"){stop();if(v!=="manage")store.set("tab",v);}
}

/* ---------- modal ---------- */
let lastFocus=null;
function openChord(n){
  const c=CHORDS[n];if(!c)return;lastFocus=document.activeElement;
  const known=KNOWN.includes(n);
  const used=SONGS.filter(s=>s.chords.includes(n)).map(s=>s.title);
  $("#sheet").innerHTML=`<button class="x" data-close aria-label="Fermer">×</button>
    <div><span class="big-name" id="m-name">${n}</span><span class="pill-known ${known?"":"pill-new"}">${known?"acquis":"nouveau"}</span></div>
    ${diagram(n)}
    <p>${c.tip}</p>
    <p style="color:var(--muted);font-size:.85rem">Dans : ${used.join(", ")||"aucune chanson du carnet"}</p>
    <button class="listen" data-listen="${n}">Écouter l'accord</button>`;
  $("#modal").hidden=false;$("#sheet .x").focus();
  playChordPreview(n);
}
function closeModal(){$("#modal").hidden=true;if(lastFocus)lastFocus.focus();}

/* ---------- audio: Karplus-Strong ukulele ---------- */
const OPEN=[67,60,64,69]; // G4 C4 E4 A4 (re-entrant)
let AC=null,BUS=null;const bufs={};const live=new Set();
function ensureAudio(){
  if(!AC){
    AC=new (window.AudioContext||window.webkitAudioContext)();
    const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=3800;
    const body=AC.createBiquadFilter();body.type="peaking";body.frequency.value=420;body.Q.value=1.2;body.gain.value=4;
    const comp=AC.createDynamicsCompressor();
    BUS=AC.createGain();BUS.gain.value=.55;
    BUS.connect(body).connect(lp).connect(comp).connect(AC.destination);
  }
  if(AC.state==="suspended")AC.resume();
}
function ks(midi){
  if(bufs[midi])return bufs[midi];
  const sr=AC.sampleRate,f=440*Math.pow(2,(midi-69)/12),N=Math.max(2,Math.round(sr/f)),len=Math.floor(sr*1.7);
  const buf=AC.createBuffer(1,len,sr),d=buf.getChannelData(0),ring=new Float32Array(N);
  let p=0;for(let i=0;i<N;i++){p=p*.55+(Math.random()*2-1)*.45;ring[i]=p;}
  let idx=0,max=0;
  for(let i=0;i<len;i++){const nx=(idx+1)%N,v=ring[idx];d[i]=v;ring[idx]=.9955*.5*(v+ring[nx]);idx=nx;const a=Math.abs(v);if(a>max)max=a;}
  const g=max?1/max:1;for(let i=0;i<len;i++)d[i]*=g;
  return bufs[midi]=buf;
}
function pluck(midi,t,vel){
  const src=AC.createBufferSource();src.buffer=ks(midi);
  const g=AC.createGain();g.gain.value=vel*.3;
  src.connect(g).connect(BUS);src.start(t);live.add(src);src.onended=()=>live.delete(src);
}
function strum(name,t,dir,vel){
  const c=CHORDS[name];if(!c)return;
  const up=dir==="U";const order=up?[3,2,1,0]:[0,1,2,3];
  order.forEach((s,i)=>pluck(OPEN[s]+c.frets[s],t+i*(up?.009:.015),vel*(up?.7:1)));
}
function click(t,acc){
  const o=AC.createOscillator(),g=AC.createGain();o.frequency.value=acc?1500:1000;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(acc?.35:.22,t+.002);g.gain.exponentialRampToValueAtTime(.0001,t+.05);
  o.connect(g).connect(AC.destination);o.start(t);o.stop(t+.06);live.add(o);o.onended=()=>live.delete(o);
}
function playChordPreview(n){
  ensureAudio();const t=AC.currentTime+.05;const c=CHORDS[n];
  [0,1,2,3].forEach((s,i)=>pluck(OPEN[s]+c.frets[s],t+i*.22,.8));
  strum(n,t+1.05,"D",1);
}

/* ---------- player ---------- */
const P={playing:false,speed:store.get("speed",.8),mode:store.get("mode","simple"),loop:false,tl:null,origin:0,iter:0,idx:0,timer:null,lastBar:-1,lastSlot:-1,lock:null,barEls:[]};
const playIcon='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
const stopIcon='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
function patStr(){return P.mode==="simple"?cur.simple:cur.pattern;}
function renderPattern(){
  if(!cur)return;
  $("#pattern").innerHTML=[...patStr()].map(ch=>`<span class="${ch==="-"?"":"stroke"}">${ch==="D"?"↓":ch==="U"?"↑":"·"}</span>`).join("");
  $("#m-simple").setAttribute("aria-pressed",P.mode==="simple");$("#m-full").setAttribute("aria-pressed",P.mode==="full");
}
function updateBpm(){if(cur)$("#bpm").textContent=Math.round(cur.bpm*P.speed)+" bpm";}
function build(){
  const s=cur,beat=60/(s.bpm*P.speed),barDur=s.bpb*beat,pat=patStr(),slot=barDur/pat.length;
  const bars=[];s.sections.forEach(sec=>sec.bars.forEach(bar=>bars.push(bar)));
  const ev=[];
  bars.forEach((bar,k)=>{for(let j=0;j<pat.length;j++){const ch=pat[j];if(ch==="-")continue;ev.push({t:k*barDur+j*slot,chord:bar[Math.floor(j*bar.length/pat.length)],dir:ch,first:j===0});}});
  return {bars,ev,beat,barDur,patLen:pat.length,total:bars.length*barDur};
}
function schedule(){
  const tl=P.tl,h=AC.currentTime+.15;
  for(;;){
    if(P.idx>=tl.ev.length){if(!P.loop)return;P.iter++;P.idx=0;}
    const e=tl.ev[P.idx],t=P.origin+P.iter*tl.total+e.t;
    if(t>h)return;
    strum(e.chord,t,e.dir,e.first?1:.78);P.idx++;
  }
}
async function play(){
  if(!cur)return;ensureAudio();
  P.tl=build();const now=AC.currentTime+.12;
  for(let i=0;i<cur.bpb;i++)click(now+i*P.tl.beat,i===0);
  P.origin=now+cur.bpb*P.tl.beat;P.iter=0;P.idx=0;P.lastBar=-1;P.lastSlot=-1;P.playing=true;
  P.barEls=[...document.querySelectorAll("#view-song .bar")];
  P.timer=setInterval(schedule,25);schedule();
  $("#playbtn").innerHTML=stopIcon;$("#playbtn").setAttribute("aria-label","Arrêter");
  requestAnimationFrame(frame);
  try{if(navigator.wakeLock)P.lock=await navigator.wakeLock.request("screen");}catch(e){}
}
function stop(){
  if(P.timer)clearInterval(P.timer);P.timer=null;P.playing=false;
  live.forEach(n=>{try{n.stop()}catch(e){}});live.clear();
  document.querySelectorAll("#view-song .bar.active").forEach(el=>el.classList.remove("active"));
  document.querySelectorAll("#view-song .fill,#view-song .head").forEach(el=>el.remove());
  document.querySelectorAll("#view-song .cb.now").forEach(el=>el.classList.remove("now"));
  document.querySelectorAll("#pattern span.hit").forEach(el=>el.classList.remove("hit"));
  const pb=$("#playbtn");pb.innerHTML=playIcon;pb.setAttribute("aria-label","Lecture");
  if(cur)$("#nextchord").textContent="prêt";
  if(P.lock){try{P.lock.release()}catch(e){}P.lock=null;}
}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
function frame(){
  if(!P.playing)return;
  const tl=P.tl,pos=AC.currentTime-P.origin;
  if(pos<0){$("#nowchord").textContent=tl.bars[0][0];$("#nextchord").textContent="décompte "+Math.ceil(-pos/tl.beat);requestAnimationFrame(frame);return;}
  if(!P.loop&&pos>=(P.iter+1)*tl.total){stop();return;}
  const p=pos%tl.total,bi=Math.min(tl.bars.length-1,Math.floor(p/tl.barDur)),frac=(p-bi*tl.barDur)/tl.barDur;
  const bar=tl.bars[bi],ci=Math.min(bar.length-1,Math.floor(frac*bar.length));
  const el=P.barEls[bi];
  if(bi!==P.lastBar){
    if(P.lastBar>=0&&P.barEls[P.lastBar]){const o=P.barEls[P.lastBar];o.classList.remove("active");o.querySelectorAll(".fill,.head").forEach(x=>x.remove());o.querySelectorAll(".cb.now").forEach(x=>x.classList.remove("now"));}
    el.classList.add("active");el.insertAdjacentHTML("afterbegin",'<span class="fill"></span><span class="head"></span>');
    el.scrollIntoView({block:"center",behavior:reduce?"auto":"smooth"});
    P.lastBar=bi;
  }
  el.querySelector(".fill").style.width=(frac*100)+"%";el.querySelector(".head").style.left=(frac*100)+"%";
  el.querySelectorAll(".cb").forEach((b,i)=>b.classList.toggle("now",i===ci));
  $("#nowchord").textContent=bar[ci];
  let nxt=ci<bar.length-1?bar[ci+1]:(tl.bars[bi+1]||(P.loop?tl.bars[0]:null)||[null])[0];
  $("#nextchord").textContent=nxt?"puis "+nxt:"fin";
  const slot=Math.floor(frac*tl.patLen);
  if(slot!==P.lastSlot){const sp=$("#pattern").children;for(let i=0;i<sp.length;i++)sp[i].classList.toggle("hit",i===slot&&sp[i].classList.contains("stroke"));P.lastSlot=slot;}
  requestAnimationFrame(frame);
}
function restartIfPlaying(){if(P.playing){stop();play();}}

/* ---------- events ---------- */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-go],[data-remove],[data-check],[data-today],[data-donekey],[data-chord],[data-song],[data-tab],[data-filter],[data-back],[data-close],[data-listen],[data-mode]");
  if(!t){if(e.target.id==="modal")closeModal();return;}
  if(t.dataset.go){show(t.dataset.go);window.scrollTo(0,0);return;}
  if(t.dataset.remove){removeCustom(t.dataset.remove);return;}
  if(t.dataset.check){toggleDone(t.dataset.check);return;}
  if(t.dataset.today!==undefined){const k=+t.dataset.today,it=sessionAt(PROG.session).items[k];openSong(it[0],{from:"today",minutes:it[1],speed:it[2],key:PROG.session+":"+k});return;}
  if(t.dataset.donekey){PROG.done[t.dataset.donekey]=true;saveProgress();renderToday();show("today");window.scrollTo(0,0);return;}
  if(t.dataset.chord)openChord(t.dataset.chord);
  else if(t.dataset.song)openSong(t.dataset.song);
  else if(t.dataset.tab)show(t.dataset.tab);
  else if(t.dataset.filter){filter=t.dataset.filter;store.set("filter",filter);renderFilters();renderSongs();}
  else if(t.hasAttribute("data-back")){show(backTo);window.scrollTo(0,0);}
  else if(t.hasAttribute("data-close"))closeModal();
  else if(t.dataset.listen)playChordPreview(t.dataset.listen);
  else if(t.dataset.mode){P.mode=t.dataset.mode;store.set("mode",P.mode);renderPattern();restartIfPlaying();}
});
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#modal").hidden)closeModal();});
$("#playbtn").addEventListener("click",()=>{P.playing?stop():play();});
$("#speed").value=P.speed;
$("#speed").addEventListener("input",e=>{P.speed=+e.target.value;store.set("speed",P.speed);updateBpm();});
$("#speed").addEventListener("change",restartIfPlaying);
$("#loop").addEventListener("change",e=>{P.loop=e.target.checked;});

/* ---------- import / export ---------- */
const ID_RE=/^[\w-]{1,60}$/, PAT_RE=/^[DU-]{2,16}$/;
function checkItem(x,isEx,chords,errs){
  const where=(isEx?"Exercice":"Chanson")+" « "+(x&&(x.title||x.id)||"?")+" »";
  if(!x||typeof x!=="object"){errs.push(where+" : format invalide.");return;}
  if(!ID_RE.test(x.id||""))errs.push(where+" : il faut un « id » (lettres, chiffres, tirets).");
  if(!x.title)errs.push(where+" : il manque « title ».");
  if(!isEx&&!x.artist)errs.push(where+" : il manque « artist ».");
  if(x.bpm!==undefined&&!(x.bpm>=30&&x.bpm<=260))errs.push(where+" : « bpm » doit être entre 30 et 260.");
  if(x.bpb!==undefined&&![2,3,4,6].includes(x.bpb))errs.push(where+" : « bpb » doit valoir 2, 3, 4 ou 6.");
  ["pattern","simple"].forEach(k=>{if(x[k]!==undefined&&!PAT_RE.test(x[k]))errs.push(where+" : « "+k+" » ne doit contenir que D, U et -.");});
  if(isEx&&x.cat&&!["strum","change","seq"].includes(x.cat))errs.push(where+" : « cat » doit valoir strum, change ou seq.");
  if(!Array.isArray(x.sections)||!x.sections.length){errs.push(where+" : il faut au moins une section avec des mesures.");return;}
  const unknown=new Set();
  x.sections.forEach(sec=>{if(!Array.isArray(sec.bars)||!sec.bars.length)errs.push(where+" : la section « "+(sec.name||"?")+" » n'a pas de mesures.");else sec.bars.forEach(bar=>barsOf(bar).forEach(c=>{if(!chords[c])unknown.add(c);}));});
  if(unknown.size)errs.push(where+" : accord(s) sans schéma : "+[...unknown].join(", ")+". Ajoute-les dans « chords ».");
}
function validateImport(obj){
  const errs=[];
  if(!obj||typeof obj!=="object"||Array.isArray(obj))return ["Le fichier doit contenir un objet JSON { … }."];
  const chords=Object.assign({},CHORDS);
  if(obj.chords!==undefined){
    if(typeof obj.chords!=="object"||Array.isArray(obj.chords))errs.push("« chords » doit être un objet.");
    else Object.entries(obj.chords).forEach(([n,c])=>{
      const ok=c&&Array.isArray(c.frets)&&c.frets.length===4&&c.frets.every(f=>Number.isInteger(f)&&f>=0&&f<=12)&&(!c.fingers||(Array.isArray(c.fingers)&&c.fingers.length===4));
      if(!ok)errs.push("Accord « "+n+" » : « frets » doit lister 4 cases (cordes G C E A), ex. [0,0,0,3].");else chords[n]=c;
    });
  }
  const songs=obj.songs||[],exs=obj.exercises||[];
  if(!Array.isArray(songs))errs.push("« songs » doit être une liste.");else songs.forEach(x=>checkItem(x,false,chords,errs));
  if(!Array.isArray(exs))errs.push("« exercises » doit être une liste.");else exs.forEach(x=>checkItem(x,true,chords,errs));
  if(obj.plan!==undefined){
    const ids=new Set([...ALL.map(x=>x.id),...(Array.isArray(songs)?songs:[]).map(x=>x&&x.id),...(Array.isArray(exs)?exs:[]).map(x=>x&&x.id)]);
    if(!Array.isArray(obj.plan))errs.push("« plan » doit être une liste de séances.");
    else obj.plan.forEach((sess,i)=>{
      if(!Array.isArray(sess)||!sess.length){errs.push("Séance "+(i+1)+" : doit être une liste d'exercices.");return;}
      sess.forEach(it=>{const [id,m,sp]=normPlanItem(it);if(!ids.has(id))errs.push("Séance "+(i+1)+" : « "+id+" » n'existe ni dans le carnet ni dans ce fichier.");if(!(m>0&&m<=30))errs.push("Séance "+(i+1)+" : durée invalide pour « "+id+" ».");if(!(sp>=30&&sp<=100))errs.push("Séance "+(i+1)+" : vitesse (%) invalide pour « "+id+" ».");});
    });
    if(obj.planMode!==undefined&&!["append","replace"].includes(obj.planMode))errs.push("« planMode » doit valoir append ou replace.");
  }
  if(!songs.length&&!exs.length&&!obj.plan&&!obj.chords)errs.push("Rien à importer : il faut au moins songs, exercises, plan ou chords.");
  return errs;
}
function showResult(ok,lines){
  const r=$("#imp-result");r.hidden=false;r.className="result "+(ok?"ok":"bad");
  r.innerHTML=lines.map(l=>`<p>${l.replace(/</g,"&lt;")}</p>`).join("");
  r.scrollIntoView({block:"nearest",behavior:reduce?"auto":"smooth"});
}
function refreshAll(){buildContent();$("#songs-sub").textContent=SONGS.length+" chansons pour voix alto-mezzo · grilles d'accords avec lecteur";renderChords();renderFilters();renderSongs();renderTraining();renderToday();renderManage();}
function importText(text){
  let obj;try{obj=JSON.parse(text);}catch(e){showResult(false,["Ce n'est pas du JSON valide : "+e.message]);return;}
  if(obj&&obj.type==="carnet-ukulele-backup"){
    if(!confirm("Restaurer cette sauvegarde ? Ta progression et tes contenus importés actuels seront remplacés."))return;
    CUSTOM=Object.assign(emptyCustom(),obj.custom||{});store.set("custom",CUSTOM);
    PROG=Object.assign({session:0,done:{},history:[],updated:0},obj.progress||{});store.set("progress",PROG);
    refreshAll();showResult(true,["Sauvegarde restaurée : séance "+(PROG.session+1)+", "+(CUSTOM.songs.length+CUSTOM.exercises.length)+" contenu(s) importé(s)."]);return;
  }
  const errs=validateImport(obj);
  if(errs.length){showResult(false,["Import refusé, rien n'a été modifié :"].concat(errs));return;}
  Object.assign(CUSTOM.chords,obj.chords||{});
  CUSTOM.songs=mergeById(CUSTOM.songs,obj.songs||[]);
  CUSTOM.exercises=mergeById(CUSTOM.exercises,obj.exercises||[]);
  if(Array.isArray(obj.known))CUSTOM.known=[...new Set([...CUSTOM.known,...obj.known])];
  let planMsg="";
  if(obj.plan){
    if(obj.planMode==="replace"){CUSTOM.plan=obj.plan;CUSTOM.planMode="replace";CUSTOM.reviewFrom=obj.reviewFrom||0;PROG.session=0;PROG.done={};saveProgress();planMsg=obj.plan.length+" séance(s) : nouveau programme, reprise à la séance 1.";}
    else{CUSTOM.plan=CUSTOM.plan.concat(obj.plan);planMsg=obj.plan.length+" séance(s) ajoutée(s) à la suite de ta file.";}
  }
  store.set("custom",CUSTOM);refreshAll();
  const n=(a)=>a?a.length:0;
  showResult(true,["Import réussi."].concat(n(obj.songs)?[n(obj.songs)+" chanson(s)."]:[],n(obj.exercises)?[n(obj.exercises)+" exercice(s)."]:[],obj.chords?[Object.keys(obj.chords).length+" accord(s)."]:[],planMsg?[planMsg]:[]));
  $("#imp-text").value="";
}
function removeCustom(key){
  if(key==="plan"){if(!confirm("Retirer les séances importées ?"))return;CUSTOM.plan=[];CUSTOM.planMode="append";delete CUSTOM.reviewFrom;}
  else{const [kind,id]=key.split(":");const arr=kind==="song"?"songs":"exercises";if(!confirm("Retirer « "+((CUSTOM[arr].find(x=>x.id===id)||{}).title||id)+" » ?"))return;CUSTOM[arr]=CUSTOM[arr].filter(x=>x.id!==id);}
  store.set("custom",CUSTOM);refreshAll();
}
function renderManage(){
  const rows=[...CUSTOM.songs.map(x=>["song",x]),...CUSTOM.exercises.map(x=>["ex",x])];
  let h=rows.length?rows.map(([k,x])=>`<div class="crow"><span><b>${x.title}</b><small>${k==="song"?"Chanson":"Exercice"}${BASE.songs.concat(BASE.exercises).some(y=>y.id===x.id)?" · remplace la version du carnet":""}</small></span><button class="linkbtn" data-remove="${k}:${x.id}">Retirer</button></div>`).join(""):"";
  if(CUSTOM.plan.length)h+=`<div class="crow"><span><b>${CUSTOM.plan.length} séance(s) importée(s)</b><small>${CUSTOM.planMode==="replace"?"Programme qui remplace le parcours d'origine":"Ajoutées à la suite du parcours"}</small></span><button class="linkbtn" data-remove="plan">Retirer</button></div>`;
  const ch=Object.keys(CUSTOM.chords);if(ch.length)h+=`<p class="saveinfo">Accords ajoutés : ${ch.join(", ")}</p>`;
  $("#custom-list").innerHTML=h||`<p class="empty">Rien d'importé pour l'instant.</p>`;
}
function exportBackup(){
  const data={type:"carnet-ukulele-backup",version:1,exported:new Date().toISOString(),progress:PROG,custom:CUSTOM};
  const blob=new Blob([JSON.stringify(data,null,1)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="carnet-ukulele-sauvegarde-"+new Date().toISOString().slice(0,10)+".json";
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
  store.set("lastExport",Date.now());renderToday();
}
function claudePrompt(){
  return `Je veux ajouter du contenu à mon appli de ukulélé (accordage G C E A, re-entrant). Réponds uniquement avec un objet JSON valide, sans texte autour, au format suivant.

{
  "chords": { "Bm": { "frets": [4,2,2,2], "fingers": [3,1,1,1], "tip": "Conseil de doigté en français." } },
  "songs": [ {
    "id": "identifiant-unique", "title": "Titre", "artist": "Artiste", "year": 2001,
    "lang": "fr | es | (vide pour l'anglais)", "genre": "Indie folk",
    "key": "Am", "bpm": 90, "bpb": 4, "pattern": "D-DU-UDU", "simple": "D-D-D-D-", "diff": 1,
    "note": "Source de la grille et simplifications faites, en français.",
    "sections": [ { "name": "Couplet", "rep": "×2", "bars": ["Am", "C G", "F", "E7"] } ]
  } ],
  "exercises": [ {
    "id": "ex-identifiant", "cat": "strum | change | seq", "tags": ["r","a"],
    "title": "Am ↔ Dm", "desc": "Sous-titre court", "bpm": 60, "bpb": 4,
    "pattern": "D-DU-UDU", "simple": "D-D-D-D-", "diff": 1, "note": "Conseil.",
    "sections": [ { "name": "Boucle", "bars": ["Am", "Dm", "Am", "Dm"] } ]
  } ],
  "plan": [ [ ["ex-identifiant", 2, 70], ["identifiant-unique", 3, 60] ] ],
  "planMode": "append"
}

Règles :
- Chaque élément de "bars" est une mesure ; "C G" = deux accords dans la mesure.
- "pattern"/"simple" : une case par croche (8 pour 4/4, 6 pour 3/4 et 6/8), D = bas, U = haut, - = rien.
- "bpb" : 4, 3 ou 6 (6/8, bpm en croches). "diff" : 1 à 3. Tags : "r" = rythme, "a" = accords.
- "plan" : liste de séances de 10 à 12 min ; chaque exercice = [id, minutes, vitesse en %]. "planMode" : "append" ajoute à la suite de ma file, "replace" remplace tout le parcours.
- Pas de paroles. Grilles vérifiées sur une source fiable, citée dans "note". Transpose si possible vers des accords sans barré.
- Accords déjà dans l'appli (inutile de les redéfinir) : ${Object.keys(CHORDS).join(", ")}. Accords que je maîtrise : ${KNOWN.join(", ")}.
- Identifiants déjà utilisés (réutilisables dans "plan") : ${ALL.map(x=>x.id).join(", ")}.

Ma demande : `;
}
async function copyText(text,btn){
  const old=btn.textContent;
  try{await navigator.clipboard.writeText(text);btn.textContent="Copié ✓";}
  catch(e){$("#imp-text").value=text;$("#imp-text").select();btn.textContent="Sélectionné dans la zone de texte";}
  setTimeout(()=>{btn.textContent=old;},2200);
}
$("#imp-file").addEventListener("change",e=>{const f=e.target.files[0];if(!f)return;f.text().then(importText);e.target.value="";});
$("#imp-go").addEventListener("click",()=>{const t=$("#imp-text").value.trim();if(t)importText(t);});
$("#export").addEventListener("click",exportBackup);
$("#copy-prompt").addEventListener("click",e=>copyText(claudePrompt(),e.currentTarget));
$("#reset-custom").addEventListener("click",()=>{if(!confirm("Supprimer toutes les chansons, exercices et séances importés ? Ta progression est conservée."))return;CUSTOM=emptyCustom();store.set("custom",CUSTOM);refreshAll();showResult(true,["Contenus importés supprimés."]);});

/* ---------- service worker & updates ---------- */
if("serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("sw.js").then(reg=>{
      const offer=w=>{$("#update").hidden=false;$("#update-go").onclick=()=>w.postMessage("skip");};
      if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);
      reg.addEventListener("updatefound",()=>{const w=reg.installing;w&&w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)offer(w);});});
    }).catch(()=>{});
    let reloaded=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!reloaded){reloaded=true;location.reload();}});
  });
}

/* ---------- boot ---------- */
$("#playbtn").innerHTML=playIcon;
$("#finish").addEventListener("click",finishSession);
$("#prev-session").addEventListener("click",prevSession);
$("#q").addEventListener("input",e=>{query=e.target.value;renderSongs();});
(async function boot(){
  try{
    const r=await fetch("content.json",{cache:"no-cache"});
    if(!r.ok)throw new Error("HTTP "+r.status);
    BASE=await r.json();
  }catch(e){
    $("#today-sub").textContent="Impossible de charger le contenu du carnet ("+e.message+"). Vérifie ta connexion puis relance l'appli.";
    show("today");return;
  }
  CUSTOM=Object.assign(emptyCustom(),store.get("custom",{})||{});
  initProgress();
  refreshAll();
  const startTab=store.get("tab","today");
  show(["today","chords","songs","training"].includes(startTab)?startTab:"today");
})();

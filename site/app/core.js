"use strict";
/* GulPS / GulPM library. Plain JavaScript, no build step. Backend: Supabase (see config.js and supabase/gulps/schema.sql). */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const S={rrole:"student",rf:{},books:[],users:[],loans:[],holds:[],myHolds:[],shelf:{},reviews:[],bans:{},loaded:false,uid:null,me:null,staff:false,admin:false,reg:{open:true,code_required:false},settings:null,q:"",genre:"All",blang:"all",only:false,sort:"title",tab:"overview",sq:"",rolef:"all",ltab:"want",atab:"login",bid:"",lang:"en",star:0};
try{const l=localStorage.getItem("gul.lang");S.lang=l||((navigator.language||"").toLowerCase().startsWith("uz")?"uz":"en")}catch(_){}
let route="home",hdrKey="",busy=false;
const CFG=window.GUL_CONFIG||{};
const sb=(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase)?window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY):null;

/* ---------- language ---------- */
const SCH={en:{short:"GulPS",full:"Presidential School in Gulistan"},uz:{short:"GulPM",full:"Guliston shahridagi Prezident maktabi"}};
const sch=()=>SCH[S.lang];
const UZ={};
const t=(k,v)=>{const s=(S.lang==="uz"&&UZ[k])||k;return v?s.replace(/\{(\w+)\}/g,(_,n)=>v[n]):s};
const LANGS=["uz","en","ru"],lname=l=>t({uz:"Uzbek",en:"English",ru:"Russian"}[l]||"English");
const blang=b=>b.lang||"en";
const UM=["yan","fev","mar","apr","may","iyun","iyul","avg","sen","okt","noy","dek"];
const fmt=d=>{if(!d)return "";const x=new Date(d);return S.lang==="uz"?`${x.getDate()}-${UM[x.getMonth()]}, ${x.getFullYear()}`:x.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})};
const CLASSES=[];for(let g=5;g<=11;g++)for(const n of["01","02"])CLASSES.push(g+"-"+n);
const ERR={E_CLOSED:"Registration is closed.",E_SCHOOL_CODE:"Wrong school code.",E_BANNED:"This account is suspended.",E_LIMIT:"This user already has the maximum number of books.",E_UNAVAILABLE:"No copy is free right now.",E_QUEUE:"Other readers are ahead in the queue.",E_DUP:"That was already done.",E_HAVE:"You already have this book.",E_AVAILABLE:"A copy is free. Ask at the library desk.",E_HAS_LOANS:"This user still has books out.",E_LAST_ADMIN:"There must be at least one admin.",E_NEEDS_CLASS:"This user has no class. Choose a class first.",E_FORBIDDEN:"You are not allowed to do that.",E_NOT_FOUND:"Not found."};
const AUTHERR={"Invalid login credentials":"Wrong email or password.","User already registered":"This email is already registered.","Database error saving new user":"Could not create the account. Check the class and the school code.","Email not confirmed":"Confirm your email first, then log in."};
const errText=e=>{const m=(e&&e.message)||"";const k=(m.match(/E_[A-Z_]+/)||[])[0];if(/password/i.test(m)&&/least|weak|short/i.test(m))return t("Use a longer password (at least 8 characters).");return t(ERR[k]||AUTHERR[m]||"Something went wrong. Please try again.")};

/* ---------- helpers ---------- */
const hue=x=>{let h=0;for(const c of x)h=(h*31+c.charCodeAt(0))%360;return h};
const toast=m=>{const e=document.createElement("div");e.className="toast";e.setAttribute("role","status");e.textContent=m;document.body.append(e);setTimeout(()=>e.remove(),3200)};
const out=id=>S.loans.filter(l=>l.bookId===id&&!l.returnedAt);
const avail=b=>Math.max(0,b.total-b.outN);
const bookOf=id=>S.books.find(b=>b.id===id);
const stuOf=id=>S.users.find(s=>s.id===id);
const code=s=>s.code;
const isT=s=>!!s&&s.role==="teacher";
const roleName=s=>t({student:"Student",teacher:"Teacher",librarian:"Librarian",admin:"Admin"}[s.role]||"Student");
const who=s=>s?(s.grade||(s.role==="student"?"":roleName(s))):"";
const banned=s=>!!s&&s.banned;
const sname=s=>s?s.first+" "+s.last:t("Removed user");
const rpc=async(fn,args)=>{const {data,error}=await sb.rpc(fn,args||{});if(error)throw error;return data};
const must=async p=>{const {data,error}=await p;if(error)throw error;return data};
const fetchAll=async(table,cols,order)=>{let all=[],from=0;for(;;){const r=await must(sb.from(table).select(cols).order(order,{ascending:false}).range(from,from+999));all=all.concat(r);if(r.length<1000)return all;from+=1000}};
const act=async(f,ok,close)=>{try{await f();if(close)closeLayer();if(ok)toast(t(ok));await refresh();return true}catch(e){toast(errText(e));return false}};
const safeUrl=u=>/^https?:\/\//i.test(u||"")?u:"";
const cover=(b,big)=>`<div class="cover${big?" big":""}" style="background:hsl(${hue(b.title)} 32% 30%)">${safeUrl(b.cover)?`<img src="${esc(safeUrl(b.cover))}" alt="" loading="lazy">`:""}<small>${esc(t(b.genre||""))} · ${blang(b).toUpperCase()}</small><b>${esc(b.title)}</b><small>${esc(b.author)}</small></div>`;
const stars=n=>"★".repeat(Math.round(n))+"☆".repeat(5-Math.round(n));
function stockLine(b){const a=avail(b);if(a>0)return `<div class="stock">${t("{n} of {total} available",{n:a,total:b.total})}</div>`;
 return `<div class="stock no">${t("Not available · 0 of {total}",{total:b.total})}${b.holdN?` · ${t("{n} waiting",{n:b.holdN})}`:""}</div>`}
const rate=b=>b.ratingN?`<div class="ca">★ ${b.ratingAvg} <span>(${b.ratingN})</span></div>`:"";
const card=(b,extra="")=>`<button class="card" data-book="${b.id}">${cover(b).replace(/<\/div>$/,`<span class="badge${avail(b)?"":" no"}">${avail(b)}/${b.total}</span></div>`)}<div class="ct">${esc(b.title)}</div><div class="ca">${esc(b.author)}</div>${extra||rate(b)+stockLine(b)}</button>`;
const searchBox=(id,v="",big)=>`<form class="search${big?" big":""}" data-search><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="${id}" type="search" placeholder="${t("Search by title or author")}" aria-label="${t("Search books")}" value="${esc(v)}"></form>`;
const empty=(a,b)=>`<div class="empty" style="border:0"><h3>${t(a)}</h3>${t(b)}</div>`;
const needLogin=()=>`<div class="empty"><h3>${t("Log in to see this page")}</h3>${t("Create a library account or log in first.")}<div style="margin-top:14px"><a class="btn pri" href="#login">${t("Log in or register")}</a></div></div>`;
function setLang(l){S.lang=l;try{localStorage.setItem("gul.lang",l)}catch(_){}document.documentElement.lang=l;document.title=sch().short+" "+t("Library");hdrKey="";go()}

/* ---------- data ---------- */
const mapBook=b=>({id:b.id,title:b.title,author:b.author,genre:b.genre,lang:b.lang,year:b.year,total:b.total,shelf:b.shelf,isbn:b.isbn,cover:b.cover_url,desc:b.description,added:b.added,outN:+b.out_n,holdN:+b.hold_n,borrowN:+b.borrow_n,ratingAvg:b.rating_avg==null?null:+b.rating_avg,ratingN:+b.rating_n});
const mapUser=p=>({id:p.id,authId:p.auth_id,first:p.first_name,last:p.last_name,role:p.role,grade:p.grade,code:p.code,email:p.email,banned:p.banned,reason:p.ban_reason,joined:Date.parse(p.created_at)});
const mapLoan=l=>({id:l.id,bookId:l.book_id,studentId:l.user_id,out:l.out_at,returnedAt:l.returned_at});
async function refresh(){
 if(!sb||busy)return;busy=true;S.loadError="";
 try{
  const [books,reg,sess]=await Promise.all([rpc("books_overview"),rpc("registration_info"),sb.auth.getSession()]);
  S.books=books.map(mapBook);S.reg=reg;const session=sess.data.session;S.uid=session?session.user.id:null;
  S.me=null;S.users=[];S.loans=[];S.holds=[];S.myHolds=[];S.shelf={};S.staff=S.admin=false;S.settings=null;
  if(S.uid){
   const p=await must(sb.from("profiles").select("*").eq("auth_id",S.uid).maybeSingle());
   if(p){S.me=mapUser(p);S.staff=["librarian","admin"].includes(p.role);S.admin=p.role==="admin";
    const [loans,mh,sh]=await Promise.all([S.staff?fetchAll("loans","id,book_id,user_id,out_at,returned_at","out_at"):must(sb.from("loans").select("id,book_id,user_id,out_at,returned_at").order("out_at",{ascending:false})),rpc("my_holds"),must(sb.from("shelf").select("book_id,status"))]);
    S.loans=loans.map(mapLoan);S.myHolds=mh;S.shelf=Object.fromEntries(sh.map(r=>[r.book_id,r.status]));
    if(S.staff){const [us,hs]=await Promise.all([fetchAll("profiles","*","created_at"),must(sb.from("holds").select("id,book_id,user_id,created_at").order("created_at"))]);
     S.users=us.map(mapUser);S.holds=hs.map(h=>({id:h.id,bookId:h.book_id,userId:h.user_id,created:h.created_at}));if(S.admin)S.settings=await rpc("admin_settings")}
    else S.users=[S.me]}
  }
  S.bans={};S.users.forEach(u=>{if(u.banned)S.bans[u.id]={reason:u.reason}});S.loaded=true;
 }catch(e){S.loadError=e.message||"error"}finally{busy=false}
 repaint();
}

/* ---------- header ---------- */
function header(){
 const key=[route,S.uid,S.me&&S.me.id,S.staff,S.lang].join("|");if(key===hdrKey)return;hdrKey=key;
 const nav=[["home","Home"],["catalog","Catalog"],...(S.uid?[["list","My list"]]:[])];
 $("#bar").innerHTML=`<a class="logo" href="#home" title="${esc(sch().full)}"><i></i><span>${sch().short}</span></a>
 <nav>${nav.map(([r,n])=>`<a href="#${r}" ${route===r?'aria-current="page"':""}>${t(n)}</a>`).join("")}</nav>
 <form class="hs" data-search><input id="hq" type="search" placeholder="${t("Search books")}" aria-label="${t("Search books")}"></form><span style="flex:1"></span>
 <div class="seg lg" role="group" aria-label="${t("Language")}">${["uz","en"].map(l=>`<button data-lang="${l}" aria-pressed="${S.lang===l}">${l.toUpperCase()}</button>`).join("")}</div>
 ${S.staff?`<a class="btn sm" href="#admin">${t("Admin")}</a>`:""}
 ${S.uid?`<a class="ava" href="#profile" title="${esc(S.me?sname(S.me):"")}">${esc(((S.me&&S.me.first)||"?")[0].toUpperCase())}</a>`:`<a class="btn pri sm" href="#login">${t("Log in")}</a>`}`;
}
document.addEventListener("submit",e=>{const f=e.target.closest("[data-search]");if(!f||e.defaultPrevented)return;e.preventDefault();S.q=f.querySelector("input").value;S.genre="All";if(route==="catalog")viewCatalog();else location.hash="catalog"});
document.addEventListener("click",e=>{const b=e.target.closest("[data-lang]");if(b)setLang(b.dataset.lang)});

/* ---------- home ---------- */
function paintHome(){
 if(document.activeElement&&document.activeElement.id==="hq2")return;
 const top=[...S.books].sort((a,b)=>b.borrowN-a.borrowN||a.title.localeCompare(b.title)),fresh=[...S.books].sort((a,b)=>b.added-a.added).slice(0,12),free=S.books.filter(b=>avail(b)>0);
 const gc={};S.books.forEach(b=>{if(b.genre)gc[b.genre]=(gc[b.genre]||0)+1});
 const mine=S.me?S.loans.filter(l=>l.studentId===S.me.id&&!l.returnedAt):[];
 const rail=(n,L,link="")=>L.length?`<section class="sec"><div class="sech"><h2>${t(n)}</h2>${link}</div><div class="rail">${L.map(b=>card(b)).join("")}</div></section>`:"";
 $("#main").innerHTML=`<section class="hero"><div><div class="eyebrow">${sch().full}</div><h1>${t("Find your next read")}</h1><p>${S.loaded?t("{n} titles on our shelves, {free} ready to borrow today.",{n:S.books.length,free:free.length}):t("Opening the shelves…")}</p>${searchBox("hq2","",true)}</div>
 <div class="shelf" aria-hidden="true">${top.slice(0,3).map(b=>cover(b)).join("")}</div></section>
 ${S.loadError?`<div class="note">${t("Could not load the library. Check your connection and try again.")}</div>`:""}
 ${mine.length?`<section class="sec"><div class="sech"><h2>${t("Your books")}</h2><a href="#list">${t("See all")}</a></div><div class="panel">${mine.map(l=>{const b=bookOf(l.bookId);return b?`<div class="loan" data-book="${b.id}"><div class="cover mini" style="background:hsl(${hue(b.title)} 32% 30%)"></div><div><b>${esc(b.title)}</b><div class="ca">${esc(b.author)}</div></div><span class="when">${t("Borrowed {d}",{d:fmt(l.out)})}</span></div>`:""}).join("")}</div></section>`:""}
 ${rail("Popular right now",top.filter(b=>b.borrowN>0).slice(0,12),`<a href="#catalog">${t("Browse all")}</a>`)}
 ${rail("New arrivals",fresh)}
 ${rail("Available today",free.slice(0,12))}
 ${Object.keys(gc).length?`<section class="sec"><div class="sech"><h2>${t("Browse by genre")}</h2></div><div class="genres">${Object.entries(gc).sort().map(([g,n])=>`<button class="gt" data-genre="${esc(g)}">${esc(t(g))}<span>${n}</span></button>`).join("")}</div></section>`:""}
 ${S.loaded&&!S.books.length?`<div class="empty" style="margin-top:24px"><h3>${t("The shelves are empty")}</h3>${t("An admin can add the first books from the Admin page.")}</div>`:""}
 <div class="foot"><span>${sch().full} · ${t("School library")}</span><span>${t("Borrow at the desk with your library ID")}</span></div>`;
}

document.addEventListener("error",e=>{if(e.target&&e.target.tagName==="IMG")e.target.remove()},true);

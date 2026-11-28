"use strict";
/* ---------- catalog ---------- */
/* search folding: one apostrophe style, lower case, and Cyrillic -> Latin so "garri potter" finds Гарри Поттер */
const CYR={"а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"yo","ж":"j","з":"z","и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f","х":"x","ц":"ts","ч":"ch","ш":"sh","щ":"sh","ъ":"","ы":"i","ь":"","э":"e","ю":"yu","я":"ya","ў":"o'","қ":"q","ғ":"g'","ҳ":"h"};
const fold=s=>String(s).toLowerCase().replace(/[\u02bb\u02bc\u2018\u2019`\u00b4\u02b9\u2032]/g,"'").replace(/[а-яёўқғҳ]/g,c=>CYR[c]);
const PAGE=48; /* books drawn at once; "Show more" adds another page. Keeps a 2000-book catalog fast on phones. */
let qTimer=0;
function viewCatalog(){
 S.show=PAGE;
 $("#main").innerHTML=`<div class="head"><div><h1>${t("Catalog")}</h1><p class="sub" id="count"></p></div>${searchBox("q",S.q)}</div><div class="cat"><aside class="filt" id="filt"></aside><div id="grid" class="grid"></div></div>`;
 $("#q").oninput=e=>{S.q=e.target.value;S.show=PAGE;clearTimeout(qTimer);qTimer=setTimeout(paintCatalog,150)};
 $("#q").closest("form").onsubmit=e=>e.preventDefault();
 $("#filt").onclick=e=>{const g=e.target.closest("[data-g]"),l=e.target.closest("[data-bl]");if(g){S.genre=g.dataset.g;S.show=PAGE;paintCatalog()}if(l){S.blang=l.dataset.bl;S.show=PAGE;paintCatalog()}if(e.target.closest("#only")){S.only=!S.only;S.show=PAGE;paintCatalog()}};
 $("#filt").onchange=e=>{S.sort=e.target.value;S.show=PAGE;paintCatalog()};
 $("#grid").onclick=e=>{if(e.target.closest("#more")){S.show+=PAGE;paintCatalog()}};
 paintCatalog();
}
function paintCatalog(){
 if(route!=="catalog"||!$("#grid"))return;
 const gc={},lc={};S.books.forEach(b=>{if(b.genre)gc[b.genre]=(gc[b.genre]||0)+1;lc[blang(b)]=(lc[blang(b)]||0)+1});
 $("#filt").innerHTML=`<h4>${t("Genre")}</h4><button aria-pressed="${S.genre==="All"}" data-g="All">${t("All")}<span>${S.books.length}</span></button>${Object.keys(gc).sort().map(g=>`<button aria-pressed="${S.genre===g}" data-g="${esc(g)}">${esc(t(g))}<span>${gc[g]}</span></button>`).join("")}
 <h4>${t("Book language")}</h4><button aria-pressed="${S.blang==="all"}" data-bl="all">${t("All")}</button>${LANGS.map(l=>`<button aria-pressed="${S.blang===l}" data-bl="${l}">${lname(l)}<span>${lc[l]||0}</span></button>`).join("")}
 <h4>${t("Stock")}</h4><button id="only" aria-pressed="${S.only}">${t("Available now")}</button><h4>${t("Sort")}</h4><select aria-label="${t("Sort")}">${[["title","A to Z"],["author","Author"],["pop","Most borrowed"],["rating","Top rated"],["new","Newest added"],["stock","Most copies free"]].map(([v,n])=>`<option value="${v}">${t(n)}</option>`).join("")}</select>`;
 $("#filt select").value=S.sort;
 const qs=fold(S.q.trim()).split(/\s+/).filter(Boolean);
 const L=S.books.filter(b=>(S.genre==="All"||b.genre===S.genre)&&(S.blang==="all"||blang(b)===S.blang)&&(!S.only||avail(b)>0)&&(!qs.length||qs.every(w=>(b._h||(b._h=fold(b.title+" "+b.author+" "+(b.isbn||"")))).includes(w))));
 L.sort({title:(a,b)=>a.title.localeCompare(b.title),author:(a,b)=>a.author.localeCompare(b.author),pop:(a,b)=>b.borrowN-a.borrowN,rating:(a,b)=>(b.ratingAvg||0)-(a.ratingAvg||0)||b.ratingN-a.ratingN,new:(a,b)=>(b.added||0)-(a.added||0),stock:(a,b)=>avail(b)-avail(a)}[S.sort]);
 $("#count").textContent=S.loaded?t("{n} of {total} titles",{n:L.length,total:S.books.length}):t("Loading the shelves…");
 const rest=L.length-S.show;
 $("#grid").innerHTML=L.length?L.slice(0,S.show).map(b=>card(b)).join("")+(rest>0?`<div style="grid-column:1/-1;text-align:center;padding:6px 0 18px"><button class="btn" id="more">${t("Show more")} · ${rest}</button></div>`:""):`<div class="empty" style="grid-column:1/-1"><h3>${t(S.books.length?"Nothing matches":"The shelves are empty")}</h3>${t(S.books.length?"Try a different word or clear the filters.":"An admin can add the first books from the Admin page.")}</div>`;
}

/* ---------- book page ---------- */
const myHold=id=>S.myHolds.find(h=>h.book_id===id);
async function loadReviews(){const id=S.bid;if(!sb||!id)return;try{const r=await rpc("reviews_for",{p_book:id});if(S.bid===id){S.reviews=r;S.revFor=id;if(route==="book")paintBook()}}catch(_){}}
function reviewsHtml(b){
 const R=S.revFor===b.id?S.reviews:[],mine=R.find(r=>r.mine);
 const form=S.me&&!banned(S.me)?`<form id="rv" style="margin:12px 0 18px"><div class="field"><label for="rt">${t(mine?"Your rating":"Rate this book")}</label><select id="rt" style="max-width:200px">${[5,4,3,2,1].map(n=>`<option value="${n}" ${((mine&&mine.rating)||S.star||5)===n?"selected":""}>${"★".repeat(n)} (${n})</option>`).join("")}</select></div>
 <div class="field"><label for="rb">${t("Your review (optional)")}</label><textarea id="rb" maxlength="600">${esc(mine?mine.body:"")}</textarea></div><button class="btn pri sm">${t(mine?"Update review":"Post review")}</button></form>`:"";
 return `<section class="sec"><div class="sech"><h2>${t("Reviews")}${b.ratingN?` <span class="stars">${stars(b.ratingAvg)}</span> <span class="sub">${b.ratingAvg} · ${b.ratingN}</span>`:""}</h2></div>${form}
 ${R.length?R.map(r=>`<div class="rev"><b>${esc(r.author)}</b> <span class="stars">${stars(r.rating)}</span> <span class="ca" style="display:inline">${fmt(r.created)}</span>${r.body?`<p style="margin:6px 0 0;overflow-wrap:anywhere">${esc(r.body)}</p>`:""}${r.mine||S.staff?`<button class="lnk" data-act="delrev" data-r="${r.id}">${t("Delete")}</button>`:""}</div>`).join(""):`<p class="sub">${t(S.revFor===b.id?"No reviews yet.":"Loading…")}</p>`}</section>`;
}
function paintBook(){
 const b=bookOf(S.bid);
 if(!b){$("#main").innerHTML=S.loaded?`<div class="empty"><h3>${t("Book not found")}</h3><a href="#catalog">${t("Back to the catalog")}</a></div>`:`<p class="sub">${t("Loading…")}</p>`;return}
 const o=out(b.id),a=avail(b),mine=S.me&&o.find(l=>l.studentId===S.me.id),hold=myHold(b.id),st=S.shelf[b.id]||"";
 const more=S.books.filter(x=>x.genre&&x.genre===b.genre&&x.id!==b.id).slice(0,10);
 const queue=S.holds.filter(h=>h.bookId===b.id);
 let action="";
 if(S.me&&!banned(S.me)&&!mine){
  if(hold)action=`<button class="btn" data-act="unhold" data-b="${b.id}">${t("Cancel reservation")}</button>`;
  else if(!a)action=`<button class="btn pri" data-act="hold" data-b="${b.id}">${t("Reserve a copy")}</button>`}
 const note=mine?`<p style="margin:10px 0 0">${t("You have this book.")}</p>`:hold?`<p style="margin:10px 0 0">${hold.position<=a?t("A copy is waiting for you. Ask at the library desk."):t("You are number {n} in the queue.",{n:hold.position})}</p>`:
  a?`<p class="sub" style="margin:10px 0 0">${t("Borrow it at the library desk with your library ID.")}</p>`:`<p class="sub" style="margin:10px 0 0">${t(S.me?"All copies are out. Reserve one to join the queue.":"All copies are out. Log in to reserve one.")}</p>`;
 $("#main").innerHTML=`<a class="crumb" href="#catalog">← ${t("Catalog")}</a>
 <div class="bk"><div>${cover(b,true).replace('cover big','cover')}${S.me?`<div class="field" style="margin-top:12px"><label for="sh">${t("My shelf")}</label><select id="sh" style="width:100%"><option value="">${t("Not on my shelf")}</option>${[["want","Want to read"],["reading","Reading"],["finished","Finished"]].map(([v,n])=>`<option value="${v}" ${st===v?"selected":""}>${t(n)}</option>`).join("")}</select></div>`:""}</div>
 <div><h1>${esc(b.title)}</h1><div class="sub" style="font-size:16px">${esc(b.author)}</div>
 <div class="row" style="justify-content:flex-start;margin-top:12px"><span class="pill">${lname(blang(b))}</span>${b.genre?`<span class="pill">${esc(t(b.genre))}</span>`:""}${b.year?`<span class="pill">${esc(b.year)}</span>`:""}${b.shelf?`<span class="pill">${t("Shelf")} ${esc(b.shelf)}</span>`:""}${b.isbn?`<span class="pill">ISBN ${esc(b.isbn)}</span>`:""}${b.ratingN?`<span class="pill warn">★ ${b.ratingAvg} (${b.ratingN})</span>`:""}</div>
 <div class="panel avl"><b style="color:var(${a?"--ok":"--bad"})">${a?t("{n} of {total} available",{n:a,total:b.total}):t("Not available · 0 of {total}",{total:b.total})}</b>${b.holdN?` <span class="sub">· ${t("{n} waiting",{n:b.holdN})}</span>`:""}
 <div class="dots" aria-hidden="true">${Array.from({length:b.total},(_,i)=>`<i class="${i<a?"f":""}"></i>`).join("")}</div>${note}${action?`<div style="margin-top:12px">${action}</div>`:""}</div>
 <p style="max-width:62ch;font-size:15px;overflow-wrap:anywhere">${esc(b.desc||t("No description yet."))}</p>
 ${S.staff?`<div class="row" style="justify-content:flex-start;margin:14px 0"><button class="btn pri" data-act="checkout" data-b="${b.id}" ${a?"":"disabled"}>${t("Check out")}</button><button class="btn" data-act="editbook" data-b="${b.id}">${t("Edit book")}</button></div>
 <h2 style="font-size:17px;margin:20px 0 10px">${t("Borrowed by")}</h2><div class="panel tw">${o.length?`<table><thead><tr><th>${t("Borrower")}</th><th>${t("ID")}</th><th>${t("Class")}</th><th>${t("Borrowed")}</th><th></th></tr></thead><tbody>${o.map(l=>{const s=stuOf(l.studentId);return `<tr><td><b>${esc(sname(s))}</b></td><td class="mono">${s?esc(code(s)):""}</td><td>${s?esc(who(s)):""}</td><td>${fmt(l.out)}</td><td class="r"><button class="btn sm" data-act="return" data-l="${l.id}">${t("Mark returned")}</button></td></tr>`}).join("")}</tbody></table>`:empty("No copies out","Every copy is on the shelf.")}</div>
 ${queue.length?`<h2 style="font-size:17px;margin:20px 0 10px">${t("Reservations")}</h2><div class="panel">${queue.map((h,i)=>{const s=stuOf(h.userId);return `<div class="loan" style="cursor:default"><div><b>${i+1}. ${esc(sname(s))}</b><div class="ca">${s?esc(code(s))+(who(s)?" · "+esc(who(s)):""):""}</div></div><button class="btn sm" data-act="rmhold" data-h="${h.id}">${t("Remove")}</button></div>`}).join("")}</div>`:""}`:""}</div></div>
 ${reviewsHtml(b)}
 ${more.length?`<section class="sec"><div class="sech"><h2>${t("More in {g}",{g:t(b.genre)})}</h2></div><div class="rail">${more.map(x=>card(x)).join("")}</div></section>`:""}`;
}
document.addEventListener("change",async e=>{
 if(e.target.id==="sh"){const id=S.bid,v=e.target.value;if(!S.me)return;
  await act(async()=>{if(v)await must(sb.from("shelf").upsert({user_id:S.me.id,book_id:id,status:v,updated_at:new Date().toISOString()}));else await must(sb.from("shelf").delete().eq("book_id",id).eq("user_id",S.me.id))},v?"Saved to my shelf":"Removed from my shelf")}});
document.addEventListener("submit",async e=>{
 if(e.target.id!=="rv")return;e.preventDefault();
 const rating=+$("#rt").value,body=$("#rb").value.trim();
 if(await act(()=>rpc("save_review",{p_book:S.bid,p_rating:rating,p_body:body}),"Review saved"))loadReviews()});

/* ---------- my list ---------- */
function paintList(){
 if(!S.uid){$("#main").innerHTML=needLogin();return}
 if(!S.me){$("#main").innerHTML=S.loaded?noProfile():`<p class="sub">${t("Loading…")}</p>`;return}
 const L=S.loans.filter(l=>l.studentId===S.me.id),byShelf=k=>S.books.filter(b=>S.shelf[b.id]===k);
 const tabs={want:byShelf("want"),reading:byShelf("reading"),finished:byShelf("finished"),now:L.filter(l=>!l.returnedAt),held:S.myHolds.map(h=>bookOf(h.book_id)).filter(Boolean),done:L.filter(l=>l.returnedAt)};
 const T=[["want","Want to read"],["reading","Reading"],["finished","Finished"],["now","Borrowed now"],["held","Reserved"],["done","Returned"]];
 if(!tabs[S.ltab])S.ltab="want";
 const items=tabs[S.ltab],isLoan=S.ltab==="now"||S.ltab==="done";
 const emptyMsg={want:["Nothing here yet","Open a book and choose Want to read."],reading:["Nothing here yet","Open a book and choose Reading."],finished:["Nothing here yet","Open a book and choose Finished."],now:["No books borrowed","Ask for a book at the library desk."],held:["No reservations","When every copy is out you can reserve one."],done:["No returned books yet","Ask for a book at the library desk."]}[S.ltab];
 $("#main").innerHTML=`<div class="head"><div><h1>${t("My list")}</h1><p class="sub">${t("Your shelf, your reservations and the books you borrowed.")}</p></div></div>
 <div class="tabs">${T.map(([k,n])=>`<button aria-selected="${S.ltab===k}" data-ltab="${k}">${t(n)} (${tabs[k].length})</button>`).join("")}</div>
 ${items.length?`<div class="grid">${isLoan?items.map(l=>{const b=bookOf(l.bookId);return b?card(b,`<div class="stock" style="color:var(--mute)">${l.returnedAt?t("Returned {d}",{d:fmt(l.returnedAt)}):t("Borrowed {d}",{d:fmt(l.out)})}</div>`):""}).join(""):items.map(b=>card(b,S.ltab==="held"?`<div class="stock" style="color:var(--mute)">${t("Queue place {n}",{n:myHold(b.id).position})}</div>`:"")).join("")}</div>`:`<div class="empty"><h3>${t(emptyMsg[0])}</h3>${t(emptyMsg[1])}</div>`}`;
}
document.addEventListener("click",e=>{const x=e.target.closest("[data-ltab]");if(x){S.ltab=x.dataset.ltab;paintList()}});

/* ---------- profile ---------- */
const noProfile=()=>`<div class="empty"><h3>${t("No library profile found")}</h3>${t("Please log out and register again, or ask the librarian.")}<div style="margin-top:14px"><button class="btn" data-act="logout">${t("Log out")}</button></div></div>`;
function paintProfile(){
 const m=S.me;
 if(!S.uid){$("#main").innerHTML=needLogin();return}
 if(!m){$("#main").innerHTML=S.loaded?noProfile():`<p class="sub">${t("Loading…")}</p>`;return}
 const L=S.loans.filter(l=>l.studentId===m.id).sort((a,b)=>b.out.localeCompare(a.out)),now=L.filter(l=>!l.returnedAt);
 const fin=Object.values(S.shelf).filter(v=>v==="finished").length;
 $("#main").innerHTML=`<div class="panel me"><div><h1>${esc(sname(m))}</h1><p class="sub">${esc(who(m)||roleName(m))} · ${t("ID")} <span class="id">${esc(code(m))}</span></p>${m.email?`<p class="sub" style="margin:2px 0 0">${esc(m.email)}</p>`:""}</div>
 <div class="row">${banned(m)?`<span class="pill bad">${t("Suspended")}</span>`:`<span class="pill ok">${t("Active")}</span>`}<button class="btn sm" data-act="editme">${t("Edit profile")}</button><button class="btn sm" data-act="chpw">${t("Change password")}</button><button class="btn sm" data-act="logout">${t("Log out")}</button></div></div>
 ${banned(m)?`<div class="note" style="margin-top:16px">${t("Your borrowing is paused. Please talk to the librarian.")}${m.reason?` ${t("Reason:")} ${esc(m.reason)}`:""}</div>`:""}
 <div class="sum" style="margin-top:20px"><span><b>${now.length}</b> ${t("borrowed now")}</span><span><b>${L.length-now.length}</b> ${t("returned")}</span><span><b>${S.myHolds.length}</b> ${t("reserved")}</span><span><b>${fin}</b> ${t("finished")}</span></div>
 <h2 style="font-size:18px;margin-bottom:10px">${t("Book history")}</h2>
 <div class="panel tw">${L.length?`<table><thead><tr><th>${t("Book")}</th><th>${t("Borrowed")}</th><th>${t("Status")}</th></tr></thead><tbody>${L.map(l=>{const b=bookOf(l.bookId)||{title:t("Removed book"),author:""};
 return `<tr><td>${b.id?`<a href="#book-${b.id}" style="color:inherit;text-decoration:none"><b>${esc(b.title)}</b></a>`:`<b>${esc(b.title)}</b>`}<div class="ca">${esc(b.author)}</div></td><td>${fmt(l.out)}</td><td>${l.returnedAt?`<span class="pill">${t("Returned {d}",{d:fmt(l.returnedAt)})}</span>`:`<span class="pill warn">${t("Reading")}</span>`}</td></tr>`}).join("")}</tbody></table>`:empty("No books yet","Pick something from the catalog and ask at the desk.")}</div>`;
}
function meForm(){const m=S.me;openLayer(`<h2>${t("Edit profile")}</h2><form id="f" style="margin-top:16px"><div class="two">${fld("ln",t("Surname"),m.last,"text",'required maxlength="40"')}${fld("fn",t("First name"),m.first,"text",'required maxlength="40"')}</div>${isT(m)||m.role!=="student"&&!m.grade?"":classSel(m.grade)}${btns("Save")}</form>`,true);
 $("#f").onsubmit=async e=>{e.preventDefault();const d={first_name:$("#fn").value.trim(),last_name:$("#ln").value.trim()};if($("#gr"))d.grade=$("#gr").value;
  act(()=>must(sb.from("profiles").update(d).eq("id",m.id)),"Saved",true)}}
function pwForm(){openLayer(`<h2>${t("Change password")}</h2><form id="f" style="margin-top:16px">${fld("pw",t("New password"),"","password",'required minlength="8" autocomplete="new-password"')}${btns("Save")}</form>`,true);
 $("#f").onsubmit=async e=>{e.preventDefault();act(()=>must(sb.auth.updateUser({password:$("#pw").value})),"Password changed",true)}}

/* ---------- login / register ---------- */
const classSel=(v="")=>`<div class="field"><label for="gr">${t("Class")}</label><select id="gr" required><option value="">${t("Choose your class")}</option>${CLASSES.map(c=>`<option ${c===v?"selected":""}>${c}</option>`).join("")}</select></div>`;
const fld=(id,l,v="",ty="text",x="")=>`<div class="field"><label for="${id}">${l}</label><input id="${id}" type="${ty}" value="${esc(v)}" ${x}></div>`;
const personFields=(role,v={})=>`<div class="two">${fld("ln",t("Surname"),v.last||"","text",'required maxlength="40" autocomplete="family-name"')}${fld("fn",t("First name"),v.first||"","text",'required maxlength="40" autocomplete="given-name"')}</div>${role==="teacher"?"":classSel(v.grade)}`;
const roleSeg=r=>`<div class="seg" role="group">${["student","teacher"].map(x=>`<button type="button" data-rrole="${x}" aria-pressed="${r===x}">${t(x==="student"?"I am a student":"I am a teacher")}</button>`).join("")}</div>`;
function viewLogin(){
 let body;
 if(!sb){body=`<h1 style="font-size:26px">${t("Not set up yet")}</h1>`}
 else if(S.recovery){body=`<h1 style="font-size:26px">${t("Choose a new password")}</h1><form id="nf" style="margin-top:16px">${fld("pw",t("New password"),"","password",'required minlength="8" autocomplete="new-password"')}<button class="btn pri" style="width:100%">${t("Save password")}</button></form>`}
 else if(S.me){body=`<h1 style="font-size:26px">${t("Welcome back, {n}",{n:esc(S.me.first)})}</h1><p class="sub">${t("You are logged in. Your ID is")} <span class="id">${esc(code(S.me))}</span></p><div class="row" style="justify-content:flex-start;margin-top:20px"><a class="btn pri" href="#profile">${t("Open my profile")}</a><a class="btn" href="#catalog">${t("Browse books")}</a><button class="btn" data-act="logout">${t("Log out")}</button></div>`}
 else{
  const msg=S.msg?`<div class="msg ${S.msg.bad?"bad":""}" role="status">${esc(t(S.msg.text))}</div>`:"";
  const seg=`<div class="seg"><button aria-pressed="${S.atab==="login"||S.atab==="forgot"}" data-atab="login">${t("Log in")}</button><button aria-pressed="${S.atab==="register"}" data-atab="register">${t("Register")}</button></div>`;
  if(S.atab==="register"){
   body=seg+`<h1 style="font-size:26px">${t("Create your account")}</h1><p class="sub">${t("It takes a few seconds. You get a unique library ID.")}</p>${msg}${S.reg.open?`${roleSeg(S.rrole)}<form id="rf">${personFields(S.rrole,S.rf)}
   ${fld("em",t("Email"),S.rf.email||"","email",'required autocomplete="email"')}${fld("pw",t("Password"),"","password",'required minlength="8" autocomplete="new-password"')}
   ${S.reg.code_required?fld("sc",t("School code"),"","text",'required autocomplete="off"')+`<p class="sub" style="margin:-6px 0 14px">${t("Ask your teacher or the librarian for the school code.")}</p>`:""}
   <button class="btn pri" style="width:100%">${t("Register")}</button></form>`:`<div class="note">${t("Registration is closed.")}</div>`}`}
  else if(S.atab==="forgot"){
   body=seg+`<h1 style="font-size:26px">${t("Reset your password")}</h1><p class="sub">${t("We will email you a link to choose a new password.")}</p>${msg}<form id="ff" style="margin-top:16px">${fld("em",t("Email"),"","email",'required autocomplete="email"')}<button class="btn pri" style="width:100%">${t("Send link")}</button></form><p style="margin-top:14px"><button class="lnk" data-atab="login">${t("Back to log in")}</button></p>`}
  else{
   body=seg+`<h1 style="font-size:26px">${t("Log in")}</h1><p class="sub">${t("Use the email and password you registered with.")}</p>${msg}<form id="lf" style="margin-top:16px">${fld("em",t("Email"),"","email",'required autocomplete="email"')}${fld("pw",t("Password"),"","password",'required autocomplete="current-password"')}<button class="btn pri" style="width:100%">${t("Log in")}</button></form><p style="margin-top:14px"><button class="lnk" data-atab="forgot">${t("Forgot your password?")}</button></p>`}}
 $("#main").innerHTML=`<div class="panel auth"><div class="aside"><div><div class="eyebrow">${sch().full}</div><h2>${t("Your reading shelf, wherever you are.")}</h2><p class="sub">${t("Reserve books, keep a shelf and see your borrowing history.")}</p></div><span class="sub">${t("Books are handed out at the library desk.")}</span></div><div class="form">${body}</div></div>`;
 const bind=(id,fn)=>{const f=$(id);if(f)f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector("button:not([type])");if(b)b.disabled=true;try{await fn()}finally{if(b)b.disabled=false}}};
 bind("#lf",async()=>{const {error}=await sb.auth.signInWithPassword({email:$("#em").value.trim(),password:$("#pw").value});
  if(error){S.msg={text:errText(error),bad:true};viewLogin();return}S.msg=null;await refresh();location.hash="home"});
 bind("#ff",async()=>{const {error}=await sb.auth.resetPasswordForEmail($("#em").value.trim(),{redirectTo:location.origin+location.pathname});
  S.msg=error?{text:errText(error),bad:true}:{text:"If that email is registered, a reset link is on its way."};viewLogin()});
 bind("#nf",async()=>{const {error}=await sb.auth.updateUser({password:$("#pw").value});
  if(error){toast(errText(error));return}S.recovery=false;toast(t("Password changed"));await refresh();location.hash="home"});
 bind("#rf",async()=>{
  const role=S.rrole,d={first_name:$("#fn").value.trim(),last_name:$("#ln").value.trim(),role,grade:role==="teacher"?"":$("#gr").value};
  const email=$("#em").value.trim(),password=$("#pw").value,sc=$("#sc")?$("#sc").value.trim():"";
  if(!d.first_name||!d.last_name||(role==="student"&&!CLASSES.includes(d.grade)))return;
  if(S.reg.code_required){let ok=false;try{ok=await rpc("check_school_code",{p_code:sc})}catch(_){}if(!ok){S.rf={...d,first:d.first_name,last:d.last_name,email};S.msg={text:"Wrong school code.",bad:true};viewLogin();return}d.school_code=sc}
  const {data,error}=await sb.auth.signUp({email,password,options:{data:d,emailRedirectTo:location.origin+location.pathname}});
  if(error){S.rf={...d,first:d.first_name,last:d.last_name,email};S.msg={text:errText(error),bad:true};viewLogin();return}
  if(data.user&&data.user.identities&&!data.user.identities.length){S.msg={text:"This email is already registered.",bad:true};viewLogin();return}
  S.rf={};
  if(data.session){S.msg=null;await refresh();toast(t("Welcome! Your ID is {c}",{c:S.me?S.me.code:""}));location.hash="profile"}
  else{S.atab="login";S.msg={text:"Account created. Check your email and confirm it, then log in."};viewLogin()}});
}
function paintLogin(){if(document.activeElement&&/^(fn|ln|gr|em|pw|sc)$/.test(document.activeElement.id))return;viewLogin()}
document.addEventListener("click",e=>{const x=e.target.closest("[data-atab]");if(x){S.atab=x.dataset.atab;S.msg=null;viewLogin()}
 const r=e.target.closest("[data-rrole]");if(r){S.rf={last:($("#ln")||{}).value||"",first:($("#fn")||{}).value||"",email:($("#em")||{}).value||""};S.rrole=r.dataset.rrole;viewLogin()}});

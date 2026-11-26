"use strict";
/* ---------- admin (sidebar only for staff; Admins and Settings only for admins) ---------- */
const AT=[["overview","Overview"],["loans","Loans"],["holds","Reservations"],["books","Books"],["students","Users"],["admins","Admins",1],["reports","Reports"],["settings","Settings",1]];
const tabsFor=()=>AT.filter(x=>!x[2]||S.admin);
const SEARCHABLE=["books","students","loans"];
function viewAdmin(){
 if(!S.staff){$("#main").innerHTML=S.uid&&!S.loaded?`<p class="sub">${t("Loading…")}</p>`:`<div class="empty"><h3>${t("Admin access needed")}</h3>${t("Only library staff can open this page.")}</div>`;return}
 if(!tabsFor().some(x=>x[0]===S.tab))S.tab="overview";
 const add={loans:["checkout","Check out a book"],books:["addbook","Add book"],students:["addstu","Add user"],admins:["addadm","Add admin"]}[S.tab];
 $("#main").innerHTML=`<div class="adm"><aside class="side" id="side"></aside><section style="min-width:0"><div class="head"><div><h1>${t(AT.find(x=>x[0]===S.tab)[1])}</h1><p class="sub" id="asum"></p></div></div>
 <div class="tools">${SEARCHABLE.includes(S.tab)?`<div class="search" style="max-width:300px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="sq" type="search" placeholder="${t("Search")}" value="${esc(S.sq)}"></div>`:""}
 ${S.tab==="students"?`<select id="rolef" aria-label="${t("Role")}">${["all","student","teacher","librarian","admin"].map(r=>`<option value="${r}" ${S.rolef===r?"selected":""}>${r==="all"?t("All roles"):t({student:"Student",teacher:"Teacher",librarian:"Librarian",admin:"Admin"}[r])}</option>`).join("")}</select>`:""}
 <span class="spacer"></span>
 ${S.tab==="books"?`<button class="btn" data-act="exportbooks">${t("Export CSV")}</button><button class="btn" data-act="importbooks">${t("Import CSV / Excel")}</button>`:""}${S.tab==="loans"?`<button class="btn" data-act="exportloans">${t("Export CSV")}</button>`:""}${S.tab==="students"?`<button class="btn" data-act="exportusers">${t("Export CSV")}</button>`:""}
 ${add&&!(S.tab==="admins"&&!S.admin)?`<button class="btn pri" data-act="${add[0]}">${t(add[1])}</button>`:""}</div>
 <div id="alist"></div></section></div>`;
 const q=$("#sq");if(q)q.oninput=e=>{S.sq=e.target.value;paintAdmin()};
 const r=$("#rolef");if(r)r.onchange=e=>{S.rolef=e.target.value;paintAdmin()};
 paintAdmin();
}
const loanRows=L=>`<table><thead><tr><th>${t("Book")}</th><th>${t("Borrower")}</th><th>${t("Borrowed")}</th><th>${t("Status")}</th><th></th></tr></thead><tbody>${L.map(l=>{const b=bookOf(l.bookId),s=stuOf(l.studentId);
 return `<tr><td>${b?`<a href="#book-${b.id}" style="color:inherit">${esc(b.title)}</a>`:esc(t("Removed book"))}</td><td><b>${esc(sname(s))}</b><div class="mono ca">${s?esc(code(s))+(who(s)?" · "+esc(who(s)):""):""}</div></td><td>${fmt(l.out)}</td><td>${l.returnedAt?`<span class="pill">${t("Returned {d}",{d:fmt(l.returnedAt)})}</span>`:`<span class="pill warn">${t("On loan")}</span>`}</td><td class="r">${l.returnedAt?"":`<button class="btn sm" data-act="return" data-l="${l.id}">${t("Mark returned")}</button>`}</td></tr>`}).join("")}</tbody></table>`;
const H=(s,first)=>`<h2 style="font-size:17px;margin:${first?0:24}px 0 10px">${t(s)}</h2>`;
function paintAdmin(){
 if(route!=="admin"||!S.staff||!$("#alist"))return;
 const act=S.loans.filter(l=>!l.returnedAt),sus=S.users.filter(banned),copies=S.books.reduce((n,b)=>n+b.total,0);
 $("#side").innerHTML=`<h4>${t("Library admin")}</h4>${tabsFor().map(([k,n])=>`<a href="#admin${k==="overview"?"":"-"+k}" ${S.tab===k?'aria-current="page"':""}>${t(n)}${k==="loans"&&act.length?`<span class="pill">${act.length}</span>`:""}${k==="holds"&&S.holds.length?`<span class="pill warn">${S.holds.length}</span>`:""}${k==="students"?`<span class="pill">${S.users.length}</span>`:""}</a>`).join("")}`;
 $("#asum").innerHTML=S.tab==="overview"||S.tab==="books"||S.tab==="students"?t("{a} titles · {b} on loan · {d} users · {e} suspended",{a:`<b>${S.books.length}</b>`,b:`<b>${act.length}</b>`,d:`<b>${S.users.length}</b>`,e:`<b>${sus.length}</b>`}):"";
 const q=S.sq.trim().toLowerCase(),A=$("#alist");let h="";
 if(S.tab==="overview"){
  h=`<div class="stat"><div><b>${S.books.length}</b><span>${t("Titles")}</span></div><div><b>${copies}</b><span>${t("Copies")}</span></div><div><b>${act.length}</b><span>${t("On loan now")}</span></div><div><b>${S.holds.length}</b><span>${t("Reservations")}</span></div><div><b>${S.users.length}</b><span>${t("Users")}</span></div><div><b>${sus.length}</b><span>${t("Suspended")}</span></div></div>`;
  h+=H("On loan now",1)+`<div class="panel tw">${act.length?loanRows(act.slice(0,10)):empty("Nothing on loan","No books are currently borrowed.")}</div>`+(act.length>10?`<p class="sub"><a href="#admin-loans">${t("See all loans")}</a></p>`:"");
  h+=H("Suspended users")+`<div class="panel">${sus.length?sus.map(s=>`<div class="loan" style="cursor:default"><div><b>${esc(sname(s))}</b><div class="ca">${esc(s.reason||t("No reason noted"))}</div></div><button class="btn sm" data-act="ban" data-s="${s.id}">${t("Reinstate")}</button></div>`).join(""):empty("No suspended users","Everyone can borrow.")}</div>`}
 if(S.tab==="loans"){
  const L=S.loans.filter(l=>!q||((bookOf(l.bookId)||{}).title||"").toLowerCase().includes(q)||(sname(stuOf(l.studentId))+" "+(stuOf(l.studentId)||{}).code).toLowerCase().includes(q));
  const shown=L.slice(0,150);
  h=`<div class="panel tw">${shown.length?loanRows(shown):empty("No loans yet","Use Check out a book when someone borrows something.")}</div>`+(L.length>150?`<p class="sub">${t("Showing the latest 150. Use search or export for the rest.")}</p>`:"")}
 if(S.tab==="holds"){
  const byBook={};S.holds.forEach(x=>(byBook[x.bookId]=byBook[x.bookId]||[]).push(x));
  const rows=[];Object.entries(byBook).forEach(([bid,L])=>L.forEach((x,i)=>rows.push({x,i,b:bookOf(bid)})));
  rows.sort((a,b)=>((a.b||{}).title||"").localeCompare((b.b||{}).title||"")||a.i-b.i);
  h=`<div class="panel tw">${rows.length?`<table><thead><tr><th>${t("Book")}</th><th>${t("Queue place")}</th><th>${t("Borrower")}</th><th>${t("Status")}</th><th></th></tr></thead><tbody>${rows.map(({x,i,b})=>{const s=stuOf(x.userId),ready=b&&avail(b)>i;
   return `<tr><td>${b?esc(b.title):""}</td><td>${i+1}</td><td><b>${esc(sname(s))}</b><div class="mono ca">${s?esc(code(s))+(who(s)?" · "+esc(who(s)):""):""}</div></td><td>${ready?`<span class="pill ok">${t("Copy ready")}</span>`:`<span class="pill">${t("Waiting")}</span>`}</td><td class="r"><div class="row">${ready?`<button class="btn sm pri" data-act="holdout" data-b="${x.bookId}" data-s="${x.userId}">${t("Check out")}</button>`:""}<button class="btn sm" data-act="rmhold" data-h="${x.id}">${t("Remove")}</button></div></td></tr>`}).join("")}</tbody></table>`:empty("No reservations","Readers can reserve a book when every copy is out.")}</div>`}
 if(S.tab==="books"){
  const L=S.books.filter(b=>!q||(b.title+b.author+(b.genre||"")+(b.isbn||"")).toLowerCase().includes(q)).sort((a,b)=>a.title.localeCompare(b.title));
  h=`<div class="panel tw">${L.length?`<table><thead><tr><th>${t("Title")}</th><th>${t("Language")}</th><th>${t("Genre")}</th><th>${t("Free / total")}</th><th>${t("Borrowed by")}</th><th></th></tr></thead><tbody>${L.slice(0,200).map(b=>`<tr><td><b>${esc(b.title)}</b><div class="ca">${esc(b.author)}</div></td><td>${lname(blang(b))}</td><td>${esc(t(b.genre||""))}</td><td><span class="pill ${avail(b)?"ok":"bad"}">${avail(b)} / ${b.total}</span></td><td>${out(b.id).map(l=>`<div class="ca" style="white-space:normal">${esc(sname(stuOf(l.studentId)))}</div>`).join("")||'<span class="ca">-</span>'}</td><td class="r"><div class="row"><button class="btn sm" data-act="openbook" data-b="${b.id}">${t("Open")}</button><button class="btn sm" data-act="editbook" data-b="${b.id}">${t("Edit")}</button><button class="btn sm dng" data-act="delbook" data-b="${b.id}">${t("Delete")}</button></div></td></tr>`).join("")}</tbody></table>`:empty("No books found","Add one with the button above.")}</div>`+(L.length>200?`<p class="sub">${t("Showing 200. Use search to narrow the list.")}</p>`:"")}
 if(S.tab==="students"){
  const L=S.users.filter(s=>(S.rolef==="all"||s.role===S.rolef)&&(!q||(s.first+" "+s.last+" "+s.code+" "+(s.grade||"")+" "+(s.email||"")+" "+s.role).toLowerCase().includes(q))).sort((a,b)=>a.last.localeCompare(b.last)||a.first.localeCompare(b.first));
  h=`<div class="panel tw">${L.length?`<table><thead><tr><th>${t("Surname")}</th><th>${t("First name")}</th><th>${t("Role")}</th><th>${t("ID")}</th><th>${t("Class")}</th><th>${t("Joined")}</th><th>${t("Out / total")}</th><th>${t("Status")}</th><th></th></tr></thead><tbody>${L.slice(0,200).map(s=>{const mine=S.loans.filter(l=>l.studentId===s.id);return `<tr><td><b>${esc(s.last)}</b></td><td><b>${esc(s.first)}</b></td><td><span class="pill ${["admin","librarian"].includes(s.role)?"ok":""}">${roleName(s)}</span></td><td><span class="id">${esc(code(s))}</span></td><td>${esc(s.grade||"-")}</td><td>${fmt(s.joined)}</td><td>${mine.filter(l=>!l.returnedAt).length} / ${mine.length}</td><td>${banned(s)?`<span class="pill bad">${t("Suspended")}</span>`:`<span class="pill ok">${t("Active")}</span>`}</td><td class="r"><div class="row"><button class="btn sm" data-act="stu" data-s="${s.id}">${t("Details")}</button>${s.owner?`<span class="pill ok">${t("Primary admin")}</span>`:`<button class="btn sm" data-act="${banned(s)?"ban":"banform"}" data-s="${s.id}">${t(banned(s)?"Reinstate":"Suspend")}</button>${S.admin&&s.id!==(S.me||{}).id?`<button class="btn sm dng" data-act="delstu" data-s="${s.id}">${t("Remove")}</button>`:""}`}</div></td></tr>`}).join("")}</tbody></table>`:empty("No users found","Users can register themselves, or you can add one here.")}</div>`+(L.length>200?`<p class="sub">${t("Showing 200. Use search to narrow the list.")}</p>`:"")}
 if(S.tab==="admins"){
  const L=S.users.filter(s=>["admin","librarian"].includes(s.role)).sort((a,b)=>a.role.localeCompare(b.role)||a.last.localeCompare(b.last));
  h=`<div class="note" style="background:var(--surface2);color:var(--mute)">${t("Admins can do everything. Librarians can lend, return and manage books and users, but cannot change roles or settings.")}</div><div class="panel tw"><table><thead><tr><th>${t("Name")}</th><th>${t("Email")}</th><th>${t("Role")}</th><th></th></tr></thead><tbody>${L.map(s=>`<tr><td><b>${esc(sname(s))}</b><div class="mono ca">${esc(code(s))}</div></td><td>${esc(s.email||"-")}</td><td><span class="pill ok">${roleName(s)}</span></td><td class="r"><div class="row">${s.owner?`<span class="pill ok">${t("Primary admin")}</span>`:`<button class="btn sm" data-act="chrole" data-s="${s.id}">${t("Change role")}</button>`}</div></td></tr>`).join("")}</tbody></table></div>`}
 if(S.tab==="reports")h=reports();
 if(S.tab==="settings"){const st=S.settings||{max_loans:3,registration_open:true,school_code:""};
  h=`<form class="panel pad" id="sf" style="max-width:520px"><div class="field"><label for="ml">${t("Books one person can borrow at once")}</label><input id="ml" type="number" min="0" max="50" value="${+st.max_loans}" style="max-width:120px"></div>
  <label class="chk"><input id="ro" type="checkbox" ${st.registration_open?"checked":""}> ${t("Allow new people to register")}</label>
  ${fld("sc",t("School code"),st.school_code,"text",'autocomplete="off"')}<p class="sub" style="margin:-6px 0 14px">${t("If you set a school code, people need it to register. Leave it empty to let anyone register. Share the code only inside the school.")}</p><button class="btn pri">${t("Save settings")}</button></form>`}
 A.innerHTML=h;
}
function reports(){
 const now=new Date(),mon=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);mon.push({k:d.getFullYear()+"-"+d.getMonth(),n:0,l:(S.lang==="uz"?UM[d.getMonth()]:d.toLocaleDateString("en-GB",{month:"short"}))+" "+String(d.getFullYear()).slice(2)})}
 const gradeN={};
 S.loans.forEach(l=>{const d=new Date(l.out),m=mon.find(x=>x.k===d.getFullYear()+"-"+d.getMonth());if(m)m.n++;const s=stuOf(l.studentId);if(s&&s.grade)gradeN[s.grade]=(gradeN[s.grade]||0)+1});
 const bars=(rows)=>{const mx=Math.max(1,...rows.map(r=>r[1]));return `<div class="bars">${rows.map(([l,n])=>`<div><span>${esc(l)}</span><i style="width:${Math.max(2,n/mx*100)}%"></i><em>${n}</em></div>`).join("")}</div>`};
 const top=[...S.books].filter(b=>b.borrowN>0).sort((a,b)=>b.borrowN-a.borrowN).slice(0,8).map(b=>[b.title,b.borrowN]);
 const gr=Object.entries(gradeN).sort((a,b)=>b[1]-a[1]).slice(0,8);
 const lc={uz:0,en:0,ru:0};S.books.forEach(b=>lc[blang(b)]++);
 return H("Loans per month",1)+`<div class="panel">${bars(mon.map(m=>[m.l,m.n]))}</div>`+H("Most borrowed books")+`<div class="panel">${top.length?bars(top):empty("No data yet","Reports fill in as books are borrowed.")}</div>`+H("Loans by class")+`<div class="panel">${gr.length?bars(gr):empty("No data yet","Reports fill in as books are borrowed.")}</div>`+H("Books by language")+`<div class="panel">${bars(LANGS.map(l=>[lname(l),lc[l]]))}</div>`;
}

/* ---------- layers + forms ---------- */
function openLayer(html,mid){const l=$("#layer");l.innerHTML=`<div class="ov${mid?" mid":""}"><div class="sheet" role="dialog" aria-modal="true"><button class="x" aria-label="${t("Close")}" data-close>×</button>${html}</div></div>`;
 l.onclick=e=>{if(e.target.matches("[data-close]")||e.target.classList.contains("ov"))closeLayer()};const f=l.querySelector("input,select,textarea");f&&f.focus()}
function closeLayer(){const l=$("#layer");if(l)l.innerHTML=""}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLayer()});
const btns=ok=>`<div class="row"><button type="button" class="btn" data-close>${t("Cancel")}</button><button class="btn pri">${t(ok)}</button></div>`;
function bookForm(id){const b=id?bookOf(id):{};
 openLayer(`<h2>${t(id?"Edit book":"Add a book")}</h2><form id="f" style="margin-top:16px">${fld("t",t("Title"),b.title,"text","required")}${fld("a",t("Author"),b.author,"text","required")}
 <div class="two">${fld("g",t("Genre"),b.genre,"text",'list="gl"')}<div class="field"><label for="bl">${t("Book language")}</label><select id="bl">${LANGS.map(l=>`<option value="${l}" ${blang(b)===l?"selected":""}>${lname(l)}</option>`).join("")}</select></div></div>
 <datalist id="gl">${[...new Set(S.books.map(x=>x.genre).filter(Boolean))].map(g=>`<option value="${esc(g)}">`).join("")}</datalist>
 <div class="two">${fld("y",t("Year"),b.year,"text",'maxlength="10"')}${fld("n",t("Copies owned"),b.total??1,"number",`min="${id?Math.max(1,out(id).length):1}" required`)}</div>
 <div class="two">${fld("sh",t("Shelf"),b.shelf)}${fld("is","ISBN",b.isbn)}</div><div class="field"><label for="cf">${t("Cover image")}</label><div class="covbox"><div class="cover mini" id="cp" style="background:hsl(${hue(b.title||"x")} 32% 30%)">${safeUrl(b.cover)?`<img src="${esc(safeUrl(b.cover))}" alt="">`:""}</div><div><input id="cf" type="file" accept="image/jpeg,image/png,image/webp" style="height:auto;padding:8px"><div class="ca">${t("Upload a photo of the cover, or paste a link below.")}</div></div></div></div>${fld("cu",t("Cover image link (optional)"),b.cover,"url",'placeholder="https://"')}
 <div class="field"><label for="d">${t("Description")}</label><textarea id="d">${esc(b.desc||"")}</textarea></div>${btns("Save")}</form>`,true);
 $("#f").onsubmit=async e=>{e.preventDefault();const d={title:$("#t").value.trim(),author:$("#a").value.trim(),genre:$("#g").value.trim(),lang:$("#bl").value,year:$("#y").value.trim()||null,total:Math.max(1,+$("#n").value||1),shelf:$("#sh").value.trim()||null,isbn:$("#is").value.trim()||null,cover_url:safeUrl($("#cu").value.trim())||null,description:$("#d").value.trim()};
  if(id&&d.total<out(id).length){toast(t("More copies are out than that."));return}
  const old=id?b.cover:null;
  act(async()=>{if(blob)d.cover_url=await uploadCover(blob);await must(id?sb.from("books").update(d).eq("id",id):sb.from("books").insert(d));if(old&&old!==d.cover_url)dropCover(old)},"Book saved",true)}
 let blob=null;$("#cf").onchange=async e=>{const f=e.target.files[0];blob=null;if(!f)return;
  try{blob=await prepCover(f);const u=URL.createObjectURL(blob);$("#cp").innerHTML=`<img src="${u}" alt="">`;$("#cu").value=""}catch(x){e.target.value="";toast(x.message||t("Could not read that image."))}}
 $("#cu").oninput=e=>{if(blob){blob=null;$("#cf").value=""}const u=safeUrl(e.target.value.trim());$("#cp").innerHTML=u?`<img src="${esc(u)}" alt="">`:""}}
function stuForm(){openLayer(`<h2>${t("Add a user")}</h2><form id="f" style="margin-top:16px"><div class="field"><label for="rl">${t("Role")}</label><select id="rl"><option value="student">${t("Student")}</option><option value="teacher">${t("Teacher")}</option></select></div><div id="pf">${personFields("student")}</div>
 <p class="sub">${t("This creates a library record with an ID for the desk. The person can register on the site themselves to log in.")}</p>${btns("Create")}</form>`,true);
 $("#rl").onchange=e=>{const v={last:$("#ln").value,first:$("#fn").value};$("#pf").innerHTML=personFields(e.target.value,v)};
 $("#f").onsubmit=async e=>{e.preventDefault();const role=$("#rl").value;let c="";
  if(await act(async()=>{c=await rpc("staff_add_user",{p_role:role,p_first:$("#fn").value.trim(),p_last:$("#ln").value.trim(),p_grade:role==="teacher"?null:$("#gr").value})},null,true))toast(t("Created. ID: {c}",{c}))}}
function banForm(sid){const s=stuOf(sid);openLayer(`<h2>${t("Suspend {n}",{n:esc(sname(s))})}</h2><form id="f" style="margin-top:16px"><div class="field"><label for="rs">${t("Reason (shown to the person)")}</label><textarea id="rs" maxlength="200"></textarea></div>${btns("Suspend")}</form>`,true);
 $("#f").onsubmit=async e=>{e.preventDefault();act(()=>rpc("staff_set_ban",{p_user:sid,p_banned:true,p_reason:$("#rs").value.trim()}),"Suspended",true)}}
function roleForm(sid){const s=sid?stuOf(sid):null,cand=S.users.filter(u=>!u.banned).sort((a,b)=>a.last.localeCompare(b.last));
 openLayer(`<h2>${t(s?"Change role":"Add an admin")}</h2><form id="f" style="margin-top:16px">${s?`<p><b>${esc(sname(s))}</b> · ${esc(s.email||code(s))}</p>`:`<div class="field"><label for="ru">${t("Person")}</label><input id="ru" list="ul" required placeholder="${t("Type a name or ID")}" autocomplete="off"><datalist id="ul">${cand.filter(u=>u.role!=="admin").map(u=>`<option value="${esc(code(u)+" · "+u.last+" "+u.first)}">`).join("")}</datalist></div>`}
 <div class="field"><label for="ro">${t("Role")}</label><select id="ro">${["admin","librarian","teacher","student"].map(r=>`<option value="${r}" ${(s?s.role:"admin")===r?"selected":""}>${t({student:"Student",teacher:"Teacher",librarian:"Librarian",admin:"Admin"}[r])}</option>`).join("")}</select></div>${btns("Save")}</form>`,true);
 $("#f").onsubmit=async e=>{e.preventDefault();let id=sid;if(!id){const c=($("#ru").value||"").split(" ")[0],u=S.users.find(x=>x.code===c);if(!u){toast(t("Choose a person from the list."));return}id=u.id}
  act(()=>rpc("admin_set_role",{p_user:id,p_role:$("#ro").value}),"Role saved",true)}}
const label={u:s=>`${s.code} · ${s.last} ${s.first}${s.grade?" · "+s.grade:""}`,b:b=>`${b.title} — ${b.author} (${lname(blang(b))})`};
function checkoutForm(bid,sid){const ss=S.users.filter(s=>!banned(s)).sort((a,b)=>a.last.localeCompare(b.last)),bs=S.books.filter(b=>avail(b)>0).sort((a,b)=>a.title.localeCompare(b.title));
 const sel=(id,l,L,fn,v)=>`<div class="field"><label for="${id}">${l}</label><input id="${id}" list="${id}l" required autocomplete="off" placeholder="${t("Start typing…")}" value="${esc(v?fn(v):"")}"><datalist id="${id}l">${L.map(x=>`<option value="${esc(fn(x))}">`).join("")}</datalist></div>`;
 openLayer(`<h2>${t("Check out a book")}</h2><form id="f" style="margin-top:16px">${sel("cs",t("Borrower"),ss,label.u,sid&&stuOf(sid))}${sel("cb",t("Book"),bs,label.b,bid&&bookOf(bid))}<p class="sub">${t("There is no due date. The book stays with the borrower until it is returned.")}</p>${btns("Check out")}</form>`,true);
 $("#f").onsubmit=async e=>{e.preventDefault();const s=ss.find(x=>label.u(x)===$("#cs").value.trim()||x.code===$("#cs").value.trim().toUpperCase()),b=bs.find(x=>label.b(x)===$("#cb").value.trim());
  if(!s||!b){toast(t("Choose from the lists."));return}
  act(()=>rpc("staff_checkout",{p_book:b.id,p_user:s.id}),"Checked out",true)}}
function stuView(sid){const s=stuOf(sid);if(!s)return;const L=S.loans.filter(l=>l.studentId===sid);
 const kv=[["Surname",s.last],["First name",s.first],["Role",roleName(s)],["ID",code(s)],["Class",s.grade||"-"],["Email",s.email||"-"],["Joined",fmt(s.joined)||"-"],["Account",t(s.authId?"Has a login":"Desk record only")],["Status",banned(s)?t("Suspended")+(s.reason?": "+s.reason:""):t("Active")]];
 openLayer(`<h2>${esc(sname(s))}</h2><div class="kv" style="margin:14px 0">${kv.map(([k,v])=>`<span>${t(k)}</span><b style="overflow-wrap:anywhere">${esc(v)}</b>`).join("")}</div><h3 style="font-size:16px;margin:18px 0 6px">${t("Book history")}</h3>${L.length?L.map(l=>{const b=bookOf(l.bookId);return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${esc(b?b.title:t("Removed book"))}</b><div class="ca">${fmt(l.out)} → ${l.returnedAt?fmt(l.returnedAt):t("now")}</div></div>`}).join(""):`<p class="sub">${t("No books borrowed yet.")}</p>`}`)}

/* ---------- CSV ---------- */
const csvCell=v=>{v=String(v??"");if(/^[=+\-@\t\r]/.test(v)&&isNaN(v))v="'"+v;return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const csvOut=(name,rows)=>{const txt="﻿"+rows.map(r=>r.map(csvCell).join(",")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/csv;charset=utf-8"}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
function csvParse(s){const rows=[];let r=[],c="",q=false;s=s.replace(/^﻿/,"");for(let i=0;i<s.length;i++){const ch=s[i];
 if(q){if(ch==='"'){if(s[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
 else if(ch==='"')q=true;else if(ch===","||ch===";"){r.push(c);c=""}else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&s[i+1]==="\n")i++;r.push(c);c="";if(r.some(x=>x!==""))rows.push(r);r=[]}else c+=ch}
 r.push(c);if(r.some(x=>x!==""))rows.push(r);return rows}
const BCOLS=["title","author","genre","language","year","copies","shelf","isbn","cover_url","description"];

/* ---------- events ---------- */
const sure=(a,label,f)=>{if(a.dataset.sure)return f();a.dataset.sure=1;a.textContent=t("Sure?");setTimeout(()=>{a.dataset.sure="";a.textContent=t(label)},3000)};
document.addEventListener("click",async e=>{
 const c=e.target.closest("[data-book]");if(c){location.hash="book-"+c.dataset.book;return}
 const g=e.target.closest("[data-genre]");if(g){S.genre=g.dataset.genre;S.q="";S.only=false;S.blang="all";location.hash="catalog";return}
 const a=e.target.closest("[data-act]");if(!a)return;const d=a.dataset;
 switch(d.act){
  case"hold":act(()=>rpc("place_hold",{p_book:d.b}),"Reserved");break;
  case"unhold":act(()=>rpc("cancel_hold",{p_book:d.b}),"Reservation cancelled");break;
  case"delrev":act(()=>rpc("delete_review",{p_id:d.r}),"Review deleted").then(loadReviews);break;
  case"logout":await sb.auth.signOut();location.hash="home";await refresh();break;
  case"editme":meForm();break;case"chpw":pwForm();break;
  case"checkout":checkoutForm(d.b);break;case"addbook":bookForm();break;case"editbook":bookForm(d.b);break;case"addstu":stuForm();break;case"addadm":roleForm();break;case"chrole":roleForm(d.s);break;case"stu":stuView(d.s);break;case"banform":banForm(d.s);break;case"openbook":location.hash="book-"+d.b;break;case"importbooks":importBooks();break;
  case"holdout":act(()=>rpc("staff_checkout",{p_book:d.b,p_user:d.s}),"Checked out");break;
  case"rmhold":act(()=>rpc("staff_remove_hold",{p_hold:d.h}),"Removed");break;
  case"return":act(()=>rpc("staff_return",{p_loan:d.l}),"Marked returned");break;
  case"ban":act(()=>rpc("staff_set_ban",{p_user:d.s,p_banned:false,p_reason:null}),"Reinstated");break;
  case"delbook":if(out(d.b).length)toast(t("Copies are still on loan."));else sure(a,"Delete",()=>act(()=>must(sb.from("books").delete().eq("id",d.b)),"Book deleted"));break;
  case"delstu":sure(a,"Remove",()=>act(()=>rpc("admin_delete_user",{p_user:d.s}),"User removed"));break;
  case"csvtemplate":csvOut("books-template.csv",[BCOLS,["The Little Prince","Antoine de Saint-Exupéry","Fiction","en","1943","2","A-1","9780156012195","","A prince visits Earth."],["O'tkan kunlar","Abdulla Qodiriy","Novel","uz","1926","5","B-2","","",""]]);break;
  case"exportbooks":csvOut("books.csv",[BCOLS,...S.books.map(b=>[b.title,b.author,b.genre,blang(b),b.year,b.total,b.shelf,b.isbn,b.cover,b.desc])]);break;
  case"exportusers":csvOut("users.csv",[["code","surname","first_name","role","class","email","status"],...S.users.map(s=>[s.code,s.last,s.first,s.role,s.grade,s.email,banned(s)?"suspended":"active"])]);break;
  case"exportloans":csvOut("loans.csv",[["book","borrower","code","class","borrowed","returned"],...S.loans.map(l=>{const b=bookOf(l.bookId),s=stuOf(l.studentId);return [b?b.title:"",s?sname(s):"",s?s.code:"",s?s.grade:"",l.out,l.returnedAt||""]})]);break}
});
document.addEventListener("submit",e=>{if(e.target.id!=="sf")return;e.preventDefault();
 act(()=>rpc("admin_save_settings",{p_max_loans:+$("#ml").value,p_registration_open:$("#ro").checked,p_school_code:$("#sc").value.trim()}),"Settings saved")});

/* ---------- routing + boot ---------- */
const MOUNT={catalog:viewCatalog,admin:viewAdmin,login:viewLogin,book:()=>{paintBook();loadReviews()}},PAINT={home:paintHome,catalog:paintCatalog,book:paintBook,list:paintList,profile:paintProfile,login:paintLogin,admin:paintAdmin};
function go(){const h=(location.hash||"#home").slice(1),prev=route;
 if(h.startsWith("book-")){route="book";if(S.bid!==h.slice(5)){S.bid=h.slice(5);S.reviews=[];S.revFor=""}}
 else if(h==="admin"||h.startsWith("admin-")){route="admin";S.tab=AT.some(x=>x[0]===h.slice(6))?h.slice(6):"overview"}
 else route=["home","catalog","list","profile","login"].includes(h)?h:"home";
 if(prev!==route||route==="admin"||route==="book")scrollTo(0,0);
 if(route!=="admin")S.sq="";
 if(route==="login"&&prev!=="login"){S.atab="login";S.msg=null}
 header();closeLayer();(MOUNT[route]||PAINT[route])()}
let raf=0;
function repaint(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{header();
 const ae=document.activeElement,typing=ae&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)&&ae.closest("#main")&&!["catalog","admin"].includes(route);
 if($("#layer").firstChild||typing)return;
 if(route==="admin"&&!$("#alist"))viewAdmin();else PAINT[route]()})}
function setup(){$("#main").innerHTML=`<div class="panel pad setup"><h1 style="font-size:24px">${t("Almost ready")}</h1><p>Open <code>site/config.js</code> and paste your Supabase project URL and anon key. Steps are in <code>DEPLOY.md</code>.</p></div>`}
addEventListener("hashchange",go);
document.documentElement.lang=S.lang;document.title=sch().short+" "+t("Library");
if(!sb){header();setup()}
else{
 go();
 sb.auth.onAuthStateChange((ev)=>{if(ev==="PASSWORD_RECOVERY"){S.recovery=true;location.hash="login";viewLogin()}else if(ev==="SIGNED_IN"||ev==="SIGNED_OUT"){setTimeout(refresh,0)}});
 refresh();
 setInterval(()=>{if(!document.hidden&&!$("#layer").firstChild)refresh()},60000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden&&!$("#layer").firstChild)refresh()});
}

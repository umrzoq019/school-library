"use strict";
/* Book import (CSV or Excel .xlsx) and cover-image upload. Staff only; the database enforces that. */

/* ---------- minimal .xlsx reader (zip + XML, no library) ---------- */
async function unzip(buf){
 const dv=new DataView(buf),u8=new Uint8Array(buf);let e=-1;
 for(let i=u8.length-22;i>=Math.max(0,u8.length-65558);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
 if(e<0)throw new Error("zip");
 const n=dv.getUint16(e+10,true),dec=new TextDecoder(),files={};let p=dv.getUint32(e+16,true);
 for(let k=0;k<n;k++){
  if(dv.getUint32(p,true)!==0x02014b50)throw new Error("zip");
  const m=dv.getUint16(p+10,true),cs=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
  files[dec.decode(u8.subarray(p+46,p+46+nl))]={m,cs,lo};p+=46+nl+xl+cl}
 return async name=>{const f=files[name];if(!f)return null;
  const s=f.lo+30+dv.getUint16(f.lo+26,true)+dv.getUint16(f.lo+28,true),d=u8.subarray(s,s+f.cs);
  if(f.m===0)return dec.decode(d);
  if(f.m!==8)throw new Error("zip");
  return new Response(new Blob([d]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text()}}
const xmlDoc=s=>new DOMParser().parseFromString(s,"application/xml");
const colIdx=ref=>{let n=0;for(const ch of ref.replace(/[^A-Z]/gi,"").toUpperCase())n=n*26+ch.charCodeAt(0)-64;return n-1};
const textOf=el=>[...el.getElementsByTagName("t")].filter(x=>x.parentNode.nodeName!=="rPh").map(x=>x.textContent).join("");
async function xlsxRows(buf){
 const get=await unzip(buf),wbx=await get("xl/workbook.xml"),rel=await get("xl/_rels/workbook.xml.rels");
 if(!wbx||!rel)throw new Error("xlsx");
 const sh=xmlDoc(wbx).getElementsByTagName("sheet")[0];if(!sh)throw new Error("xlsx");
 const rid=sh.getAttribute("r:id")||sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id"),
  rl=[...xmlDoc(rel).getElementsByTagName("Relationship")].find(r=>r.getAttribute("Id")===rid);if(!rl)throw new Error("xlsx");
 const tg=rl.getAttribute("Target"),path=tg.startsWith("/")?tg.slice(1):"xl/"+tg.replace(/^\.\//,""),sx=await get(path);if(!sx)throw new Error("xlsx");
 const sst=await get("xl/sharedStrings.xml"),ss=sst?[...xmlDoc(sst).getElementsByTagName("si")].map(textOf):[],rows=[];
 for(const row of xmlDoc(sx).getElementsByTagName("row")){const r=[];
  for(const c of row.getElementsByTagName("c")){const ty=c.getAttribute("t"),v=c.getElementsByTagName("v")[0],i=colIdx(c.getAttribute("r")||"A1");
   r[i]=ty==="s"&&v?(ss[+v.textContent]||""):ty==="inlineStr"?textOf(c):v?v.textContent:""}
  for(let i=0;i<r.length;i++)r[i]=String(r[i]??"").trim();
  if(r.some(x=>x))rows.push(r)}
 return rows}

/* ---------- reading any supported file into rows of text ---------- */
async function fileRows(f){
 const name=f.name.toLowerCase();
 if(name.endsWith(".xls"))throw new Error("xls");
 if(name.endsWith(".xlsx")){try{return await xlsxRows(await f.arrayBuffer())}catch(e){throw new Error("xlsx")}}
 const b=await f.arrayBuffer();let s;
 try{s=new TextDecoder("utf-8",{fatal:true}).decode(b)}catch(e){s=new TextDecoder("windows-1251").decode(b)}
 return csvParse(s).map(r=>r.map(x=>x.trim()))}

/* ---------- column and value recognition ---------- */
const ALIAS={
 title:["title","name","book","book title","book name","nomi","kitob","kitob nomi","kitob nomi","название","наименование","книга"],
 author:["author","authors","writer","muallif","автор"],
 genre:["genre","category","subject","janr","kategoriya","жанр","категория"],
 lang:["lang","language","til","язык"],
 year:["year","published","publication year","year published","yil","год"],
 total:["total","copies","copy","number","count","qty","quantity","available","available copies","number of copies","copies owned","total copies","soni","nusxa","nusxalar","miqdor","количество","экземпляры"],
 shelf:["shelf","location","shelf location","javon","joy","полка"],
 isbn:["isbn","isbn13","isbn 13","isbn10","isbn 10"],
 cover_url:["cover","cover url","cover image","cover link","image","image url","muqova","rasm","обложка"],
 description:["description","summary","about","annotation","tavsif","описание"]};
const normH=s=>String(s||"").toLowerCase().replace(/[_\-]+/g," ").replace(/\s+/g," ").trim();
const colMap=H=>{const m={};H.forEach((h,i)=>{const k=normH(h);for(const f in ALIAS)if(!(f in m)&&ALIAS[f].includes(k))m[f]=i});return m};
const langCode=v=>{const s=String(v||"").toLowerCase().replace(/[’‘`ʻʼ]/g,"'").trim();if(!s)return "";
 if(/^(uz|o'z|oz|uzb|узб)/.test(s))return "uz";if(/^(en|eng|ing|анг)/.test(s))return "en";if(/^(ru|rus|рус)/.test(s))return "ru";return "?"};
const cleanIsbn=v=>{const s=String(v||"").replace(/[\s-]/g,"").toUpperCase();return /^(\d{9}[\dX]|\d{13})$/.test(s)?s:""};
const keyOf=(title,author)=>(title+"|"+author).toLowerCase().replace(/\s+/g," ").trim();
const coverFor=isbn=>`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

/* ---------- import dialog ---------- */
function importBooks(){
 openLayer(`<h2>${t("Import books")}</h2><p class="sub">${t("Upload a CSV or Excel (.xlsx) file. The first row must be a header. Only the title is required.")}</p>
 <p class="sub"><code>title, author, genre, language, year, copies, shelf, isbn, cover_url, description</code></p>
 <p><button class="lnk" data-act="csvtemplate">${t("Download a template")}</button></p>
 <div class="field"><input id="fi" type="file" accept=".csv,.xlsx,.txt,text/csv" style="height:auto;padding:8px"></div>
 <div id="opts" hidden>
  <div class="two"><div class="field"><label for="dl">${t("Language when the file has none")}</label><select id="dl">${["uz","en","ru"].map(l=>`<option value="${l}">${lname(l)}</option>`).join("")}</select></div>
  <div class="field"><label for="ex">${t("Books already in the library")}</label><select id="ex"><option value="skip">${t("Skip them")}</option><option value="update">${t("Update them (details and copies)")}</option></select></div></div>
  <label class="chk"><input type="checkbox" id="oc" checked> ${t("Find missing covers by ISBN (Open Library)")}</label></div>
 <div id="pv" class="sub" aria-live="polite"></div>
 <div class="row"><button type="button" class="btn" data-close>${t("Cancel")}</button><button class="btn pri" id="go" disabled>${t("Import")}</button></div>`,true);
 let R=null,P=null;
 const byIsbn=new Map(),byKey=new Map();
 S.books.forEach(b=>{const i=cleanIsbn(b.isbn);if(i)byIsbn.set(i,b);byKey.set(keyOf(b.title,b.author),b)});

 const plan=()=>{
  const H=R[0],M=colMap(H),dl=$("#dl").value,upd=$("#ex").value==="update",find=$("#oc").checked,warn=[],items=[],seen=new Set();
  if(!("title" in M))return {err:t("Could not find a Title column. Found: {c}",{c:H.filter(Boolean).join(", ")||"-"})};
  R.slice(1).forEach((r,k)=>{const n=k+2,g=f=>f in M?(r[M[f]]||"").trim():"";
   const title=g("title").slice(0,300);if(!title){if(r.some(x=>x))warn.push(t("Row {n}: no title, skipped",{n}));return}
   let lang=langCode(g("lang"));if(lang==="?"){warn.push(t("Row {n}: language “{v}” not recognised, using the default",{n,v:g("lang")}));lang=""}
   let isbn=cleanIsbn(g("isbn"));if(g("isbn")&&!isbn)warn.push(t("Row {n}: ISBN “{v}” is not valid, left empty",{n,v:g("isbn")}));
   const tot=parseInt(g("total"));if(g("total")&&!(tot>=1))warn.push(t("Row {n}: copies “{v}” is not a number, using 1",{n,v:g("total")}));
   const d={title,author:g("author").slice(0,200),genre:g("genre").slice(0,60),lang,year:g("year").replace(/\.0+$/,"").slice(0,10),total:tot>=1?Math.min(tot,1000):null,shelf:g("shelf").slice(0,40),isbn,cover:safeUrl(g("cover_url")),description:g("description").slice(0,2000)};
   const key=isbn||keyOf(d.title,d.author);if(seen.has(key)){warn.push(t("Row {n}: “{v}” appears twice in the file, skipped",{n,v:title}));return}seen.add(key);
   const ex=(isbn&&byIsbn.get(isbn))||byKey.get(keyOf(d.title,d.author))||null;
   items.push({n,d,ex,act:ex?(upd?"update":"skip"):"add"})});
  const cov=d=>d.cover||(find&&d.isbn?coverFor(d.isbn):null);
  items.forEach(it=>{const d=it.d;
   if(it.act==="add")it.row={title:d.title,author:d.author,genre:d.genre,lang:d.lang||dl,year:d.year||null,total:d.total||1,shelf:d.shelf||null,isbn:d.isbn||null,cover_url:cov(d),description:d.description};
   else if(it.act==="update"){const e=it.ex,u={};
    if(d.author)u.author=d.author;if(d.genre)u.genre=d.genre;if(d.lang)u.lang=d.lang;if(d.year)u.year=d.year;if(d.shelf)u.shelf=d.shelf;if(d.isbn)u.isbn=d.isbn;if(d.description)u.description=d.description;
    if(d.total)u.total=Math.max(d.total,out(e.id).length);
    const c=d.cover||(!e.cover?cov(d):null);if(c)u.cover_url=c;it.row=u}});
  return {items,warn}};

 const draw=()=>{P=plan();const pv=$("#pv");
  if(P.err){pv.textContent=P.err;$("#go").disabled=true;return}
  const a=P.items.filter(i=>i.act==="add").length,u=P.items.filter(i=>i.act==="update").length,s=P.items.filter(i=>i.act==="skip").length;
  pv.innerHTML=`<p><b>${t("{a} new, {u} to update, {s} already there.",{a,u,s})}</b></p>
   <div class="pvt"><table><thead><tr><th>${t("Title")}</th><th>${t("Author")}</th><th>${t("Language")}</th><th>${t("Copies")}</th><th>ISBN</th></tr></thead><tbody>${P.items.slice(0,6).map(i=>`<tr class="${i.act==="skip"?"dim":""}"><td>${esc(i.d.title)}</td><td>${esc(i.d.author)}</td><td>${esc(((i.row&&i.row.lang)||i.d.lang||$("#dl").value).toUpperCase())}</td><td>${i.d.total||1}</td><td>${esc(i.d.isbn)}</td></tr>`).join("")}</tbody></table></div>
   ${P.items.length>6?`<p class="ca">${t("…and {n} more.",{n:P.items.length-6})}</p>`:""}
   ${P.warn.length?`<details class="warns" open><summary>${t("{n} notes",{n:P.warn.length})}</summary>${P.warn.slice(0,8).map(w=>`<div>${esc(w)}</div>`).join("")}${P.warn.length>8?`<div>${t("…and {n} more.",{n:P.warn.length-8})}</div>`:""}</details>`:""}`;
  $("#go").disabled=!(a||u)};

 $("#fi").onchange=async e=>{const f=e.target.files[0];if(!f)return;$("#opts").hidden=true;$("#go").disabled=true;
  try{R=await fileRows(f)}catch(x){R=null;$("#pv").textContent=x.message==="xls"?t("Old .xls files are not supported. Save it as .xlsx or .csv and try again."):t("Could not read that file. Use .csv or .xlsx.");return}
  if(R.length<2){$("#pv").textContent=t("The file has no books in it.");return}
  $("#opts").hidden=false;draw()};
 ["dl","ex","oc"].forEach(id=>$("#"+id).onchange=()=>R&&draw());

 $("#go").onclick=async()=>{if(!P||!P.items)return;$("#go").disabled=true;
  const add=P.items.filter(i=>i.act==="add"),upd=P.items.filter(i=>i.act==="update"&&Object.keys(i.row).length);
  const ok=await act(async()=>{
   for(let i=0;i<add.length;i+=200)await must(sb.from("books").insert(add.slice(i,i+200).map(x=>x.row)));
   for(let i=0;i<upd.length;i+=10)await Promise.all(upd.slice(i,i+10).map(x=>must(sb.from("books").update(x.row).eq("id",x.ex.id))))},null,true);
  if(ok)toast(t("{a} added, {u} updated.",{a:add.length,u:upd.length}))}}

/* ---------- cover upload ---------- */
const COVER_BUCKET="covers";
const coverPrefix=()=>sb.storage.from(COVER_BUCKET).getPublicUrl("x").data.publicUrl.slice(0,-1);
async function prepCover(file){
 if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error(t("Choose a JPG, PNG or WebP image."));
 if(file.size>15e6)throw new Error(t("That image is too large (max 15 MB)."));
 const bm=await createImageBitmap(file),k=Math.min(1,600/bm.width,900/bm.height),w=Math.max(1,Math.round(bm.width*k)),h=Math.max(1,Math.round(bm.height*k)),c=document.createElement("canvas");
 c.width=w;c.height=h;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(bm,0,0,w,h);bm.close&&bm.close();
 return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error(t("Could not read that image."))),"image/jpeg",.86))}
async function uploadCover(blob){
 const path=crypto.randomUUID()+".jpg",{error}=await sb.storage.from(COVER_BUCKET).upload(path,blob,{contentType:"image/jpeg",cacheControl:"31536000"});
 if(error)throw error;return coverPrefix()+path}
async function dropCover(url){ /* remove a replaced file from our own bucket; ignore failures */
 try{const p=coverPrefix();if(url&&url.startsWith(p))await sb.storage.from(COVER_BUCKET).remove([url.slice(p.length)])}catch(e){}}

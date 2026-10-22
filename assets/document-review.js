(function(){
"use strict";

const cfg=window.PREPARED_PARENT_CONFIG||{};
const files=document.getElementById("docFiles");
const text=document.getElementById("docText");
const goal=document.getElementById("docGoal");
const context=document.getElementById("docContext");
const out=document.getElementById("docResults");
const btn=document.getElementById("analyzeDocs");
const statusEl=document.getElementById("backendStatus");
const privacyEl=document.getElementById("docPrivacy");
const esc=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const uniq=a=>[...new Set((a||[]).filter(Boolean))];

function apiBase(){return String(cfg.documentReviewApi||"").replace(/\/$/,"");}
function secureConfigured(){return !!cfg.secureDocumentReview && !!apiBase();}

function setModeStatus(){
  if(secureConfigured()){
    statusEl.textContent="● Secure backend configured · files are sent only when you choose Review my documents";
    statusEl.classList.remove("gated");
    privacyEl.innerHTML="<strong>Privacy:</strong> When you choose <em>Review my documents</em>, selected files are sent over HTTPS to the Prepared Parent zero-retention review service. The service is designed not to persist uploaded file bytes or extracted document text after the request completes.";
  }else{
    statusEl.textContent="● Local-only beta · PDF/DOCX/image contents are not uploaded or read";
    statusEl.classList.add("gated");
    privacyEl.innerHTML="<strong>Privacy:</strong> Current mode is local-only. Files selected here stay in this browser. Plain-text files can be read locally. PDF, DOCX, and image contents are not transmitted or silently uploaded.";
  }
}

async function localTextFromFiles(){
  const chunks=[];
  for(const f of files.files){
    if(f.type.startsWith("text/") || /\.(txt|rtf)$/i.test(f.name)){
      try{chunks.push(await f.text());}catch(_){}
    }
  }
  return chunks.join("\n");
}
function detectDates(s){
  const matches=s.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/gi)||[];
  return uniq(matches).slice(0,12);
}
function contains(s,terms){return terms.some(t=>s.includes(t));}
function localAnalyze(raw){
  const s=raw.toLowerCase();
  const signals=[],possible=[],bring=[
    "Government-issued photo ID",
    "A complete copy of every document you received or filed",
    "A simple dated timeline of important events",
    "Paper and pen / notes with questions you want answered"
  ],verify=[
    "Exact court, case number, and names shown on the caption",
    "Whether an existing order already controls the issue",
    "Any hearing date, response date, or other deadline shown on the original document",
    "Whether local court rules or required forms apply"
  ],escalate=[];

  if(contains(s,["summons","complaint","petition","served","service of process"])){signals.push("Initial service / pleading language detected");possible.push("Possible filing category to verify: response/answer or other responsive pleading. LEGAL REVIEW REQUIRED.");}
  if(contains(s,["motion to modify","modification","modify"])){signals.push("Modification language detected");possible.push("Possible filing category to verify: modification-related pleading and supporting forms. LEGAL REVIEW REQUIRED.");}
  if(contains(s,["show cause","contempt","rule nisi"])){signals.push("Show-cause / contempt language detected");possible.push("Possible filing category to verify: response to enforcement/contempt allegations. LEGAL REVIEW REQUIRED.");escalate.push("Contempt/show-cause language can be time-sensitive. Prompt licensed-attorney or official-court verification is recommended.");}
  if(contains(s,["hearing","trial","court date","appear before"])){signals.push("Hearing or appearance language detected");bring.push("The hearing notice and current controlling orders","Organized copies of documents you may need to discuss, subject to evidentiary rules","A one-page issue list focused on what the hearing appears to address");}
  if(contains(s,["child support","support order","income","cs-41","cs-42","rule 32"])){signals.push("Child-support language detected");bring.push("Recent pay stubs or income records","Tax returns / 1099s / business records if self-employed","Child-care cost records","Health-insurance premium documentation for the child","Proof of support payments or credits you believe are relevant");possible.push("Possible filing category to verify: Alabama child-support guideline/financial-disclosure forms. LEGAL REVIEW REQUIRED.");}
  if(contains(s,["custody","visitation","parenting time","joint custody","physical custody"])){signals.push("Custody / parenting-time language detected");bring.push("Current custody/parenting order, if any","A factual parenting-time calendar","School/day-care schedules and relevant logistics","A concise proposed schedule only if schedule terms are actually at issue");possible.push("Possible filing category to verify: custody/parenting-time pleading matched to initial, modification, or enforcement posture. LEGAL REVIEW REQUIRED.");}
  if(contains(s,["dhr","department of human resources","child support enforcement division"])){signals.push("Alabama DHR / agency language detected");bring.push("All DHR notices and correspondence","Any administrative case or reference number","Payment history or income records relevant to the notice");verify.push("Whether the matter is administrative, court-based, or both.");}
  if(contains(s,["default","default judgment"])){signals.push("Default language detected");escalate.push("Default language can be time-sensitive. Prompt attorney or official-court verification is recommended.");}
  if(contains(s,["protection from abuse","pfa","restraining order","domestic violence"])){signals.push("Protective-order / safety language detected");escalate.push("Safety/protective-order matters require prompt, situation-specific legal and safety support.");}
  if(contains(s,["appeal","notice of appeal"])){signals.push("Appeal language detected");escalate.push("Appeal procedure can be highly time-sensitive. Prompt licensed-attorney review is strongly recommended.");}

  if(context.value==="support") bring.push("Financial records relevant to the child-support issue");
  if(context.value==="custody") bring.push("Parenting-time records and existing custody orders");
  if(context.value==="served") verify.push("Date and method of service shown on the documents or return of service");
  if(context.value==="hearing") bring.push("Any order setting the hearing and documents referenced in that order");

  return {signals:uniq(signals),possible:uniq(possible),bring:uniq(bring),verify:uniq(verify),escalate:uniq(escalate),dates:detectDates(raw)};
}

function list(items,empty="No reliable signal detected from the information available."){
  return items&&items.length?'<ul>'+items.map(v=>'<li>'+esc(typeof v==="string"?v:(v.value||v.title||JSON.stringify(v)))+'</li>').join("")+'</ul>':'<p>'+esc(empty)+'</p>';
}
function renderBackend(data){
  let html='<h2>2. Your preparation report</h2>';
  html+='<p><strong>Review ID:</strong> '+esc(data.requestId||"")+'</p>';
  if(data.privacyWarnings&&data.privacyWarnings.length) html+='<div class="notice danger"><strong>Privacy warnings</strong>'+list(data.privacyWarnings)+'</div>';
  for(const r of data.reports||[]){
    html+='<article class="doc-report-block">';
    html+='<h3>'+esc(r.fileName||"Document")+'</h3>';
    if(r.status!=="ANALYZED"){
      html+='<div class="notice"><strong>'+esc(r.status||"Not analyzed")+'</strong> '+esc(r.message||"This file could not be reliably analyzed.")+'</div></article>';
      continue;
    }
    html+='<p><strong>What this document appears to be:</strong> '+esc((r.whatThisDocumentAppearsToBe.documentTypes||[]).join(", "))+'</p>';
    html+='<p><strong>What this document appears to say:</strong> '+esc(r.whatThisDocumentAppearsToSay||"")+'</p>';
    html+='<p><strong>Court/jurisdiction signal:</strong> '+esc(r.courtAndJurisdiction||"Not reliably identified")+'</p>';
    html+='<p><strong>Case number:</strong> '+esc(r.caseNumber||"Not reliably identified")+'</p>';
    html+='<h4>Dates shown on the document — verify</h4>'+list((r.datesShownOnDocument||[]).map(x=>x.value+" — Date shown on document — verify."));
    html+='<h4>Questions to verify immediately</h4>'+list(r.questionsToVerifyImmediately);
    html+='<h4>Possible filing/form categories to research</h4>'+list(r.possibleFilingCategories,"No filing category was safely identified.");
    html+='<div class="notice"><strong>'+esc(r.legalAuthorityGate||"LEGAL REVIEW REQUIRED")+'</strong> Do not file based only on this report.</div>';
    html+='<h4>Items to consider organizing for court</h4>'+list(r.itemsToConsiderOrganizing);
    html+='<h4>Official Alabama authorities / starting points</h4>'+list((r.officialAlabamaAuthoritiesAndSources||[]).map(x=>x.title+" — "+x.status));
    if(r.urgencyFlags&&r.urgencyFlags.length) html+='<h4>Attorney-review / urgency flags</h4>'+list(r.urgencyFlags);
    html+='<h4>Missing information</h4>'+list(r.missingInformation,"No additional missing-information signal was generated.");
    html+='</article>';
  }
  html+='<div class="notice"><strong>Educational information only.</strong> '+esc(data.educationalDisclaimer||"The Prepared Parent Project is not a law firm and does not provide legal advice.")+'</div>';
  html+='<div class="result-tools"><button class="btn small" id="copyDocReport" type="button">Copy report</button><button class="btn secondary small" id="printDocReport" type="button">Print / Save PDF</button></div>';
  out.innerHTML=html;
  wireReportButtons();
}
function renderLocal(a,selected,binary){
  out.innerHTML=
    '<h2>2. Your preparation report</h2>'+
    '<p><strong>Files selected:</strong> '+(selected.length?selected.map(f=>esc(f.name)).join(", "):"None")+'</p>'+
    (binary.length?'<div class="notice"><strong>Current beta limitation:</strong> '+binary.length+' PDF/DOCX/image file'+(binary.length===1?" was":"s were")+' selected, but this local-only mode does not read their internal text. Results below use file names, pasted text, and locally readable text files only.</div>':"")+
    '<h3>Document signals</h3>'+list(a.signals)+
    '<h3>Dates found — verify against the original document</h3>'+list(a.dates)+
    '<h3>Possible filing categories to research / verify</h3>'+list(a.possible)+
    '<div class="notice"><strong>LEGAL REVIEW REQUIRED.</strong> Do not file based only on this list. Confirm forms, deadlines, service requirements, legal standards, and local requirements with current authoritative Alabama sources, the court where appropriate, or a licensed attorney.</div>'+
    '<h3>Items to consider organizing for court</h3>'+list(a.bring)+
    '<h3>Questions to verify next</h3>'+list(a.verify)+
    (a.escalate.length?'<h3>Attorney-review / urgency flags</h3>'+list(a.escalate):"")+
    '<div class="result-tools"><button class="btn small" id="copyDocReport" type="button">Copy report</button><button class="btn secondary small" id="printDocReport" type="button">Print / Save PDF</button></div>';
  wireReportButtons();
}
function wireReportButtons(){
  const copy=document.getElementById("copyDocReport");
  const print=document.getElementById("printDocReport");
  if(copy) copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(out.innerText);copy.textContent="Copied";}catch(_){copy.textContent="Select and copy manually";}});
  if(print) print.addEventListener("click",()=>window.print());
}

async function secureReview(selected){
  const base=apiBase();
  const tokenResp=await fetch(base+"/api/token",{method:"GET",mode:"cors",cache:"no-store"});
  if(!tokenResp.ok) throw new Error("Secure review token unavailable.");
  const {token}=await tokenResp.json();
  if(!token) throw new Error("Secure review token missing.");

  const form=new FormData();
  for(const f of selected) form.append("documents",f,f.name);
  if(!selected.length && text.value.trim()){
    form.append("documents",new Blob([text.value],{type:"text/plain"}),"pasted-document-text.txt");
  }
  form.append("context",context.value);
  form.append("goal",goal.value.trim());

  const reviewResp=await fetch(base+"/api/review",{
    method:"POST",
    mode:"cors",
    cache:"no-store",
    headers:{"X-Review-Token":token},
    body:form
  });
  const data=await reviewResp.json().catch(()=>({}));
  if(!reviewResp.ok) throw new Error(data.message||"Secure document review failed.");
  return data;
}

btn.addEventListener("click",async()=>{
  const selected=[...files.files];
  if(!selected.length && !text.value.trim()){
    out.innerHTML='<h2>2. Your preparation report</h2><div class="notice danger"><strong>No information to review.</strong> Select at least one file or paste key text from the document.</div>';
    return;
  }

  btn.disabled=true;
  const original=btn.textContent;
  btn.textContent=secureConfigured()?"Securely reviewing…":"Reviewing locally…";
  try{
    if(secureConfigured()){
      const data=await secureReview(selected);
      renderBackend(data);
    }else{
      const localText=await localTextFromFiles();
      const names=selected.map(f=>f.name).join(" ");
      const raw=[names,localText,text.value,goal.value].join("\n").trim();
      const a=localAnalyze(raw);
      const binary=selected.filter(f=>!f.type.startsWith("text/")&&!/\.(txt|rtf)$/i.test(f.name));
      renderLocal(a,selected,binary);
    }
  }catch(err){
    out.innerHTML='<h2>2. Your preparation report</h2><div class="notice danger"><strong>Review stopped safely.</strong> '+esc(err.message||"The document could not be processed reliably.")+' No filing or deadline recommendation was generated.</div>';
  }finally{
    btn.disabled=false;
    btn.textContent=original;
  }
});

setModeStatus();
})();
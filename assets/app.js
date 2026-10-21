(function(){
"use strict";
const form=document.getElementById("navigatorForm");
const result=document.getElementById("result");
const rows=document.getElementById("authorityRows");
const data={
custody:{title:"Custody / parenting time",facts:["Existing written order","Initial determination vs. modification","Current parenting arrangement","Procedural stage","Safety or interstate issues when applicable"],authorities:["Applicable Alabama custody statutes","Applicable Alabama court rules","Verified published Alabama appellate authority matched to the issue"],next:"Identify the exact custody question and procedural posture before presenting potentially applicable Alabama authorities."},
support:{title:"Child support",facts:["Existing support order","Establishment vs. modification vs. enforcement","Income and self-employment facts","Parenting-time / custody posture","Child-care and health-insurance facts when relevant"],authorities:["Alabama Rule 32","Applicable Alabama statutes / court rules","Verified published Alabama appellate authority matched to the support issue"],next:"Separate initial support, modification, and enforcement questions before showing guideline and case-law material."},
dhr:{title:"DHR / agency process",facts:["Type of DHR matter","Notice or action received","Court case connected to the agency process","Deadlines on official documents","Safety concerns"],authorities:["Official Alabama DHR materials","Applicable Alabama statutes / rules","Verified Alabama case authority when a legal standard requires interpretation"],next:"Start with the exact DHR program or notice, then connect the parent to official process information and relevant authority."},
court:{title:"Court preparation",facts:["Court and case type","Existing orders","Hearing or filing stage","Documents / evidence already available","Specific issue before the court"],authorities:["Applicable Alabama court rules","Official Alabama forms","Statutes and verified case authority relevant to the legal proposition"],next:"Build a preparation checklist around the issue actually before the court rather than a generic checklist."},
resources:{title:"Family / public resources",facts:["County / service area","Household eligibility factors","Age of child","Urgency / safety","Type of resource needed"],authorities:["Official Alabama agency information","Official federal sources where applicable","Program-specific eligibility and application materials"],next:"Route to current official resources and clearly mark time-sensitive eligibility information for re-verification."}
};
const stages={initial:"Initial case / no final order",modify:"Modification",enforce:"Enforcement / contempt",agency:"DHR / administrative process",prepare:"Preparing for a hearing / appointment",general:"General information"};
const orderText={yes:"A written order already exists. The educational path must distinguish what the current order says from any modification or enforcement question.",no:"No existing order was selected. Initial-case standards and procedures should be separated from modification law.",unsure:"The first step is identifying whether a controlling order already exists.",na:"An existing court order may not be relevant to this resource question."};
function esc(s){return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];});}
function tagList(items){return items.map(function(x){return '<span class="tag">'+esc(x)+'</span>';}).join("");}
form.addEventListener("submit",function(e){
e.preventDefault();
const topic=document.getElementById("topic").value;
const order=document.getElementById("order").value;
const stage=document.getElementById("stage").value;
const urgent=document.getElementById("urgent").value;
const details=document.getElementById("details").value.trim();
const d=data[topic];
const urgentBlock=urgent==="yes"?'<div class="notice" style="border-left-color:#8a3a2f;background:#fff0ed;color:#6d2f28"><strong>Safety route:</strong> urgent safety issues should be routed to emergency, child-protection, domestic-violence, or licensed professional resources before ordinary educational navigation.</div>':"";
result.innerHTML='<h3>'+esc(d.title)+'</h3><p><strong>Current path:</strong> '+esc(stages[stage])+'</p><p>'+esc(orderText[order])+'</p>'+urgentBlock+'<h4>Facts that may matter</h4><div>'+tagList(d.facts)+'</div><h4>Authority layers to verify</h4><div>'+tagList(d.authorities)+'</div>'+(details?'<h4>Your stated issue</h4><p>'+esc(details)+'</p>':"")+'<h4>Next educational step</h4><p>'+esc(d.next)+'</p><div class="notice"><strong>Not legal advice.</strong> This navigator does not tell a parent what to file, predict a judge’s decision, determine legal rights, or create an attorney-client relationship.</div>';
result.scrollIntoView({behavior:"smooth",block:"nearest"});
});
const authorityData=[
["Child-support guidelines","Alabama Rule 32 + applicable published Alabama appellate authority","Case-law gate","gate"],
["Custody / parenting time","Applicable Alabama statutes, court rules + published Alabama appellate authority","Case-law gate","gate"],
["DHR process","Official Alabama DHR materials + applicable law","Primary-source layer","verified"],
["Public resources","Official state/federal agency information","Primary-source layer","verified"]
];
rows.innerHTML=authorityData.map(function(r){return '<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td><span class="state '+r[3]+'">'+esc(r[2])+'</span></td></tr>';}).join("");
})();
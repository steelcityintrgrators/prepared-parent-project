(function(){
"use strict";
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function tags(items){return items.map(x=>'<span class="tag">'+esc(x)+'</span>').join("");}

const paths={
custody:{title:"Custody / parenting time",facts:["Existing written order","Initial determination vs. modification","Current parenting arrangement","Procedural stage","Safety or interstate issues when applicable"],authorities:["Applicable Alabama custody statutes","Applicable Alabama court rules","Verified published Alabama appellate authority matched to the issue"],next:"Identify the exact custody question and procedural posture before presenting potentially applicable Alabama authorities.",resources:["Alabama Judicial System","Alabama Legislature","Independent legal help"]},
support:{title:"Child support",facts:["Existing support order","Establishment vs. modification vs. enforcement","Income and self-employment facts","Parenting-time / custody posture","Child-care and health-insurance facts when relevant"],authorities:["Alabama Rule 32","Applicable Alabama statutes / court rules","Verified published Alabama appellate authority matched to the support issue"],next:"Separate initial support, modification, and enforcement questions before showing guideline and case-law material.",resources:["Alabama Rule 32","Alabama DHR Child Support","Independent legal help"]},
dhr:{title:"DHR / agency process",facts:["Type of DHR matter","Notice or action received","Court case connected to the agency process","Deadlines stated on official documents","Safety concerns"],authorities:["Official Alabama DHR materials","Applicable Alabama statutes / rules","Verified Alabama case authority when interpretation is needed"],next:"Start with the exact DHR program or notice, then connect the parent to official process information and relevant authority.",resources:["Alabama DHR Child Support","Alabama DHR Child Care","Alabama DHR Child Protective Services"]},
court:{title:"Court preparation",facts:["Court and case type","Existing orders","Hearing or filing stage","Documents / evidence already available","Specific issue before the court"],authorities:["Applicable Alabama court rules","Official Alabama forms","Statutes and verified case authority relevant to the legal proposition"],next:"Build a preparation checklist around the issue actually before the court rather than a generic checklist.",resources:["Alabama Judicial System","Court Rules & Forms","Independent legal help"]},
resources:{title:"Family / public resources",facts:["County / service area","Household eligibility factors","Age of child","Urgency / safety","Type of resource needed"],authorities:["Official Alabama agency information","Official federal sources where applicable","Program-specific eligibility and application materials"],next:"Route to current official resources and clearly mark time-sensitive eligibility information for re-verification.",resources:["Alabama Medicaid","Alabama WIC","Alabama DHR Child Care"]}
};
const stages={initial:"Initial case / no final order",modify:"Modification",enforce:"Enforcement / contempt",agency:"DHR / administrative process",prepare:"Preparing for a hearing / appointment",general:"General information"};
const orderText={yes:"A written order already exists. The educational path must distinguish what the current order says from any modification or enforcement question.",no:"No existing order was selected. Initial-case standards and procedures should be separated from modification law.",unsure:"The first step is identifying whether a controlling order already exists.",na:"An existing court order may not be relevant to this resource question."};

$("#navigatorForm").addEventListener("submit",e=>{
  e.preventDefault();
  const topic=$("#topic").value, order=$("#order").value, stage=$("#stage").value, urgent=$("#urgent").value, details=$("#details").value.trim(), d=paths[topic];
  const urgentBlock=urgent==="yes"?'<div class="notice danger"><strong>Safety route:</strong> urgent safety issues should be routed to appropriate emergency, child-protection, domestic-violence, or licensed professional resources before ordinary educational navigation.</div>':"";
  $("#result").innerHTML='<h3>'+esc(d.title)+'</h3><p><strong>Current path:</strong> '+esc(stages[stage])+'</p><p>'+esc(orderText[order])+'</p>'+urgentBlock+
  '<h4>Facts that may matter</h4><div>'+tags(d.facts)+'</div>'+
  '<h4>Authority layers to verify</h4><div>'+tags(d.authorities)+'</div>'+
  (details?'<h4>Your stated issue</h4><p>'+esc(details)+'</p>':"")+
  '<h4>Useful starting resources</h4><div>'+tags(d.resources)+'</div>'+
  '<h4>Next educational step</h4><p>'+esc(d.next)+'</p>'+
  '<div class="notice"><strong>Not legal advice.</strong> This navigator does not tell a parent what to file, predict a judge’s decision, determine legal rights, or create an attorney-client relationship.</div>'+
  '<div class="result-tools"><button class="btn small" id="copyResult" type="button">Copy summary</button><button class="btn secondary small" id="printResult" type="button">Print / Save PDF</button></div>';
  $("#copyResult").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("#result").innerText);$("#copyResult").textContent="Copied";}catch(e){$("#copyResult").textContent="Select and copy manually";}});
  $("#printResult").addEventListener("click",()=>window.print());
  $("#result").scrollIntoView({behavior:"smooth",block:"nearest"});
});

$$("[data-topic]").forEach(a=>a.addEventListener("click",()=>{$("#topic").value=a.dataset.topic;}));

const resources=[
{cat:"court",title:"Alabama Judicial System",desc:"Official Alabama court system resources, rules, forms, and judicial information.",source:"Official Alabama Judicial System",url:"https://judicial.alabama.gov/"},
{cat:"court",title:"Alabama Rule 32",desc:"Official child-support guideline rule published by the Alabama Judicial System.",source:"Alabama Judicial System",url:"https://judicial.alabama.gov/docs/library/rules/ja32.pdf"},
{cat:"court",title:"Alabama Legislature",desc:"Official Code of Alabama source for state statutes.",source:"Alabama Legislature",url:"https://alison.legislature.state.al.us/code-of-alabama"},
{cat:"dhr",title:"Alabama DHR Child Support",desc:"Official information about child-support services, establishment, enforcement, review, and related agency processes.",source:"Alabama Department of Human Resources",url:"https://dhr.alabama.gov/child-support-enforcement-division/"},
{cat:"dhr",title:"Alabama DHR Child Care",desc:"Official child-care subsidy, licensing, and child-care management resources.",source:"Alabama Department of Human Resources",url:"https://dhr.alabama.gov/child-care/"},
{cat:"dhr",title:"Child Abuse & Neglect Reporting",desc:"Official reporting information for suspected child abuse or neglect in Alabama.",source:"Alabama Department of Human Resources",url:"https://dhr.alabama.gov/child-protective-services/child-abuse-neglect-reporting/"},
{cat:"family",title:"Alabama Medicaid",desc:"Official Alabama Medicaid eligibility information for children, parents, and caretaker relatives.",source:"Alabama Medicaid Agency",url:"https://medicaid.alabama.gov/content/3.0_Apply/3.2_Qualifying/3.2.1_Medicaid_Children_Parents.aspx"},
{cat:"family",title:"Alabama WIC",desc:"Official information about applying for the Alabama Women, Infants, and Children program.",source:"Alabama Department of Public Health",url:"https://www.alabamapublichealth.gov/wic/apply.html"},
{cat:"family",title:"Ready.gov Family Planning",desc:"Federal emergency-planning guidance for families and children.",source:"Ready.gov",url:"https://www.ready.gov/plan"},
{cat:"legal-help",title:"Legal Services Alabama",desc:"Statewide civil legal-aid intake and information for eligible Alabama residents.",source:"Legal Services Alabama",url:"https://legalservicesalabama.org/apply-for-services/"},
{cat:"legal-help",title:"Volunteer Lawyers Birmingham",desc:"Birmingham-area pro bono and legal-help resource.",source:"Volunteer Lawyers Birmingham",url:"https://www.vlbham.org/"},
{cat:"legal-help",title:"Alabama Free Legal Answers",desc:"Online legal-question service for eligible Alabama residents, subject to provider rules and availability.",source:"ABA / Alabama program",url:"https://alabama.freelegalanswers.org/"}
];

let currentFilter="all";
function renderResources(){
 const q=$("#resourceSearch").value.trim().toLowerCase();
 const list=resources.filter(r=>(currentFilter==="all"||r.cat===currentFilter)&&(!q||[r.title,r.desc,r.source,r.cat].join(" ").toLowerCase().includes(q)));
 $("#resourceGrid").innerHTML=list.length?list.map(r=>'<article class="resource"><small>'+esc(r.cat.replace("-"," "))+'</small><h3>'+esc(r.title)+'</h3><p>'+esc(r.desc)+'</p><p class="source">'+esc(r.source)+'</p><a class="btn secondary small" target="_blank" rel="noopener noreferrer" href="'+r.url+'">Open official resource ↗</a></article>').join(""):'<div class="panel"><h3>No matching resources</h3><p>Try a broader search or another category.</p></div>';
}
$("#resourceSearch").addEventListener("input",renderResources);
$$(".filter").forEach(b=>b.addEventListener("click",()=>{currentFilter=b.dataset.filter;$$(".filter").forEach(x=>x.classList.toggle("active",x===b));renderResources();}));
$$("[data-filter]").filter(x=>x.tagName==="A").forEach(a=>a.addEventListener("click",()=>{currentFilter=a.dataset.filter;$$(".filter").forEach(x=>x.classList.toggle("active",x.dataset.filter===currentFilter));setTimeout(renderResources,0);}));
renderResources();

$$(".tab").forEach(t=>t.addEventListener("click",()=>{$$(".tab").forEach(x=>x.classList.toggle("active",x===t));$$(".tabpanel").forEach(p=>p.classList.toggle("active",p.id===t.dataset.tab));}));
})();
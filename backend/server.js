"use strict";

const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const Tesseract = require("tesseract.js");

const app = express();
const PORT = Number(process.env.PORT || 8080);
const DEFAULT_ORIGIN = "https://steelcityintrgrators.github.io";
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
const IS_PROD = process.env.NODE_ENV === "production";
const REVIEW_TOKEN_SECRET = process.env.REVIEW_TOKEN_SECRET || (IS_PROD ? "" : crypto.randomBytes(32).toString("hex"));
const ENABLE_OCR = String(process.env.ENABLE_OCR || "true").toLowerCase() !== "false";

if (IS_PROD && REVIEW_TOKEN_SECRET.length < 32) {
  throw new Error("REVIEW_TOKEN_SECRET must be configured with at least 32 characters in production.");
}

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin(origin, cb) {
    if (!origin || origin.replace(/\/$/, "") === ALLOWED_ORIGIN) return cb(null, true);
    return cb(new Error("Origin not allowed"));
  },
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Review-Token"],
  maxAge: 600
}));

const tokenLimiter = rateLimit({windowMs: 60_000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false});
const reviewLimiter = rateLimit({windowMs: 60_000, limit: 8, standardHeaders: "draft-7", legacyHeaders: false});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/rtf",
  "application/rtf",
  "image/png",
  "image/jpeg",
  "image/webp"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 5, fields: 8 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(new Error("Unsupported file type"));
    cb(null, true);
  }
});

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}
function sign(payload) {
  return crypto.createHmac("sha256", REVIEW_TOKEN_SECRET).update(payload).digest("base64url");
}
function issueToken() {
  const payload = b64url(JSON.stringify({
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomUUID()
  }));
  return payload + "." + sign(payload);
}
function verifyToken(token) {
  if (!token || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  const expected = sign(payload);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}
function requireToken(req, res, next) {
  if (!verifyToken(req.get("X-Review-Token"))) {
    return res.status(401).json({error:"REVIEW_TOKEN_REQUIRED", message:"Obtain a short-lived review token and try again."});
  }
  next();
}

function cleanText(value, max=500) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}
function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}
function lines(text) {
  return String(text || "").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}
function contains(text, terms) {
  const s = String(text || "").toLowerCase();
  return terms.some(t => s.includes(t));
}

async function extractText(file) {
  if (file.mimetype === "application/pdf") {
    const parsed = await pdfParse(file.buffer);
    return {text: parsed.text || "", method:"PDF_TEXT_EXTRACTION"};
  }
  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const parsed = await mammoth.extractRawText({buffer:file.buffer});
    return {text: parsed.value || "", method:"DOCX_TEXT_EXTRACTION"};
  }
  if (file.mimetype === "text/plain" || file.mimetype === "text/rtf" || file.mimetype === "application/rtf") {
    return {text:file.buffer.toString("utf8"), method:"PLAIN_TEXT_EXTRACTION"};
  }
  if (file.mimetype.startsWith("image/")) {
    if (!ENABLE_OCR) throw Object.assign(new Error("OCR disabled"), {code:"OCR_DISABLED"});
    const result = await Tesseract.recognize(file.buffer, "eng", {logger:()=>{}});
    return {text:(result.data && result.data.text) || "", method:"OCR"};
  }
  throw Object.assign(new Error("Unsupported file type"), {code:"UNSUPPORTED_FILE"});
}

function piiWarnings(text) {
  const warnings = [];
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) warnings.push("Possible Social Security number detected. Consider redacting it before future uploads unless essential.");
  if (/\b(?:account|routing|bank)\b[\s\S]{0,40}\b\d{8,17}\b/i.test(text)) warnings.push("Possible banking/account number detected. Consider redacting it unless essential.");
  if (/\b(?:medical record|diagnosis|medication|patient id)\b/i.test(text)) warnings.push("Possible medical information detected. Include only what is necessary for the review.");
  if (/\b(?:password|passcode|verification code|2fa|otp)\b/i.test(text)) warnings.push("Possible authentication credential language detected. Never upload passwords, passcodes, or one-time codes.");
  return warnings;
}

function detectDates(text) {
  const month = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi;
  const numeric = /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g;
  return uniq([...(text.match(month)||[]), ...(text.match(numeric)||[])]).slice(0, 20).map(value=>({
    value,
    label:"Date shown on document — verify.",
    derived:false
  }));
}

function classify(text, filename, declaredContext) {
  const s=(text+" "+filename+" "+declaredContext).toLowerCase();
  const types=[];
  const postures=[];
  if (contains(s,["summons"])) types.push("summons");
  if (contains(s,["complaint"])) types.push("complaint");
  if (contains(s,["petition"])) types.push("petition");
  if (contains(s,["motion"])) types.push("motion");
  if (contains(s,["order","judgment","decree"])) types.push("order/judgment");
  if (contains(s,["hearing notice","notice of hearing","set for hearing"])) types.push("hearing notice");
  if (contains(s,["show cause","contempt","rule nisi"])) types.push("show-cause/contempt document");
  if (contains(s,["dhr","department of human resources"])) types.push("DHR/agency document");
  if (contains(s,["notice of appeal","appeal"])) types.push("appeal-related document");
  if (contains(s,["protection from abuse","pfa","restraining order"])) types.push("protective-order/safety document");

  if (contains(s,["served","summons","complaint","initial petition"])) postures.push("initial/service");
  if (contains(s,["modify","modification"])) postures.push("modification");
  if (contains(s,["enforce","enforcement","contempt","show cause","rule nisi"])) postures.push("enforcement/contempt");
  if (contains(s,["dhr","department of human resources","administrative"])) postures.push("DHR/administrative");
  if (contains(s,["appeal","notice of appeal"])) postures.push("appeal");
  if (contains(s,["protection from abuse","pfa","restraining order"])) postures.push("protective-order/safety");
  if (contains(s,["child support","cs-41","cs-42","rule 32"])) postures.push("child support");
  if (contains(s,["custody","parenting time","visitation","physical custody"])) postures.push("custody/parenting time");

  return {
    documentTypes: uniq(types.length?types:["unclassified court/family document"]),
    proceduralPosture: uniq(postures.length?postures:[declaredContext || "requires verification"]),
    confidence: types.length || postures.length ? "signal-based" : "low"
  };
}

function extractCaseNumber(text) {
  const patterns=[
    /\bcase\s*(?:no\.?|number)?\s*[:#]?\s*([A-Z0-9-]{5,30})\b/i,
    /\b(?:DR|CS|JU|CV)-?\d{2,4}-\d{2,8}(?:\.\d{1,2})?\b/i
  ];
  for (const re of patterns) {
    const m=text.match(re);
    if (m) return cleanText(m[1] || m[0], 80);
  }
  return null;
}
function extractCourt(text) {
  const line=lines(text).find(x=>/\b(circuit|district|juvenile|family|domestic relations)\b.*\bcourt\b|\bcourt of\b/i.test(x));
  return line ? cleanText(line,180) : null;
}
function extractPartyLine(text) {
  const line=lines(text).find(x=>/\b(v\.|vs\.?|versus)\b/i.test(x));
  return line ? cleanText(line,180) : null;
}
function extractRelief(text) {
  return lines(text).filter(x=>/\b(requests?|prays?|seeks?|relief|order that|asks? the court)\b/i.test(x)).slice(0,5).map(x=>cleanText(x,260));
}
function extractOrderRefs(text) {
  return lines(text).filter(x=>/\b(order dated|prior order|existing order|final judgment|judgment dated|decree dated)\b/i.test(x)).slice(0,6).map(x=>cleanText(x,220));
}
function extractForms(text) {
  const hits=text.match(/\b(?:CS-\d+[A-Z]?|Form\s+[A-Z0-9-]{1,12}|Rule\s+32)\b/gi)||[];
  return uniq(hits).slice(0,12);
}

function buildPreparation(text, classification, context) {
  const s=text.toLowerCase();
  const possible=[];
  const bring=[
    "Government-issued photo ID",
    "A complete copy of every document you received or filed",
    "A simple dated timeline of important events",
    "A written list of questions you want answered"
  ];
  const verify=[
    "Exact court, case number, and names shown on the case caption",
    "Whether an existing order already controls the issue",
    "Every hearing date, response date, or deadline printed on the original document",
    "Whether local court rules or required forms apply"
  ];
  const urgency=[];

  if (contains(s,["summons","complaint","petition","served","service of process"])) {
    possible.push("Possible filing category to verify: response/answer or other responsive pleading. LEGAL REVIEW REQUIRED before relying on this suggestion.");
    verify.push("Date and method of service shown on the papers or return of service");
  }
  if (contains(s,["modify","modification","motion to modify"])) {
    possible.push("Possible filing category to verify: modification-related pleading and supporting forms. LEGAL REVIEW REQUIRED.");
  }
  if (contains(s,["show cause","contempt","rule nisi"])) {
    possible.push("Possible filing category to verify: response to enforcement/contempt allegations. LEGAL REVIEW REQUIRED.");
    urgency.push("Contempt/show-cause language detected. Prompt licensed-attorney or official-court verification is recommended.");
  }
  if (contains(s,["hearing","trial","court date","appear before"])) {
    bring.push("The notice or order setting the hearing");
    bring.push("Any current controlling order");
    bring.push("Organized copies of documents you may need to discuss, subject to evidentiary rules");
    bring.push("A one-page issue list focused on what the hearing appears to address");
  }
  if (contains(s,["child support","support order","income","cs-41","cs-42","rule 32"])) {
    possible.push("Possible filing category to verify: Alabama child-support guideline and financial-disclosure forms. LEGAL REVIEW REQUIRED before relying on any form list.");
    bring.push("Recent pay stubs or other current income records");
    bring.push("Recent tax returns / 1099s / business records if self-employed");
    bring.push("Child-care cost records");
    bring.push("Health-insurance premium documentation for the child");
    bring.push("Proof of support payments or credits you believe are relevant");
  }
  if (contains(s,["custody","visitation","parenting time","joint custody","physical custody"])) {
    possible.push("Possible filing category to verify: custody/parenting-time pleading appropriate to the actual posture (initial, modification, or enforcement). LEGAL REVIEW REQUIRED.");
    bring.push("Current custody/parenting order, if one exists");
    bring.push("A factual parenting-time calendar");
    bring.push("School/day-care schedules and relevant logistics");
    bring.push("A concise proposed schedule only if schedule terms are actually at issue");
  }
  if (contains(s,["dhr","department of human resources","child support enforcement division"])) {
    bring.push("All DHR notices and correspondence");
    bring.push("Any agency case/reference number");
    verify.push("Whether the matter is administrative, court-based, or both");
  }
  if (contains(s,["default","default judgment"])) {
    urgency.push("Default language detected. Prompt attorney or official-court verification is recommended because consequences can be time-sensitive.");
  }
  if (contains(s,["appeal","notice of appeal"])) {
    urgency.push("Appeal language detected. Appeal procedure can be highly time-sensitive. Prompt licensed-attorney review is strongly recommended.");
  }
  if (contains(s,["protection from abuse","pfa","restraining order","domestic violence"])) {
    urgency.push("Protective-order/safety language detected. Prompt situation-specific legal and safety support is recommended.");
  }

  if (context==="support") bring.push("Financial records relevant to the child-support issue");
  if (context==="custody") bring.push("Parenting-time records and existing custody orders");

  return {
    possibleFilingCategories:uniq(possible),
    itemsToConsiderOrganizing:uniq(bring),
    questionsToVerifyImmediately:uniq(verify),
    urgencyFlags:uniq(urgency)
  };
}

function authoritySources(text) {
  const sources=[{
    title:"Alabama Judicial System",
    url:"https://judicial.alabama.gov/",
    status:"OFFICIAL_SOURCE_STARTING_POINT — CURRENT LEGAL TREATMENT NOT VERIFIED BY THIS BACKEND"
  }];
  if (contains(text,["child support","cs-41","cs-42","rule 32"])) {
    sources.push({
      title:"Alabama Rule 32 — Child Support Guidelines",
      url:"https://judicial.alabama.gov/docs/library/rules/ja32.pdf",
      status:"OFFICIAL RULE SOURCE — CURRENT APPLICABILITY/CASE TREATMENT REQUIRES VERIFICATION"
    });
  }
  if (contains(text,["dhr","department of human resources"])) {
    sources.push({
      title:"Alabama Department of Human Resources",
      url:"https://dhr.alabama.gov/",
      status:"OFFICIAL AGENCY STARTING POINT — PROCEDURAL APPLICABILITY REQUIRES VERIFICATION"
    });
  }
  return sources;
}

function analyzeOne(text, file, context) {
  const classification=classify(text,file.originalname,context);
  const prep=buildPreparation(text,classification,context);
  const caseNumber=extractCaseNumber(text);
  const court=extractCourt(text);
  const partyLine=extractPartyLine(text);
  const forms=extractForms(text);
  const relief=extractRelief(text);
  const orderRefs=extractOrderRefs(text);
  const financial=contains(text,["income","pay stub","tax return","1099","child care","health insurance","financial affidavit"]);

  const missing=[];
  if (!caseNumber) missing.push("Case number not reliably identified");
  if (!court) missing.push("Court/jurisdiction line not reliably identified");
  if (!partyLine) missing.push("Parties not reliably identified from a caption line");
  if (!classification.proceduralPosture.length) missing.push("Procedural posture requires verification");

  return {
    fileName:file.originalname,
    mimeType:file.mimetype,
    whatThisDocumentAppearsToBe:classification,
    whatThisDocumentAppearsToSay:
      "The document contains signals consistent with " + classification.documentTypes.join(", ") +
      " and a possible " + classification.proceduralPosture.join(", ") +
      " posture. This is a signal-based educational classification, not a legal determination.",
    courtAndJurisdiction:court,
    caseNumber,
    partiesCaptionLine:partyLine,
    datesShownOnDocument:detectDates(text),
    reliefRequestedSignals:relief,
    existingOrdersReferenced:orderRefs,
    formsReferenced:forms,
    financialInformationRequestedOrDiscussed:financial,
    ...prep,
    officialAlabamaAuthoritiesAndSources:authoritySources(text),
    missingInformation:missing,
    legalAuthorityGate:"LEGAL REVIEW REQUIRED",
    deadlinePolicy:"No derived deadline was calculated. Dates above are copied from document text and must be verified against the original."
  };
}

function audit(event, data={}) {
  const safe={
    event,
    at:new Date().toISOString(),
    requestId:data.requestId,
    fileCount:data.fileCount,
    mimeTypes:data.mimeTypes,
    status:data.status
  };
  console.log(JSON.stringify(safe));
}

app.get("/api/health", (req,res)=>res.json({
  ok:true,
  service:"prepared-parent-document-review",
  zeroRetention:true,
  pdf:true,
  docx:true,
  text:true,
  ocr:ENABLE_OCR,
  legalAuthorityGate:"ENFORCED"
}));

app.get("/api/token", tokenLimiter, (req,res)=>{
  const origin=(req.get("Origin")||"").replace(/\/$/,"");
  if (origin && origin!==ALLOWED_ORIGIN) return res.status(403).json({error:"ORIGIN_NOT_ALLOWED"});
  res.set("Cache-Control","no-store");
  res.json({token:issueToken(),expiresInSeconds:600});
});

app.post("/api/review", reviewLimiter, requireToken, upload.array("documents",5), async (req,res)=>{
  const requestId=crypto.randomUUID();
  const files=req.files||[];
  if (!files.length) return res.status(400).json({error:"NO_DOCUMENTS",requestId});

  const context=cleanText(req.body.context,80);
  const goal=cleanText(req.body.goal,500);
  const reports=[];
  const warnings=[];
  audit("review_started",{requestId,fileCount:files.length,mimeTypes:files.map(f=>f.mimetype),status:"STARTED"});

  try {
    for (const file of files) {
      const extracted=await extractText(file);
      const text=String(extracted.text||"").trim();
      warnings.push(...piiWarnings(text));
      if (text.length < 20) {
        reports.push({
          fileName:file.originalname,
          mimeType:file.mimetype,
          extractionMethod:extracted.method,
          status:"INSUFFICIENT_TEXT",
          message:"The document did not yield enough readable text for reliable classification. Manual review or a clearer scan may be needed.",
          legalAuthorityGate:"LEGAL REVIEW REQUIRED"
        });
        continue;
      }
      reports.push({
        extractionMethod:extracted.method,
        status:"ANALYZED",
        ...analyzeOne(text,file,context)
      });
    }

    const response={
      requestId,
      status:"COMPLETE",
      zeroRetention:true,
      context,
      statedGoal:goal || null,
      reports,
      privacyWarnings:uniq(warnings),
      educationalDisclaimer:"The Prepared Parent Project is not a law firm. This report is for general educational and informational purposes and is not legal advice or legal representation.",
      filingDisclaimer:"Do not file a document based only on this report. Verify forms, deadlines, service requirements, legal standards, and local requirements with current authoritative Alabama sources, the court where appropriate, or a licensed attorney.",
      retention:"Uploaded file bytes and extracted text are discarded when this request completes."
    };
    audit("review_completed",{requestId,fileCount:files.length,mimeTypes:files.map(f=>f.mimetype),status:"COMPLETE"});
    res.set("Cache-Control","no-store");
    return res.json(response);
  } catch (err) {
    audit("review_failed",{requestId,fileCount:files.length,mimeTypes:files.map(f=>f.mimetype),status:"FAILED"});
    return res.status(422).json({
      error:err.code||"DOCUMENT_PROCESSING_FAILED",
      requestId,
      message:"The document could not be processed reliably. No filing or deadline recommendation was generated."
    });
  }
});

app.delete("/api/review/:id", requireToken, (req,res)=>{
  res.set("Cache-Control","no-store");
  res.json({
    deleted:true,
    requestId:cleanText(req.params.id,80),
    retention:"ZERO_RETENTION",
    message:"This service does not persist uploaded document bytes or extracted document text after the review request completes."
  });
});

app.use((err,req,res,next)=>{
  if (err && err.message==="Origin not allowed") {
    return res.status(403).json({error:"ORIGIN_NOT_ALLOWED",message:"This origin is not allowed to use the document-review service."});
  }
  const status=err && (err.code==="LIMIT_FILE_SIZE" || err.code==="LIMIT_FILE_COUNT") ? 413 : 400;
  res.status(status).json({error:"UPLOAD_REJECTED",message:"The upload was rejected by the document-safety limits."});
});

if (require.main === module) {
  app.listen(PORT, ()=>console.log(`Prepared Parent document review API listening on ${PORT}`));
}

module.exports={app,issueToken,verifyToken,analyzeOne};

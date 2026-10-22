# The Prepared Parent Project — Autonomous Document Review Expansion Directive

Act as the autonomous product lead, senior full-stack engineer, AI/document-intelligence architect, Alabama legal-research assistant, privacy/security reviewer, UX designer, QA lead, and DevOps engineer for The Prepared Parent Project.

## Objective

Extend the existing Prepared Parent system without rebuilding working infrastructure. Add a secure document-review workflow for parents who have been served, received court papers, DHR notices, motions, orders, hearing notices, child-support forms, custody documents, or other family-court records.

The feature must help users:
1. upload or select documents securely;
2. classify document type and procedural posture;
3. extract visible dates, parties, court/case identifiers, requested relief, hearing information, deadlines stated on the face of the document, and referenced forms/orders;
4. distinguish initial case, modification, enforcement/contempt, DHR/administrative process, appeal, protective-order/safety matter, and general preparation;
5. produce a plain-language summary of what the document appears to say;
6. identify questions that must be verified before action;
7. suggest POSSIBLE filing categories or official forms to research, never present an unverified filing as mandatory;
8. build a personalized bring-to-court / preparation checklist;
9. identify missing records or evidence categories that may be relevant;
10. flag time-sensitive, contempt/default, appeal, protective-order, service, and safety issues for prompt licensed-attorney or official-court verification;
11. preserve the existing Alabama legal-content publication gate and non-law-firm disclaimer.

## Non-negotiable legal/safety rules

The Prepared Parent Project is not a law firm. The system provides general educational and informational assistance, not legal advice or representation.

Never claim that a user must file a specific pleading, form, motion, answer, response, appeal, or other document unless the requirement has been verified against current authoritative Alabama sources applicable to the exact procedural posture and the system clearly distinguishes educational information from legal advice.

Never calculate or invent a deadline from memory. Extract dates stated on documents and label them as "date shown on document — verify." Any derived deadline must remain blocked until current Alabama rule/statute/case authority and local court requirements are verified.

For Alabama legal propositions, require:
- applicable Alabama statute or court rule;
- relevant published Alabama appellate authority where interpretation materially depends on case law;
- official source URL;
- pinpoint support;
- factual/procedural distinctions;
- verification date;
- current-treatment check;
- review status.

If required authority is incomplete, show "LEGAL REVIEW REQUIRED" and do not convert the output into a directive to file.

No automatic legal filing, service, signature, payment, court submission, attorney-client relationship, or unauthorized practice of law.

## Privacy and security

Treat uploaded legal documents as highly sensitive.
- Do not make uploads public.
- Do not commit user documents to GitHub.
- Do not place raw legal documents in analytics logs.
- Do not expose API keys in frontend code.
- Use secure server-side processing for PDF/DOCX/image/OCR/AI analysis.
- Encrypt data in transit.
- Use short retention by default and provide deletion controls.
- Redact or warn on SSNs, bank/account numbers, medical identifiers, children's sensitive information, and authentication credentials.
- Log only minimum necessary operational metadata.
- Use fail-closed behavior when extraction, classification, or authority verification is uncertain.

## UX

Add a prominent "Document Review" path to the existing website and navigator.

Supported categories:
- served / initial papers
- petition / complaint / summons
- motion / modification
- order / judgment
- hearing notice
- contempt / show cause
- child-support documents
- custody / parenting-time documents
- DHR / agency documents
- appeal-related documents
- protective-order / safety documents
- other family-court documents

Output sections:
- What this document appears to be
- What the document says in plain language
- Dates shown on the document
- Questions to verify immediately
- Possible filing/form categories to research
- Documents/evidence to organize
- Bring-to-court checklist
- Official sources used
- Attorney-review / urgency flags
- Clear disclaimer

## Technical implementation

Preserve the existing GitHub Pages frontend, GitHub workflows, Buffer publishing gateway, brand system, publication gates, and existing repository history.

The current static beta may perform only local file selection, filename/plain-text classification, and privacy-safe preparation. Full PDF/DOCX/image/OCR semantic review must use a secure backend or approved document-analysis service; do not expose secrets in GitHub Pages.

Build the backend as a separate secure service/API with:
- authenticated upload endpoint;
- MIME/type/size validation;
- malware-safe handling;
- text extraction for PDF/DOCX/TXT;
- OCR for scans/images;
- structured document schema;
- legal-risk classifier;
- Alabama authority retrieval/verification layer;
- deterministic safety gate before recommendations;
- audit log without raw sensitive text;
- deletion/retention controls;
- rate limiting and abuse protection.

Return structured JSON to the frontend. Never allow the model alone to decide publishability of Alabama legal propositions.

## Autonomous media system

Preserve and extend the existing content pipeline:
Verified/source-reviewed topic -> legal/safety gate -> copy -> branded image/video -> rights-cleared audio -> visual/audio QC -> platform derivatives -> Buffer -> Facebook/Instagram/YouTube -> live verification -> publication log.

Audio may use only:
- project-original synthesized audio;
- verified royalty-free audio with source/license/verification metadata;
- explicit silence.

Unknown-provenance audio must fail closed.

## Proof and completion criteria

Do not claim completion until:
- Document Review page is live and linked;
- safety/privacy validation passes;
- secure backend status is truthfully reported;
- a controlled social-media proof test posts to Facebook, Instagram, and YouTube;
- each live post URL is verified and recorded;
- no duplicate posts are created;
- all final repository validation and Pages deployment workflows pass.

Continue autonomously until complete or until a genuine external authorization/backend credential blocker requires Ronald.

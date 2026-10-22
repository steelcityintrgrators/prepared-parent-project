"use strict";

process.env.NODE_ENV="test";
process.env.ALLOWED_ORIGIN="https://steelcityintrgrators.github.io";
process.env.REVIEW_TOKEN_SECRET="test-secret-abcdefghijklmnopqrstuvwxyz-0123456789";
process.env.ENABLE_OCR="false";

const test=require("node:test");
const assert=require("node:assert/strict");
const request=require("supertest");
const {app,analyzeOne}=require("../server");

test("health reports zero-retention and legal gate", async()=>{
  const res=await request(app).get("/api/health").expect(200);
  assert.equal(res.body.zeroRetention,true);
  assert.equal(res.body.legalAuthorityGate,"ENFORCED");
});

test("review token is origin-bound", async()=>{
  await request(app).get("/api/token").set("Origin","https://evil.example").expect(403);
  const good=await request(app).get("/api/token").set("Origin","https://steelcityintrgrators.github.io").expect(200);
  assert.ok(good.body.token);
});

test("plain-text served child-support document returns structured gated report", async()=>{
  const tok=await request(app).get("/api/token").set("Origin","https://steelcityintrgrators.github.io");
  const sample=[
    "IN THE CIRCUIT COURT OF JEFFERSON COUNTY, ALABAMA",
    "Case No. DR-2026-123456",
    "JANE DOE v. JOHN DOE",
    "SUMMONS AND PETITION",
    "A hearing is set for November 12, 2026.",
    "The petition requests child support and references Rule 32 and CS-41.",
    "The respondent was served on October 22, 2026."
  ].join("\n");

  const res=await request(app)
    .post("/api/review")
    .set("Origin","https://steelcityintrgrators.github.io")
    .set("X-Review-Token",tok.body.token)
    .field("context","served")
    .field("goal","prepare for court")
    .attach("documents",Buffer.from(sample),{filename:"summons.txt",contentType:"text/plain"})
    .expect(200);

  assert.equal(res.body.zeroRetention,true);
  assert.equal(res.body.reports[0].status,"ANALYZED");
  assert.equal(res.body.reports[0].legalAuthorityGate,"LEGAL REVIEW REQUIRED");
  assert.ok(res.body.reports[0].datesShownOnDocument.length>=2);
  assert.ok(res.body.reports[0].possibleFilingCategories.some(x=>x.includes("Response")||x.includes("response")));
  assert.ok(!JSON.stringify(res.body).includes("The respondent was served on October 22, 2026."));
});

test("classifier never derives a deadline", ()=>{
  const report=analyzeOne(
    "SUMMONS. Hearing November 12, 2026. CHILD SUPPORT under Rule 32.",
    {originalname:"summons.txt",mimetype:"text/plain"},
    "served"
  );
  assert.match(report.deadlinePolicy,/No derived deadline was calculated/);
  assert.equal(report.legalAuthorityGate,"LEGAL REVIEW REQUIRED");
});

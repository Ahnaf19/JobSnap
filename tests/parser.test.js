import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { parseBdjobsHtml } from "../core/parseBdjobsHtml.js";
import { renderJobMd } from "../core/renderJobMd.js";

const fixtureDir = path.join(process.cwd(), "tests", "fixtures");

async function loadFixture(name) {
  return await fs.readFile(path.join(fixtureDir, name), "utf8");
}

test("parses job details from ng-state JSON (fixture 1)", async () => {
  const html = await loadFixture("job_details_1.html");
  const job = parseBdjobsHtml({
    html,
    url: "https://bdjobs.com/jobs/details/123",
    jobId: "123",
    savedAt: "test"
  });

  assert.equal(job.title, "AI Engineer");
  assert.equal(job.company, "Acme Ltd");
  assert.equal(job.summary.salary, "Negotiable");
  assert.equal(job.summary.experience, "3 years");
  assert.deepEqual(job.requirements.education.bullets, ["BSc in CSE"]);
  assert.deepEqual(job.requirements.experience.bullets, ["3 years"]);
  assert.deepEqual(job.requirements.additional_requirements.bullets, ["Python"]);
  assert.deepEqual(job.requirements.preferred_qualifications.bullets, ["ML"]);
  assert.ok(job.responsibilities_context.sections["About Us"].text.includes("We build things."));
  assert.ok(job.responsibilities_context.sections["Key Responsibilities"].bullets.includes("Train models"));
  assert.deepEqual(job.skills_expertise.skills, ["Artificial intelligence (AI)"]);
  assert.deepEqual(job.skills_expertise.suggested_by_bdjobs, ["Python", "Docker"]);
  assert.ok(job.compensation_other_benefits.benefits.includes("Festival Bonus"));
  assert.equal(job.compensation_other_benefits.details.workplace, "Remote");
  assert.ok(job.read_before_apply.includes("Apply with CV"));
  assert.equal(job.company_information.details.address, "Road 1, Dhaka");

  const md = renderJobMd(job);
  assert.ok(md.includes("## Requirements"));
  assert.ok(md.includes("## Responsibilities & Context"));
});

test("parses job details from ng-state JSON (fixture 2)", async () => {
  const html = await loadFixture("job_details_2.html");
  const job = parseBdjobsHtml({
    html,
    url: "https://bdjobs.com/jobs/details/456",
    jobId: "456",
    savedAt: "test"
  });

  assert.equal(job.title, "Data Scientist");
  assert.equal(job.company, "Beta Corp");
  assert.equal(job.summary.salary, "Tk. 80000 - 100000 (Monthly)");
  assert.equal(job.summary.experience, "5 years");
  assert.deepEqual(job.requirements.education.bullets, ["MSc in Statistics"]);
  assert.deepEqual(job.skills_expertise.skills, ["Python", "PyTorch"]);
  assert.deepEqual(job.skills_expertise.suggested_by_bdjobs, ["AWS", "GCP"]);
  assert.ok(job.compensation_other_benefits.benefits.includes("Health insurance"));
  assert.equal(job.compensation_other_benefits.details.employment_status, "Part Time");
  assert.equal(job.compensation_other_benefits.details.gender, "Only Male");
});

test("cleans placeholder summary values and punctuation (fixture 3)", async () => {
  const html = await loadFixture("job_details_3.html");
  const job = parseBdjobsHtml({
    html,
    url: "https://bdjobs.com/jobs/details/789",
    jobId: "789",
    savedAt: "test"
  });

  assert.equal(job.summary.vacancy, undefined);
  assert.equal(job.company_information.details.address, "House No. 31, Road 20, Dhaka");
  assert.ok(job.responsibilities_context.sections["About Us"].text.includes("discipline. We ship."));
});

test("parses fallback text with inline headings and out-of-order sections", async () => {
  const html = await loadFixture("job_details_text_1.html");
  const job = parseBdjobsHtml({
    html,
    url: "https://bdjobs.com/jobs/details/999",
    jobId: "999",
    savedAt: "test"
  });

  assert.equal(job.title, "Junior Engineer");
  assert.equal(job.company, "Example Co");
  assert.equal(job.summary.salary, "Negotiable");
  assert.equal(job.company_information.details.address, "10 Example Road, Dhaka");
  assert.deepEqual(job.requirements.additional_requirements.bullets, ["BSc in CSE", "2 years experience"]);
  assert.ok(job.responsibilities_context.sections["Key Responsibilities"].bullets.includes("Ship features"));
});

test("labels bullet-only responsibilities as Responsibilities", async () => {
  const html = await loadFixture("job_details_text_2.html");
  const job = parseBdjobsHtml({
    html,
    url: "https://bdjobs.com/jobs/details/1000",
    jobId: "1000",
    savedAt: "test"
  });

  assert.ok(job.responsibilities_context.sections.Responsibilities.bullets.includes("Maintain dashboards"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildFilename } from "../core/filename.js";

test("builds a filename from template placeholders", () => {
  const name = buildFilename({
    template: "{title}_{company}_{job_id}.md",
    title: "AI Engineer",
    company: "Acme Ltd",
    jobId: "123"
  });

  assert.equal(name, "AI_Engineer_Acme_Ltd_123.md");
});

test("appends .md if missing", () => {
  const name = buildFilename({
    template: "{title}-{job_id}",
    title: "Data Scientist",
    company: "Beta",
    jobId: "999"
  });

  assert.equal(name, "Data_Scientist-999.md");
});

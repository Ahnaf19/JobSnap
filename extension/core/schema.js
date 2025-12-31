export const REQUIRED_FIELDS = [
  "job_id",
  "url",
  "saved_at",
  "source",
  "parser_version",
  "title",
  "company",
  "summary",
  "requirements",
  "responsibilities_context",
  "company_information"
];

export const MD_HEADINGS = [
  "Summary",
  "Requirements",
  "Responsibilities & Context",
  "Skills & Expertise",
  "Compensation & Other Benefits",
  "Read Before Apply",
  "Company Information",
  "Raw Text"
];

export function validateJobSchema(job) {
  const errors = [];
  if (!job || typeof job !== "object") {
    return { ok: false, errors: ["job must be an object"] };
  }

  for (const field of REQUIRED_FIELDS) {
    const value = job[field];
    if (value === null || value === undefined) {
      errors.push(`missing ${field}`);
      continue;
    }
    if (typeof value === "string" && value.trim().length === 0) {
      errors.push(`empty ${field}`);
      continue;
    }
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
      errors.push(`empty ${field}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

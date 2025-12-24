import { normalizeWhitespace } from "./strings.js";

function yamlEscape(value) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return '""';
  if (/[:\n\r]/.test(text)) return JSON.stringify(text);
  return JSON.stringify(text).slice(1, -1);
}

function renderFrontMatter(job) {
  const lines = [
    "---",
    `job_id: ${yamlEscape(job.job_id)}`,
    `url: ${yamlEscape(job.url)}`,
    `saved_at: ${yamlEscape(job.saved_at)}`,
    `title: ${yamlEscape(job.title)}`,
    `company: ${yamlEscape(job.company)}`,
    `application_deadline: ${yamlEscape(job.application_deadline)}`,
    `published: ${yamlEscape(job.published)}`,
    `source: ${yamlEscape(job.source)}`,
    `parser_version: ${yamlEscape(job.parser_version)}`,
    "---"
  ];

  return lines.join("\n");
}

function renderSummary(summary) {
  if (!summary || Object.keys(summary).length === 0) return null;
  const lines = ["## Summary"];
  for (const [key, value] of Object.entries(summary)) {
    const label = key
      .split("_")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
    lines.push(`- ${label}: ${normalizeWhitespace(value)}`);
  }
  return lines.join("\n");
}

function renderSubsectionBlock(title, block) {
  if (!block) return null;
  const bullets = Array.isArray(block.bullets) ? block.bullets.filter(Boolean) : [];
  const text = block.text ? normalizeWhitespace(block.text) : "";
  if (!bullets.length && !text) return null;

  if (bullets.length) {
    return [`### ${title}`, ...bullets.map((item) => `- ${normalizeWhitespace(item)}`)].join("\n");
  }

  return [`### ${title}`, text].join("\n");
}

function renderRequirements(requirements) {
  if (!requirements) return null;
  const chunks = ["## Requirements"];
  const blocks = [
    renderSubsectionBlock("Education", requirements.education),
    renderSubsectionBlock("Experience", requirements.experience),
    renderSubsectionBlock("Additional Requirements", requirements.additional_requirements),
    renderSubsectionBlock("Required Skills", requirements.required_skills),
    renderSubsectionBlock("Preferred Qualifications", requirements.preferred_qualifications)
  ].filter(Boolean);

  if (blocks.length === 0) return null;
  chunks.push(blocks.join("\n\n"));
  return chunks.join("\n\n");
}

function renderTextSection(title, text) {
  const cleaned = normalizeWhitespace(text);
  if (!cleaned) return null;
  return `## ${title}\n${cleaned}`;
}

function renderResponsibilities(responsibilities) {
  if (!responsibilities) return null;
  const lines = ["## Responsibilities & Context"];
  if (responsibilities.sections) {
    for (const [title, content] of Object.entries(responsibilities.sections)) {
      const block = renderSubsectionBlock(title, content);
      if (block) lines.push(block);
    }
    if (lines.length > 1) return lines.join("\n\n");
  }
  if (responsibilities.raw_text) {
    return `## Responsibilities & Context\n${normalizeWhitespace(responsibilities.raw_text)}`;
  }
  return null;
}

function renderSkills(skills) {
  if (!skills) return null;
  const lines = ["## Skills & Expertise"];
  if (skills.skills?.length) {
    lines.push("### Skills", ...skills.skills.map((skill) => `- ${normalizeWhitespace(skill)}`));
  }
  if (skills.suggested_by_bdjobs?.length) {
    lines.push(
      "### Suggested By Bdjobs",
      ...skills.suggested_by_bdjobs.map((skill) => `- ${normalizeWhitespace(skill)}`)
    );
  }
  return lines.length > 1 ? lines.join("\n") : null;
}

function renderCompensation(compensation) {
  if (!compensation) return null;
  const lines = ["## Compensation & Other Benefits"];
  if (compensation.benefits?.length) {
    lines.push(...compensation.benefits.map((item) => `- ${normalizeWhitespace(item)}`));
  }
  if (compensation.details && Object.keys(compensation.details).length) {
    lines.push("### Details");
    for (const [key, value] of Object.entries(compensation.details)) {
      const label = key
        .split("_")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
      lines.push(`- ${label}: ${normalizeWhitespace(value)}`);
    }
  }
  return lines.length > 1 ? lines.join("\n") : null;
}

function renderCompanyInfo(companyInfo) {
  if (!companyInfo) return null;
  if (companyInfo.details && Object.keys(companyInfo.details).length) {
    const lines = ["## Company Information"];
    for (const [key, value] of Object.entries(companyInfo.details)) {
      const label = key
        .split("_")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
      lines.push(`- ${label}: ${normalizeWhitespace(value)}`);
    }
    return lines.join("\n");
  }
  if (companyInfo.raw_text) {
    return `## Company Information\n${normalizeWhitespace(companyInfo.raw_text)}`;
  }
  return null;
}

export function renderJobMd(job) {
  const chunks = [renderFrontMatter(job), `# ${normalizeWhitespace(job.title) || "Job Circular"}`];

  if (job.company) chunks.push(`**Company:** ${normalizeWhitespace(job.company)}`);
  if (job.application_deadline) chunks.push(`**Application Deadline:** ${normalizeWhitespace(job.application_deadline)}`);

  const summary = renderSummary(job.summary);
  if (summary) chunks.push(summary);

  const requirements = renderRequirements(job.requirements);
  if (requirements) chunks.push(requirements);

  const responsibilities = renderResponsibilities(job.responsibilities_context);
  if (responsibilities) chunks.push(responsibilities);

  const skills = renderSkills(job.skills_expertise);
  if (skills) chunks.push(skills);

  const compensation = renderCompensation(job.compensation_other_benefits);
  if (compensation) chunks.push(compensation);

  const readBeforeApply = renderTextSection("Read Before Apply", job.read_before_apply);
  if (readBeforeApply) chunks.push(readBeforeApply);

  const companyInfo = renderCompanyInfo(job.company_information);
  if (companyInfo) chunks.push(companyInfo);

  const hasStructured =
    summary ||
    requirements ||
    responsibilities ||
    skills ||
    compensation ||
    readBeforeApply ||
    companyInfo;

  if (!hasStructured && job.raw_text) chunks.push(`## Raw Text\n${normalizeWhitespace(job.raw_text)}`);

  return chunks.filter(Boolean).join("\n\n").trim() + "\n";
}

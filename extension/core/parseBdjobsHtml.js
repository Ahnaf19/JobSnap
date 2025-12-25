import { extractTitleTag, htmlToText } from "./html.js";
import { extractDetailsFromLines, extractLabelValuePairs } from "./kv.js";
import { normalizeWhitespace } from "./strings.js";
import { PARSER_VERSION } from "./version.js";

function escapeRegex(text) {
  return String(text ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanPageTitle(title) {
  return String(title ?? "")
    .replace(/\s*\|\s*bdjobs(\.com)?\s*$/i, "")
    .replace(/\s*-\s*bdjobs(\.com)?\s*$/i, "")
    .trim();
}

function parseTitleCompanyFromPageTitle(pageTitle) {
  const cleaned = cleanPageTitle(pageTitle);
  const separators = [" - ", " : ", " | ", " — ", " – "];
  for (const sep of separators) {
    if (!cleaned.includes(sep)) continue;
    const parts = cleaned
      .split(sep)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return { title: parts[0], company: parts[parts.length - 1] };
    }
  }

  return { title: cleaned || null, company: null };
}

function extractFirstMatch(text, regex) {
  const match = text.match(regex);
  return match?.[1] ? normalizeWhitespace(match[1]) : null;
}

function stripFooter(text) {
  const markers = [
    "report this job / company",
    "need any support?",
    "our contact centre",
    "job seekers",
    "recruiter",
    "download job seeker app",
    "download employer app",
    "our valuable partners",
    "stay connected with us"
  ];

  const lower = text.toLowerCase();
  let cutIndex = -1;
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx === -1) continue;
    if (cutIndex === -1 || idx < cutIndex) cutIndex = idx;
  }

  if (cutIndex === -1) return text;
  return text.slice(0, cutIndex).trim();
}

function removeCalloutLines(text) {
  const patterns = [
    /applicants are encouraged to submit video cv/i,
    /to access application insights/i
  ];

  const lines = text.split("\n");
  const filtered = lines.filter((line) => !patterns.some((pattern) => pattern.test(line)));
  return filtered.join("\n").trim();
}

function cleanSummaryValues(summary) {
  const cleaned = {};
  for (const [key, value] of Object.entries(summary)) {
    const firstLine = String(value ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0];
    if (!firstLine) continue;
    cleaned[key] = firstLine;
  }
  return cleaned;
}

function extractNgStateJson(html) {
  const match = String(html ?? "").match(
    /<script[^>]*id=["']ng-state["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match?.[1]) return null;
  const jsonText = match[1].trim();
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function extractJobDetailsFromState(state) {
  if (!state || typeof state !== "object") return null;
  for (const entry of Object.values(state)) {
    if (!entry?.u || !String(entry.u).includes("Job-Details")) continue;
    const data = entry?.b?.data;
    if (Array.isArray(data) && data.length) return data[0];
  }
  return null;
}

function splitCommaList(value) {
  if (!value) return null;
  const items = String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : null;
}

function normalizeCommaSpace(value) {
  return String(value ?? "").replace(/,\s*/g, ", ").trim();
}

function sliceSection(text, heading, { startIndex = 0 } = {}) {
  const pattern = new RegExp(`(^|\\n)\\s*${escapeRegex(heading)}\\s*:?(\\s*\\n|\\s*$)`, "im");
  const match = pattern.exec(text.slice(startIndex));
  if (!match) return null;
  const absoluteIndex = startIndex + match.index;
  return { index: absoluteIndex, heading };
}

function buildSectionSlices(text) {
  const order = [
    { key: "summary", headings: ["Summary"] },
    { key: "requirements", headings: ["Requirements"] },
    { key: "responsibilities_context", headings: ["Responsibilities & Context", "Responsibilities"] },
    { key: "skills_expertise", headings: ["Skills & Expertise"] },
    { key: "compensation_other_benefits", headings: ["Compensation & Other Benefits", "Salary & Benefits"] },
    { key: "read_before_apply", headings: ["Read Before Apply"] },
    { key: "company_information", headings: ["Company Information"] }
  ];

  const found = [];
  let cursor = 0;
  for (const entry of order) {
    let best = null;
    for (const heading of entry.headings) {
      const match = sliceSection(text, heading, { startIndex: cursor });
      if (!match) continue;
      if (!best || match.index < best.index) best = match;
    }
    if (!best) continue;
    found.push({ ...best, key: entry.key });
    cursor = best.index + 1;
  }

  // Convert heading start indices into section ranges.
  const ranges = [];
  for (let i = 0; i < found.length; i += 1) {
    const start = found[i].index;
    const end = i + 1 < found.length ? found[i + 1].index : text.length;
    ranges.push({ key: found[i].key, start, end });
  }
  return ranges;
}

function parseBullets(sectionText) {
  const lines = normalizeWhitespace(sectionText).split("\n");
  const bullets = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) continue;
    const bullet = trimmed.slice(2).trim();
    if (bullet) bullets.push(bullet);
  }
  return bullets;
}

function parseHtmlBullets(htmlFragment) {
  if (!htmlFragment) return null;
  const text = htmlToText(htmlFragment);
  const bullets = parseBullets(text);
  return bullets.length ? bullets : null;
}

function parseLooseLines(text, { dropHeadings = [] } = {}) {
  const dropSet = new Set(dropHeadings.map((item) => item.toLowerCase()));
  const shouldDrop = (line) => {
    const lowered = line.toLowerCase();
    if (dropSet.has(lowered)) return true;
    for (const heading of dropSet) {
      if (lowered === `${heading}:`) return true;
    }
    return false;
  };
  const lines = normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !shouldDrop(line));
  return lines.length ? lines : null;
}

function stripHeading(chunk, heading) {
  const lines = String(chunk ?? "").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  if (lines.length) {
    const normalize = (value) => value.trim().replace(/:$/, "").toLowerCase();
    if (normalize(lines[0]) === normalize(heading)) {
      lines.shift();
    }
  }
  return lines.join("\n").trim();
}

function stripAnyHeading(chunk, headings) {
  for (const heading of headings) {
    const stripped = stripHeading(chunk, heading);
    if (stripped !== String(chunk ?? "").trim()) return stripped;
  }
  return String(chunk ?? "").trim();
}

function extractSubsectionBlocks(text, headings) {
  const cleaned = normalizeWhitespace(text);
  const positions = [];
  for (const heading of headings) {
    const match = sliceSection(cleaned, heading, { startIndex: 0 });
    if (!match) continue;
    positions.push({ heading, index: match.index });
  }

  positions.sort((a, b) => a.index - b.index);
  const blocks = [];
  for (let i = 0; i < positions.length; i += 1) {
    const current = positions[i];
    const next = positions[i + 1];
    const end = next ? next.index : cleaned.length;
    const chunk = cleaned.slice(current.index, end);
    const body = stripHeading(chunk, current.heading);
    const bullets = parseBullets(body);
    const normalizedText = bullets.length ? "" : normalizeWhitespace(body);
    const textBlock = normalizedText === "-" ? "" : normalizedText;
    if (!bullets.length && !textBlock) continue;
    blocks.push({
      title: current.heading,
      bullets: bullets.length ? bullets : null,
      text: textBlock || null
    });
  }

  return blocks;
}

function extractSubsectionMap(text, items) {
  const cleaned = normalizeWhitespace(text);
  const positions = [];
  for (const item of items) {
    const match = sliceSection(cleaned, item.title, { startIndex: 0 });
    if (!match) continue;
    positions.push({ ...item, index: match.index });
  }

  positions.sort((a, b) => a.index - b.index);
  const result = {};
  for (let i = 0; i < positions.length; i += 1) {
    const current = positions[i];
    const next = positions[i + 1];
    const end = next ? next.index : cleaned.length;
    const chunk = cleaned.slice(current.index, end);
    const body = stripHeading(chunk, current.title);
    const bullets = parseBullets(body);
    const normalizedText = bullets.length ? "" : normalizeWhitespace(body);
    const textBlock = normalizedText === "-" ? "" : normalizedText;
    if (!bullets.length && !textBlock) continue;
    result[current.key] = {
      bullets: bullets.length ? bullets : null,
      text: textBlock || null
    };
  }

  return Object.keys(result).length ? result : null;
}

function parseRequirements(sectionText) {
  return extractSubsectionMap(sectionText, [
    { key: "education", title: "Education" },
    { key: "experience", title: "Experience" },
    { key: "additional_requirements", title: "Additional Requirements" },
    { key: "required_skills", title: "Required Skills" },
    { key: "preferred_qualifications", title: "Preferred Qualifications" }
  ]);
}

function parseResponsibilities(sectionText) {
  const blocks = extractSubsectionBlocks(sectionText, [
    "About Us",
    "The Role",
    "Key Responsibilities",
    "Job Context",
    "Job Responsibilities"
  ]);

  if (!blocks.length) {
    const cleaned = normalizeWhitespace(sectionText);
    return cleaned ? { raw_text: cleaned } : null;
  }

  const sections = {};
  for (const block of blocks) {
    sections[block.title] = { bullets: block.bullets, text: block.text };
  }
  return { sections };
}

function parseSkills(sectionText) {
  const cleaned = normalizeWhitespace(sectionText);
  if (!cleaned) return null;

  const lower = cleaned.toLowerCase();
  const markers = ["suggested by bdjobs", "suggested by"];
  let markerIndex = -1;
  let markerLength = 0;
  for (const marker of markers) {
    const idx = lower.indexOf(marker);
    if (idx === -1) continue;
    markerIndex = idx;
    markerLength = marker.length;
    break;
  }

  const skillsText = markerIndex === -1 ? cleaned : cleaned.slice(0, markerIndex);
  const suggestedText = markerIndex === -1 ? "" : cleaned.slice(markerIndex + markerLength);

  const headingFilter = (line) => !/^(skills\s*&\s*expertise|suggested by( bdjobs)?)$/i.test(line.trim());

  const parseChipLines = (text) => {
    const bullets = parseBullets(text);
    if (bullets.length) return bullets;
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter(headingFilter);
    return lines.length ? lines : null;
  };

  const skills = parseChipLines(skillsText);
  const suggested = parseChipLines(suggestedText);

  if (!skills && !suggested) return null;
  return {
    skills: skills ?? null,
    suggested_by_bdjobs: suggested ?? null
  };
}

function parseCompensation(sectionText) {
  const cleaned = normalizeWhitespace(stripAnyHeading(sectionText, ["Compensation & Other Benefits", "Salary & Benefits"]));
  const bullets = parseBullets(cleaned);
  const details = extractDetailsFromLines(cleaned, {
    skipHeadings: ["Compensation & Other Benefits", "Salary & Benefits"]
  });
  const result = {};
  if (bullets.length) result.benefits = bullets;
  if (Object.keys(details).length) result.details = details;
  return Object.keys(result).length ? result : null;
}

function parseCompanyInfo(sectionText) {
  const cleaned = normalizeWhitespace(stripAnyHeading(sectionText, ["Company Information"]))
    .split("\n")
    .filter((line) => !/more jobs from this company/i.test(line))
    .join("\n");
  const details = extractDetailsFromLines(cleaned, { skipHeadings: ["Company Information"] });
  if (Object.keys(details).length) return { details };
  return cleaned ? { raw_text: cleaned } : null;
}

function parseAdditionalRequirementsHtml(htmlFragment) {
  if (!htmlFragment) return null;
  const text = htmlToText(htmlFragment);
  const sections = extractSubsectionMap(text, [
    { key: "additional_requirements", title: "Requirements" },
    { key: "preferred_qualifications", title: "Preferred Qualifications" }
  ]);
  if (sections) return sections;
  const bullets = parseBullets(text);
  if (bullets.length) return { additional_requirements: { bullets } };
  const cleaned = normalizeWhitespace(text);
  if (cleaned) return { additional_requirements: { text: cleaned } };
  return null;
}

function parseJobDetails(details, { url, savedAt, jobId } = {}) {
  if (!details) return null;

  const parsedJobId = jobId ?? details.JobId ?? details.JobID ?? null;
  const title = details.JobTitle ?? details.JobTitleEN ?? details.JobTitleENG ?? null;
  const company =
    details.CompanyNameENG ??
    details.CompnayName ??
    details.CompanyName ??
    details.CompanyNameEn ??
    null;

  const educationBullets = parseHtmlBullets(details.EducationRequirements);
  const experienceBullets = parseHtmlBullets(details.experience);
  const additionalMap = parseAdditionalRequirementsHtml(details.AdditionJobRequirements);

  const requirements = {};
  if (educationBullets?.length) requirements.education = { bullets: educationBullets };
  if (experienceBullets?.length) requirements.experience = { bullets: experienceBullets };
  if (additionalMap) Object.assign(requirements, additionalMap);

  const responsibilities_context = details.JobDescription
    ? parseResponsibilities(htmlToText(details.JobDescription))
    : null;

  const skills = splitCommaList(details.SkillsRequired);
  const suggested = splitCommaList(details.SuggestedSkills);
  const skills_expertise =
    skills || suggested
      ? {
          skills: skills ?? null,
          suggested_by_bdjobs: suggested ?? null
        }
      : null;

  let benefits = null;
  if (details.JobOtherBenifits) {
    benefits =
      parseHtmlBullets(details.JobOtherBenifits) ??
      parseLooseLines(htmlToText(details.JobOtherBenifits), { dropHeadings: ["What We Offer"] });
  }

  const compensationDetails = {};
  if (details.JobWorkPlace) compensationDetails.workplace = normalizeCommaSpace(details.JobWorkPlace);
  if (details.JobNature) compensationDetails.employment_status = details.JobNature;
  if (details.Gender && details.Gender !== "Na") compensationDetails.gender = details.Gender;
  if (details.JobLocation) compensationDetails.job_location = details.JobLocation;

  const compensation_other_benefits =
    benefits || Object.keys(compensationDetails).length
      ? {
          benefits: benefits ?? null,
          details: Object.keys(compensationDetails).length ? compensationDetails : null
        }
      : null;

  const read_before_apply = details.ApplyInstruction
    ? normalizeWhitespace(htmlToText(details.ApplyInstruction))
    : null;

  const companyDetails = {};
  if (details.CompanyAddress) companyDetails.address = normalizeWhitespace(details.CompanyAddress);
  if (details.CompanyBusiness) companyDetails.business = normalizeWhitespace(details.CompanyBusiness);

  const summary = {};
  if (details.JobVacancies) summary.vacancy = String(details.JobVacancies).trim();
  if (experienceBullets?.length) summary.experience = experienceBullets[0];
  if (details.Age && details.Age !== "Na") summary.age = String(details.Age).trim();
  if (details.JobLocation) summary.location = String(details.JobLocation).trim();
  if (details.JobSalaryRangeText || details.JobSalaryRange) {
    summary.salary = String(details.JobSalaryRangeText || details.JobSalaryRange).trim();
  }
  if (details.PostedOn) summary.published = String(details.PostedOn).trim();

  return {
    job_id: parsedJobId ?? null,
    url: url ?? (parsedJobId ? `https://bdjobs.com/jobs/details/${parsedJobId}` : null),
    saved_at: savedAt,
    source: "bdjobs",
    parser_version: PARSER_VERSION,
    title,
    company,
    application_deadline: details.Deadline ?? details.DeadlineDB ?? null,
    published: details.PostedOn ?? null,
    summary: Object.keys(summary).length ? summary : null,
    requirements: Object.keys(requirements).length ? requirements : null,
    responsibilities_context,
    skills_expertise,
    compensation_other_benefits,
    read_before_apply,
    company_information: Object.keys(companyDetails).length ? { details: companyDetails } : null,
    raw_text: null
  };
}

function parseFromText({ html, url, savedAt, jobId } = {}) {
  const titleTag = extractTitleTag(html);
  let pageText = htmlToText(html);
  pageText = stripFooter(pageText);
  pageText = removeCalloutLines(pageText);
  pageText = normalizeWhitespace(pageText);

  const header = parseTitleCompanyFromPageTitle(titleTag ?? "");
  const application_deadline =
    extractFirstMatch(pageText, /Application Deadline\s*:\s*([^\n]+)/i) ??
    extractFirstMatch(pageText, /Application Deadline\s*([^\n]+)/i);

  const sectionRanges = buildSectionSlices(pageText);
  const sectionTextByKey = {};
  for (const range of sectionRanges) {
    sectionTextByKey[range.key] = pageText.slice(range.start, range.end);
  }

  const summaryText = sectionTextByKey.summary ?? "";
  const summary = cleanSummaryValues(extractLabelValuePairs(summaryText));

  const requirements = sectionTextByKey.requirements ? parseRequirements(sectionTextByKey.requirements) : null;
  const responsibilities_context = sectionTextByKey.responsibilities_context
    ? parseResponsibilities(sectionTextByKey.responsibilities_context)
    : null;
  const skills_expertise = sectionTextByKey.skills_expertise ? parseSkills(sectionTextByKey.skills_expertise) : null;
  const compensation_other_benefits = sectionTextByKey.compensation_other_benefits
    ? parseCompensation(sectionTextByKey.compensation_other_benefits)
    : null;
  const company_information = sectionTextByKey.company_information
    ? parseCompanyInfo(sectionTextByKey.company_information)
    : null;

  const published = summary.published ?? null;

  return {
    job_id: jobId ?? null,
    url: url ?? null,
    saved_at: savedAt,
    source: "bdjobs",
    parser_version: PARSER_VERSION,
    title: header.title,
    company: header.company,
    application_deadline,
    published,
    summary: Object.keys(summary).length ? summary : null,
    requirements,
    responsibilities_context,
    skills_expertise,
    compensation_other_benefits,
    read_before_apply: sectionTextByKey.read_before_apply
      ? normalizeWhitespace(stripAnyHeading(sectionTextByKey.read_before_apply, ["Read Before Apply"]))
      : null,
    company_information,
    raw_text: pageText
  };
}

function isEmptyValue(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

function mergeJobs(primary, fallback) {
  if (!primary) return fallback;
  const merged = { ...primary };
  for (const [key, value] of Object.entries(fallback ?? {})) {
    if (isEmptyValue(merged[key])) {
      merged[key] = value;
    }
  }
  return merged;
}

function parseFromState({ html, url, savedAt, jobId } = {}) {
  const state = extractNgStateJson(html);
  const details = extractJobDetailsFromState(state);
  if (!details) return null;
  return parseJobDetails(details, { url, savedAt, jobId });
}

export function parseBdjobsHtml({ html, url, savedAt = new Date().toISOString(), jobId = null } = {}) {
  const textJob = parseFromText({ html, url, savedAt, jobId });
  const stateJob = parseFromState({ html, url, savedAt, jobId });
  return mergeJobs(stateJob, textJob);
}

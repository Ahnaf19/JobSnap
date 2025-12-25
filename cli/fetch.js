import { CliError, ExitCode } from "./errors.js";

export async function fetchHtml(url) {
  let response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "JobSnap/0.3 (+https://localhost)"
      }
    });
  } catch (err) {
    throw new CliError(`Fetch failed: ${err?.message ?? err}`, ExitCode.FETCH_FAILED);
  }

  if (!response.ok) {
    throw new CliError(`Fetch failed: ${response.status} ${response.statusText}`, ExitCode.FETCH_FAILED);
  }

  return await response.text();
}

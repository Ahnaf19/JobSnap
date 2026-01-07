import { CliError, ExitCode } from './errors.js';

export async function fetchHtml(url) {
  let response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'JobSnap/0.3 (+https://localhost)'
      }
    });
  } catch (err) {
    throw new CliError(`Fetch failed: ${err?.message ?? err}`, ExitCode.FETCH_FAILED);
  }

  if (!response.ok) {
    const status = `${response.status} ${response.statusText}`.trim();
    let hint = 'Check the URL and try again.';
    if (response.status === 404) hint = 'The job may be expired or the URL is incorrect.';
    if (response.status === 403) hint = 'The page may require login or block automated requests.';
    throw new CliError(`Fetch failed: ${status}. ${hint}`, ExitCode.FETCH_FAILED);
  }

  return await response.text();
}

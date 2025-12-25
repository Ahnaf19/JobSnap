export function extractJobId(urlString) {
  try {
    const url = new URL(urlString);
    const match = url.pathname.match(/\/jobs\/details\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}


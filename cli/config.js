import fs from "node:fs/promises";
import path from "node:path";

import { CliError, ExitCode } from "./errors.js";

export async function loadConfig(projectRoot) {
  const configPath = path.join(projectRoot, "jobsnap.config.json");
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Config must be a JSON object.");
    }
    return data;
  } catch (err) {
    if (err?.code === "ENOENT") return {};
    throw new CliError(`Invalid jobsnap.config.json: ${err?.message ?? err}`, ExitCode.CONFIG_INVALID);
  }
}

#!/usr/bin/env node
import { runCli } from './run.js';

runCli(process.argv.slice(2), { projectRoot: process.cwd() })
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(String(err?.message ?? err));
    process.exitCode = 1;
  });

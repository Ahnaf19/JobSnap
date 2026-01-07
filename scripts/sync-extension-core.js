import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = path.resolve(process.cwd());
const sourceDir = path.join(rootDir, 'core');
const targetDir = path.join(rootDir, 'extension', 'core');

async function syncCore() {
  await fs.mkdir(targetDir, { recursive: true });
  const files = await fs.readdir(sourceDir);
  const jsFiles = files.filter((file) => file.endsWith('.js'));

  for (const file of jsFiles) {
    const src = path.join(sourceDir, file);
    const dest = path.join(targetDir, file);
    await fs.copyFile(src, dest);
  }
}

syncCore().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

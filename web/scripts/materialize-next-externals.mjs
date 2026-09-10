import { cp, lstat, readdir, readlink, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const externalModulesDirectory = path.join(appRoot, '.next', 'node_modules');

let entries = [];

try {
  entries = await readdir(externalModulesDirectory);
} catch (error) {
  if (error?.code === 'ENOENT') {
    process.exit(0);
  }

  throw error;
}

for (const entry of entries) {
  const destination = path.join(externalModulesDirectory, entry);
  const stats = await lstat(destination);

  if (!stats.isSymbolicLink()) {
    continue;
  }

  const source = path.resolve(externalModulesDirectory, await readlink(destination));
  const stagedDestination = `${destination}.materialized`;

  await rm(stagedDestination, { force: true, recursive: true });
  await cp(source, stagedDestination, {
    dereference: true,
    preserveTimestamps: true,
    recursive: true,
  });
  await rm(destination);
  await rename(stagedDestination, destination);

  console.log(`Materialized Next.js runtime package: ${entry}`);
}

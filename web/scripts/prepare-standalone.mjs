import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneApp = path.join(appRoot, '.next', 'standalone', 'web');
const standaloneRoot = path.join(appRoot, '.next', 'standalone');

if (!existsSync(path.join(standaloneApp, 'server.js'))) {
  throw new Error('Next.js standalone server was not generated.');
}

mkdirSync(path.join(standaloneApp, '.next'), { recursive: true });
cpSync(path.join(standaloneRoot, 'node_modules'), path.join(standaloneApp, 'node_modules'), { recursive: true });
cpSync(path.join(standaloneRoot, 'api', 'node_modules'), path.join(standaloneApp, 'node_modules'), { recursive: true });
cpSync(path.join(appRoot, '.next', 'static'), path.join(standaloneApp, '.next', 'static'), { recursive: true });
cpSync(path.join(appRoot, 'public'), path.join(standaloneApp, 'public'), { recursive: true });

// Turbopack can emit a hashed external-module symlink that points outside the
// selected Hostinger output directory. Replace it with a real package copy so
// the uploaded artifact remains self-contained after Hostinger relocates it.
const generatedModules = path.join(standaloneApp, '.next', 'node_modules');
if (existsSync(generatedModules)) {
  for (const entry of readdirSync(generatedModules)) {
    const modulePath = path.join(generatedModules, entry);
    if (entry.startsWith('pg-') && lstatSync(modulePath).isSymbolicLink()) {
      unlinkSync(modulePath);
      cpSync(path.join(standaloneRoot, 'api', 'node_modules', 'pg'), modulePath, { recursive: true });
    }
  }
}

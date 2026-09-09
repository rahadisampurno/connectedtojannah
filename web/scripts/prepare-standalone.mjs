import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const standaloneApp = path.join(appRoot, '.next', 'standalone', 'web');

if (!existsSync(path.join(standaloneApp, 'server.js'))) {
  throw new Error('Next.js standalone server was not generated.');
}

mkdirSync(path.join(standaloneApp, '.next'), { recursive: true });
cpSync(path.join(appRoot, '.next', 'static'), path.join(standaloneApp, '.next', 'static'), { recursive: true });
cpSync(path.join(appRoot, 'public'), path.join(standaloneApp, 'public'), { recursive: true });

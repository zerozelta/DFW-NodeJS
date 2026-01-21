import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const esmDir = join(process.cwd(), 'dist', 'esm');

const packageJson = {
  type: "module",
  imports: {
    "#lib/*": "./lib/*.js",
    "#modules/*": "./modules/*.js",
    "#guards/*": "./guards/*.js",
    "#makers/*": "./makers/*.js",
    "#listeners/*": "./listeners/*.js",
    "#types/*": "./types/*.js"
  }
}

mkdirSync(esmDir, { recursive: true });
writeFileSync(
  join(esmDir, 'package.json'),
  JSON.stringify(packageJson, null, 2) + '\n',
  'utf8'
);

console.log('Wrote dist/esm/package.json');

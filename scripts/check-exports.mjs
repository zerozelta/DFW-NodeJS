import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const esmPkgJson = join(process.cwd(), 'dist', 'esm', 'package.json');
if (!existsSync(esmPkgJson)) {
  console.error('❌ Falta dist/esm/package.json (type: module). Ejecuta el build completo.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(esmPkgJson, 'utf8'));
if (pkg.type !== 'module') {
  console.error('❌ dist/esm/package.json existe pero no tiene { "type": "module" }');
  process.exit(1);
}

const mod = await import('../dist/esm/index.js');
console.log('✅ ESM export keys:', Object.keys(mod));

if (!('DFWCore' in mod)) {
  console.error('❌ DFWCore no está en los named exports de ESM.');
  process.exit(1);
}

console.log('✅ DFWCore está disponible como named export en ESM.');

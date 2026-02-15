import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find index.d.ts
const possiblePaths = [
  path.join(__dirname, '../dist/types/src/index.d.ts'),
  path.join(__dirname, '../dist/types/components/src/index.d.ts'),
];

const srcFile = possiblePaths.find(p => fs.existsSync(p));
const destFile = path.join(__dirname, '../dist/index.d.ts');

if (srcFile) {
  fs.copyFileSync(srcFile, destFile);
  console.log('Copied index.d.ts to dist/');
} else {
  console.error('index.d.ts not found in any expected location');
  console.error('Checked:', possiblePaths);
  process.exit(1);
}

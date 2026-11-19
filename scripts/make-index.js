import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
const dir = 'public/templates';
mkdirSync(dir, { recursive: true });
const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort();
writeFileSync(dir + '/index.json', JSON.stringify(files, null, 1));
console.log('Общих шаблонов:', files.length);

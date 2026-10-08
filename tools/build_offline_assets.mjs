import fs from 'node:fs';
const files=fs.readdirSync('assets',{recursive:true}).filter(p=>fs.statSync('assets/'+p).isFile()).map(p=>'./assets/'+p.replaceAll('\\','/')).sort();
const file='sw.js',source=fs.readFileSync(file,'utf8').replace(/\nconst OFFLINE_ASSETS=.*?;\n/s,'\n');
const text=source.replace("self.addEventListener('install'",`const OFFLINE_ASSETS=${JSON.stringify(files)};\nself.addEventListener('install'`).replace('c.addAll(FILES)','c.addAll([...new Set([...FILES,...OFFLINE_ASSETS])])');
fs.writeFileSync(file,text);
console.log(`${files.length} assets prepared for offline study`);

import fs from 'node:fs';
import path from 'node:path';

// Interrompe o deploy se o pacote deixar de incluir um módulo que a PWA precisa.
const root=path.resolve('dist');
const file=name=>path.join(root,name.replace(/^\.\//,'').split(/[?#]/)[0]);
const missing=new Set();
const exists=relative=>{
 if(!relative||relative==='./')return true;
 if(!fs.existsSync(file(relative))){missing.add(relative);return false}
 return true;
};
for(const required of ['index.html','app.js','style.css','sw.js','manifest.webmanifest']){
 exists(required);
}
if(!fs.existsSync(file('sw.js')))throw new Error('dist/sw.js está ausente');
const sw=fs.readFileSync(file('sw.js'),'utf8');
const list=sw.match(/const FILES=\[([^\n]+)\];/);
if(!list)throw new Error('Lista FILES do Service Worker não encontrada');
const cached=[...list[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
for(const resource of cached)exists(resource);
const jsFiles=fs.readdirSync(root).filter(name=>name.endsWith('.js'));
for(const js of jsFiles){
 const source=fs.readFileSync(file(js),'utf8');
 for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)){
  exists(match[1]);
 }
}
if(missing.size)throw new Error('Arquivos necessários ausentes do pacote publicado: '+[...missing].join(', '));
const html=fs.readFileSync(file('index.html'),'utf8');
for(const attr of ['src','href']){
 for(const match of html.matchAll(new RegExp(attr+'="(\\.\\/[^"]+\\.(?:js|css|webmanifest)(?:\\?[^"]*)?)"','g'))){
  exists(match[1]);
 }
}
if(missing.size)throw new Error('Dependências do HTML ausentes: '+[...missing].join(', '));
console.log('Pacote PP-MT validado: '+cached.length+' arquivos de cache + '+jsFiles.length+' módulos JavaScript.');

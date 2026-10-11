// Gera recursos locais para Android/iOS sem alterar a versão web publicada.
// Executar na raiz: node mobile/prepare.mjs
import {cpSync,existsSync,mkdirSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve,extname} from 'node:path';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const MOBILE=join(ROOT,'mobile');
const DEFAULT_OUT=join(MOBILE,'www');
const ROOT_EXTENSIONS=new Set(['.js','.css','.html','.svg','.webmanifest','.png','.webp','.jpg','.jpeg','.woff','.woff2']);
const PAGES=[
 'premium.html','premium.js','premium.css','style.css','plan.js','privacidade.html','termos.html'
];
const copy=(from,to)=>{if(!existsSync(from))throw Error('Arquivo necessário não encontrado: '+from);cpSync(from,to,{recursive:true});};
const makeLanding=()=>`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PP-MT · Preparação Policial</title><link rel="stylesheet" href="./style.css"></head><body><main class="wrap legal"><h1>PP-MT — Preparação Policial</h1><p>App independente para Polícia Penal de Mato Grosso: questões, simulados, revisão e desempenho.</p><a class="button primary" href="../#inicio">Começar a estudar gratuitamente →</a><p><a href="./privacidade.html">Política de privacidade</a></p><p>Sem vínculo com órgãos do Governo de Mato Grosso.</p></main></body></html>`;

export function buildNativeBundle({root=ROOT,out=DEFAULT_OUT,includeAssets=true}={}){
 const mobile=join(root,'mobile');
 const outPath=resolve(out);
 if(outPath===resolve(root)||outPath===resolve(mobile))throw Error('Diretório de destino inválido.');
 rmSync(outPath,{recursive:true,force:true});mkdirSync(outPath,{recursive:true});
 for(const item of readdirSync(root,{withFileTypes:true})){
  if(!item.isFile()||!ROOT_EXTENSIONS.has(extname(item.name)))continue;
  copy(join(root,item.name),join(outPath,item.name));
 }
 if(includeAssets)copy(join(root,'assets'),join(outPath,'assets'));
 mkdirSync(join(outPath,'planos'),{recursive:true});
 for(const name of PAGES)copy(join(root,'planos',name),join(outPath,'planos',name));
 copy(join(mobile,'native-account.js'),join(outPath,'planos','account.js'));
 copy(join(mobile,'native-assinar.html'),join(outPath,'planos','assinar.html'));
 copy(join(mobile,'native-runtime.js'),join(outPath,'mobile-runtime.js'));
 writeFileSync(join(outPath,'planos','index.html'),makeLanding());

 const indexPath=join(outPath,'index.html');
 let index=readFileSync(indexPath,'utf8');
 const appTag='<script type="module" src="./app.js';
 if(!index.includes(appTag))throw Error('Não foi possível localizar o bootstrap do aplicativo.');
 index=index.replace(appTag,'<script src="./mobile-runtime.js"></script>'+appTag);
 // Métricas do site não são enviadas pelo app empacotado.
 index=index.replace(/<script\s+defer\s+src=["']\.\/analytics\.js[^"']*["']><\/script>/i,'');
 writeFileSync(indexPath,index);

 // Capacitor já empacota o conteúdo local; o cache PWA e o push web exigem origem http/https.
 const appPath=join(outPath,'app.js');
 let app=readFileSync(appPath,'utf8');
 const register="if('serviceWorker'in navigator)navigator.serviceWorker.register";
 if(!app.includes(register))throw Error('Não foi possível desabilitar o service worker no app nativo.');
 app=app.replace(register,"if(!window.__PPMT_NATIVE__&&'serviceWorker'in navigator)navigator.serviceWorker.register");
 writeFileSync(appPath,app);

 // Promessas de cupons geradas pelo site não devem apontar para compras fora das lojas.
 const notifications=join(outPath,'notifications.js');
 if(existsSync(notifications)){
  let s=readFileSync(notifications,'utf8');
  if(s.includes('for(const o of offers||[])'))s=s.replace('for(const o of offers||[])','for(const o of (window.__PPMT_NATIVE__?[]:offers)||[])');
  writeFileSync(notifications,s);
 }
 return {out:outPath,files:readdirSync(outPath).length,hasAssets:includeAssets};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=buildNativeBundle();
 console.log('PP-MT: pacote web nativo gerado:',result.out,'arquivos na raiz:',result.files);
}

import {build} from 'esbuild';
await build({entryPoints:['app.js'],outfile:'app.bundle.js',bundle:true,format:'esm',platform:'browser',target:['chrome100','safari15'],minify:true,legalComments:'inline'});
console.log('Aplicativo PMMG empacotado sem importações encadeadas.');

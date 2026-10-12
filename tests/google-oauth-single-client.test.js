import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

const CURRENT_VERSION=JSON.parse(readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

test('Google, login por senha e Premium usam uma unica instancia Supabase para a sessao',()=>{
 const auth=read('auth.js');
 const social=read('account-services.js');
 const app=read('app.js');
 const premium=read('planos/premium.js');
 const membership=read('planos/account.js');
 assert.match(auth,/export function getSupabaseClient\(\)\{return client\(\);\}/);
 assert.match(social,/import \{getSupabaseClient\} from '\.\/auth\.js\?v=2\.20\.4'/);
 assert.match(social,/const supabase=getSupabaseClient\(\)/);
 assert.doesNotMatch(social,/createClient\(/);
 assert.match(premium,/const filterClient=getSupabaseClient\(\)/);
 assert.match(app,/from '\.\/auth\.js\?v=2\.20\.4'/);
 assert.match(membership,/from '\.\.\/auth\.js\?v=2\.20\.4'/);
});
test('Google respeita o endereco acessado e permite retorno de checkout sem misturar origens',()=>{
 const social=read('account-services.js');
 assert.match(social,/const APP_ROOT=new URL\('\.\/',import\.meta\.url\)/);
 assert.match(social,/provider:'google'/);
 assert.match(social,/redirectTo/);
 assert.match(social,/sessionStorage\.setItem\('ppmt-google-oauth-return'/);
 assert.match(social,/export function takeGoogleAuthError\(/);
 assert.match(social,/history\.replaceState/);
 assert.doesNotMatch(social,/MP_ACCESS_TOKEN_PROD|SUPABASE_SERVICE_ROLE_KEY|client_secret/);
 const app=read('app.js');
 assert.match(app,/const oauthError=takeGoogleAuthError\(\)/);
 assert.match(app,/if\(oauthError\)\{/);
});
test('cache do PWA atualiza login em Android e iOS sem deixar modulos antigos',()=>{
 const index=read('index.html'),sw=read('sw.js'),premium=read('planos/premium.html');
 assert.ok(index.includes('app.js?v='+CURRENT_VERSION));
 assert.ok(index.includes('V '+CURRENT_VERSION));
 assert.ok(sw.includes('ppmt-'+CURRENT_VERSION+'-'));
 assert.match(sw,/account-services\.js\?v=2\.20\.4/);
 assert.match(sw,/auth\.js\?v=2\.20\.4/);
 assert.match(premium,/premium\.js\?v=2\.20\.4/);
});

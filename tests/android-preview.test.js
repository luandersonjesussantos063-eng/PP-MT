import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');

test('Android Preview não publica APK e só compila variante debug',()=>{
 const workflow=read('.github/workflows/mobile-android-debug.yml');
 assert.match(workflow,/workflow_dispatch:/);
 assert.match(workflow,/assembleDebug/);
 assert.match(workflow,/PPMT_ANDROID_DEBUG_PAYMENTS: 'true'/);
 assert.match(workflow,/assets\/questions/);
 assert.match(workflow,/versionName/);
 assert.match(workflow,/versionCode/);
 assert.match(workflow,/android-payments\.mjs/);
 assert.match(workflow,/android-payments\.js/);

 assert.ok(!workflow.includes('uses: android-actions/setup-android@v3'));
 assert.match(workflow,/actions\/upload-artifact@v4/);
 assert.doesNotMatch(workflow,/assembleRelease|bundleRelease|playstore|upload-release|google-play|fastlane|firebase appdistribution/i);
 assert.doesNotMatch(workflow,/uses:\s*.+upload-play-store/i);
});
test('empacotamento móvel usa código local e mantém identidade PP-MT',()=>{
 const cfg=JSON.parse(read('mobile/capacitor.config.json'));
 assert.equal(cfg.appId,'br.com.novabytesolucoes.ppmt');
 assert.equal(cfg.appName,'PP-MT Preparação Policial');
 assert.equal(cfg.webDir,'www');
 assert.equal(cfg.server?.url,undefined);
 assert.equal(cfg.server?.cleartext,false);
 const mobilePkg=JSON.parse(read('mobile/package.json'));
 assert.ok(mobilePkg.dependencies['@capacitor/android']);
 assert.ok(existsSync(new URL('mobile/create_android_icons.py',root)));
 const script=read('mobile/create_android_icons.py');
 assert.match(script,/icon\.svg/);
 assert.doesNotMatch(script,/https?:\/\//);
});
test('sem loja de pagamento nativa, pacote não inclui checkout externo',()=>{
 const prepare=read('mobile/prepare.mjs');
 const runtime=read('mobile/native-runtime.js');
 assert.match(prepare,/native-assinar\.html/);
 assert.match(prepare,/native-account\.js/);
 assert.match(runtime,/mercadopago\.com\.br/);
});

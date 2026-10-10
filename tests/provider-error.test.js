import test from 'node:test';
import assert from 'node:assert/strict';
import {providerErrorCode} from '../supabase/functions/ppmt-monthly-billing/provider-error.js';

test('Checkout HTTP 400 preserves invalid_token instead of hiding it behind bad_request',()=>{
 assert.equal(providerErrorCode({error:'bad_request',message:'invalid_token'}),'invalid_token');
 assert.equal(providerErrorCode({error:'invalid_token'}),'invalid_token');
});
test('diagnostics never copy arbitrary provider messages or personal information',()=>{
 assert.equal(providerErrorCode({message:'token abc for aluno@example.org'}),null);
 assert.equal(providerErrorCode({error:'Bearer abc secret'}),null);
 assert.equal(providerErrorCode({error:'PA_UNAUTHORIZED_RESULT_FROM_POLICIES'}),'PA_UNAUTHORIZED_RESULT_FROM_POLICIES');
 assert.equal(providerErrorCode(null),null);
});

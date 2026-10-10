// This endpoint is deliberately unable to issue real memberships.
export const SELLER = 3754297540;
export const BUYER = 3754297536;
export const PRICE = 19.90;
export const ORIGIN = 'https://luandersonjesussantos063-eng.github.io';
const RETURN_URL = `${ORIGIN}/PP-MT/planos/teste.html`;
export class BillingError extends Error {
 constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new BillingError(status, message); };
export function isSandboxBuyerEmail(email) {
 return typeof email === 'string' && email.length <= 254 && /^[a-z0-9._+-]+@testuser\.com$/.test(email);
}
export function checkoutUrl(value) {
 try {
  const u = new URL(value);
  if (u.protocol === 'https:' && u.hostname === 'www.mercadopago.com.br' && !u.port && !u.username && !u.password && u.pathname === '/subscriptions/checkout') return u.href;
 } catch {}
 return null;
}
export function assertSeller(user) {
 if (Number(user.id) !== SELLER || user.site_id !== 'MLB' || !user.tags?.includes('test_user')) fail(503, 'A credencial precisa pertencer ao vendedor de teste configurado.');
}
export function assertSubscription(sub, row) {
 const recurring = sub.auto_recurring;
 if (!sub.id || (row.provider_id && sub.id !== row.provider_id) || sub.external_reference !== row.external_reference || Number(sub.collector_id) !== SELLER || Number(recurring?.transaction_amount) !== PRICE || recurring?.currency_id !== 'BRL' || recurring?.frequency !== 1 || recurring?.frequency_type !== 'months') fail(502, 'A assinatura retornada não corresponde a este teste.');
 if (sub.status === 'authorized' && Number(sub.payer_id) !== BUYER) fail(502, 'A assinatura não pertence ao comprador de teste configurado.');
}
export function approvedTestPayment(payment) {
 return payment.live_mode === false && payment.status === 'approved' && Number(payment.collector_id) === SELLER && Number(payment.payer?.id) === BUYER && Number(payment.transaction_amount) === PRICE && payment.currency_id === 'BRL' && Number(payment.transaction_amount_refunded) === 0;
}
export function createHandler({authenticate, db, mercado}) {
 return async function handler(req) {
  const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const respond = (data, status=200) => new Response(JSON.stringify(data), {status,headers});
  if (req.headers.get('Origin') && req.headers.get('Origin') !== ORIGIN) return respond({error:'Origem não permitida.'},403);
  if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (req.method !== 'POST') return respond({error:'Use POST.'},405);
  try {
   const jwt = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if (!jwt) fail(401,'Entre na sua conta do PPMT.');
   const user = await authenticate(jwt);
   if (!user || user.is_anonymous) fail(401,'Entre na sua conta do PPMT.');
   if (!await db.isTester(user.id)) fail(403,'Teste restrito. Informe ao responsável o e-mail da sua conta PPMT para liberar seu acesso.');
   const raw = await req.text();
   if (raw.length > 2048) fail(400,'Solicitação muito grande.');
   let input;
   try { input = JSON.parse(raw); } catch { fail(400,'Solicitação inválida.'); }
   if (!['create','status','cancel','buyer_info'].includes(input?.action)) fail(400,'Ação inválida.');
   // Request user_id, amount, provider_id and redirects are never accepted.
   // Consulta somente a conta compradora de TESTE previamente configurada.
   // Não cria, cobra ou altera assinaturas; nunca revela dados fora do e-mail validado.
   if (input.action === 'buyer_info') {
     const token = await db.token();
     if (!token) fail(503,'Credencial de teste ainda não configurada.');
     const mp = (path) => mercado(token,path,'GET');
     assertSeller(await mp('/users/me'));
     let buyer;
     try { buyer = await mp('/users/' + BUYER); }
     catch { fail(503,'O Mercado Pago não liberou a identificação do comprador por esta API. Não vamos inventar o e-mail.'); }
     const email = typeof buyer?.email === 'string' ? buyer.email.trim().toLowerCase() : '';
     if (Number(buyer?.id) !== BUYER || !isSandboxBuyerEmail(email)) fail(503,'O Mercado Pago não forneceu um e-mail de teste validado para este comprador.');
     return respond({sandbox:true,buyer_email:email,buyer_verified:true});
   }
   let row = await db.get(user.id);
   if (input.action !== 'create' && !row) return respond({sandbox:true,state:'none',payment_confirmed:false});
   const token = await db.token();
   if (!token) fail(503,'Credencial de teste ainda não configurada.');
   const mp = (path, method='GET',body) => mercado(token,path,method,body);
   assertSeller(await mp('/users/me'));
   if (!row) {
    const email = String(input.payer_email ?? '').trim().toLowerCase();
    if (!isSandboxBuyerEmail(email)) fail(400,'Informe o e-mail @testuser.com da conta compradora de teste.');
    row = await db.claim(user.id);
    if (!row) fail(409,'O teste já está sendo criado. Aguarde e consulte o resultado.');
    // Claim before POST. Ambiguous failures are recovered by reference; never
    // automatically repeat a POST, even after a timeout or a function restart.
    try {
     const sub = await mp('/preapproval','POST',{
      reason:'PPMT Premium — TESTE', external_reference:row.external_reference,
      payer_email:email, auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:PRICE,currency_id:'BRL'},
      back_url:RETURN_URL,status:'pending'
     });
     assertSubscription(sub,row);
     await db.update(user.id,{provider_id:sub.id,state:sub.status});
     row = {...row,provider_id:sub.id};
    } catch (error) {
     await db.update(user.id,{state:'needs_review'});
     throw error;
    }
   }
   if (!row.provider_id) {
    const search = await mp(`/preapproval/search?external_reference=${encodeURIComponent(row.external_reference)}`);
    const matches = (search.results ?? []).filter(s => s.external_reference === row.external_reference);
    if (matches.length !== 1) fail(409,'Criação ainda não confirmada. Consulte novamente em instantes. Se persistir, precisamos revisar este teste antes de tentar outro.');
    assertSubscription(matches[0],row);
    row = {...row,provider_id:matches[0].id};
    await db.update(user.id,{provider_id:row.provider_id,state:matches[0].status});
   }
   const path = `/preapproval/${encodeURIComponent(row.provider_id)}`;
   let sub = await mp(path);
   assertSubscription(sub,row);
   if (input.action === 'cancel' && sub.status !== 'cancelled') {
    sub = await mp(path,'PUT',{status:'cancelled'});
    assertSubscription(sub,row);
   }
   await db.update(user.id,{state:sub.status});
   let paid = false;
   if (input.action === 'status' && sub.status === 'authorized') {
    const invoices = await mp(`/authorized_payments/search?preapproval_id=${encodeURIComponent(row.provider_id)}&limit=20`);
    // Sandbox confirmation only, not a paid-period or entitlement calculation.
    for (const invoice of (invoices.results ?? []).slice(0,20)) {
     if (invoice.preapproval_id !== row.provider_id || invoice.payment?.status !== 'approved' || !/^\d+$/.test(String(invoice.payment?.id))) continue;
     const payment = await mp(`/v1/payments/${invoice.payment.id}`);
     if (approvedTestPayment(payment)) { paid = true; break; }
    }
   }
   return respond({sandbox:true,state:sub.status,payment_confirmed:paid,checkout_url:sub.status === 'pending' ? checkoutUrl(sub.init_point) : null});
  } catch(error) {
   // Never return provider response bodies, tokens, payer details or DB errors.
   return respond({error:error instanceof BillingError ? error.message : 'Não foi possível concluir a consulta. Tente consultar o resultado novamente.'},error instanceof BillingError ? error.status : 503);
  }
 };
}

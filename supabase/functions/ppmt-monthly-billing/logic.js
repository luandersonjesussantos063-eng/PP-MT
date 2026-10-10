// Checkout mensal PP-MT R$ 19,99. Sempre verificar transações no servidor.
// Crédito automático: assinatura via cartão. Pix/boleto/débito: nova compra por período.
export const AMOUNT=19.99;
export const SELLER=740298583;
export const ORIGIN='https://luandersonjesussantos063-eng.github.io';
export const BACK_URL=ORIGIN+'/PP-MT/planos/assinar.html';
export const WEBHOOK_URL='https://fermfbmhwlafwopwndoj.supabase.co/functions/v1/ppmt-monthly-webhook';
export class BillingError extends Error {
 constructor(status,message){super(message);this.status=status;}
}
const fail=(code,msg)=>{throw new BillingError(code,msg);};
export const isSeller=u=>Number(u?.id)===SELLER && u?.site_id==='MLB' && !u?.tags?.includes('test_user');
export const safeUrl=(url,card=false)=>{
 if(typeof url!=='string')return null;
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='www.mercadopago.com.br'||u.port||u.username||u.password)return null;
  if(card)return u.pathname==='/subscriptions/checkout'?u.href:null;
  return (u.pathname==='/checkout/v1/redirect'||u.pathname.startsWith('/checkout/')||u.pathname.startsWith('/sales/checkout/'))?u.href:null;
 }catch{return null;}
};
export function verifiedPayment(payment,reference){
 return payment &&
  payment.live_mode===true &&
  Number(payment.collector_id)===SELLER &&
  Number(payment.transaction_amount)===AMOUNT &&
  payment.currency_id==='BRL' &&
  String(payment.external_reference||'')===String(reference) &&
  typeof payment.id!=='undefined' &&
  /^[0-9]{1,25}$/.test(String(payment.id));
}
// A identidade de uma cobrança recorrente vem da fatura vinculada ao preapproval_id,
// não necessariamente do external_reference da transação do cartão.
export const verifiedCardPayment=p=>p&&p.live_mode===true&&Number(p.collector_id)===SELLER&&Number(p.transaction_amount)===AMOUNT&&p.currency_id==='BRL'&&/^[0-9]{1,25}$/.test(String(p.id));
export function paidStatus(p){
 return p?.status==='approved' && Number(p.transaction_amount_refunded||0)===0;
}
export function makeHandler({authenticate,db,mp}){
 return async(req)=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
  const output=(x,status=200)=>new Response(JSON.stringify(x),{status,headers});
  if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return output({error:'Origem não autorizada.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return output({error:'Use POST.'},405);
  try{
   const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!token)fail(401,'Faça login no PP-MT.');
   const user=await authenticate(token);
   if(!user||user.is_anonymous||!user.email_confirmed_at||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email||''))fail(401,'Entre em uma conta PPMT com e-mail confirmado.');
   if(Number(req.headers.get('content-length')||'0')>512)fail(413,'Requisição muito grande.');
   const raw=await req.text();if(raw.length>512)fail(413,'Requisição muito grande.');
   let body;try{body=JSON.parse(raw);}catch{fail(400,'JSON inválido.');}
   if(!['status','manual_checkout','card_start','card_cancel','readiness'].includes(body?.action))fail(400,'Ação inválida.');
   if(body.action==='readiness'){
    if(!await db.isTester(user.id))fail(403,'Diagnóstico restrito ao administrador.');
    const flags=await db.diagnostics();
    const token=await db.token();
    let merchant_valid=false;
    if(token)try{merchant_valid=isSeller(await mp(token,'/users/me'));}catch{}
    return output({price:AMOUNT,month:true,enabled:await db.enabled(),pilot_enabled:await db.privatePilot(user.id),checks:{
      merchant_valid,webhook_secret_present:flags.webhook_secret_present,
      delivery_flag:flags.delivery_flag,billing_flag:flags.billing_flag
    }});
   }
   const enabled=(await db.enabled()) || (await db.privatePilot(user.id));
   if(['manual_checkout','card_start'].includes(body.action)&&!enabled)fail(503,'As vendas ainda não estão abertas. O teste Pix permanece separado.');
   const member=await db.member(user.id);
   const result={price:AMOUNT,month:true,enabled,premium:Boolean(member?.status==='active'&&member?.current_period_end&&Date.parse(member.current_period_end)>Date.now()),current_period_end:member?.current_period_end??null};
   // Mesmo que novas vendas sejam suspensas, permitir consultar e cancelar assinatura existente.
   // Se não houver token configurado, mostramos pelo menos a vigência do acesso.
   if(body.action==='status'&&!enabled&&!(await db.token()))return output({...result,manual:null,card:null});
   const access=await db.token();
   if(!access)fail(503,'Mercado Pago de produção não configurado.');
   const mercado=(path,method='GET',payload=null,key=null)=>mp(access,path,method,payload,key);
   const seller=await mercado('/users/me');
   if(!isSeller(seller))fail(503,'Credencial Mercado Pago não corresponde ao vendedor de produção.');
   const syncCard=async(card)=>{
    if(!card?.provider_id)return card;
    const sub=await mercado('/preapproval/'+encodeURIComponent(card.provider_id));
    if(String(sub?.external_reference)!==card.external_reference||Number(sub?.collector_id)!==SELLER||
      Number(sub?.auto_recurring?.transaction_amount)!==AMOUNT||sub?.auto_recurring?.currency_id!=='BRL'||
      sub?.auto_recurring?.frequency!==1||sub?.auto_recurring?.frequency_type!=='months')
      fail(502,'A assinatura consultada não corresponde ao seu plano.');
    const state=['authorized','paused','cancelled'].includes(sub.status)?sub.status:'pending';
    await db.updateCard(user.id,{state});
    if(sub.status==='authorized'||sub.status==='cancelled'||sub.status==='paused'){
     const resp=await mercado('/authorized_payments/search?preapproval_id='+encodeURIComponent(card.provider_id)+'&limit=30');
     for(const invoice of (resp.results||[]).slice(0,30)){
      const paymentId=invoice?.payment?.id;
      if(invoice.preapproval_id!==card.provider_id||!/^[0-9]{1,25}$/.test(String(paymentId||'')))continue;
      const payment=await mercado('/v1/payments/'+paymentId);
      if(!verifiedCardPayment(payment))continue;
      if(paidStatus(payment))await db.credit(user.id,payment,'card');
      else if(['refunded','charged_back'].includes(payment.status)||Number(payment.transaction_amount_refunded||0)>0)await db.void(payment.id);
     }
    }
    return {...card,state,checkout_url:state==='pending'?safeUrl(sub.init_point,true):null};
   };
   const syncManual=async(order)=>{
    if(!order)return null;
    if(!order.provider_preference_id)return {...order,checkout_url:null};
    // Não confie no redirect: somente pagos conferidos no provedor contam.
    const response=await mercado('/v1/payments/search?external_reference='+encodeURIComponent(order.id)+'&limit=25');
    let paid=false;
    for(const brief of (response.results||[]).slice(0,25)){
      if(!/^[0-9]{1,25}$/.test(String(brief?.id||'')))continue;
      const p=await mercado('/v1/payments/'+brief.id);
      if(!verifiedPayment(p,order.id))continue;
      if(paidStatus(p)){await db.credit(user.id,p,'manual',order.id);paid=true;}
      else if(['refunded','charged_back'].includes(p.status)||Number(p.transaction_amount_refunded||0)>0)await db.void(p.id);
    }
    if(paid){await db.updateOrder(order.id,{state:'paid'});return {...order,state:'paid',checkout_url:null};}
    if(new Date(order.expires_at).getTime()<=Date.now()) {
      await db.updateOrder(order.id,{state:'expired'});
      return {...order,state:'expired',checkout_url:null};
    }
    return {...order,checkout_url:safeUrl(order.checkout_url)};
   };
   let card=await db.card(user.id);
   if(body.action==='card_cancel'){
    if(!card?.provider_id)fail(409,'Não há assinatura de cartão para cancelar.');
    const sub=await mercado('/preapproval/'+encodeURIComponent(card.provider_id));
    if(sub.status!=='cancelled')await mercado('/preapproval/'+encodeURIComponent(card.provider_id),'PUT',{status:'cancelled'});
    await db.updateCard(user.id,{state:'cancelled',checkout_url:null});
    return output({...result,message:'Renovação automática cancelada. Pagamentos já aprovados permanecem válidos até seu vencimento.'});
   }
   if(body.action==='card_start'){
    const waiting=await db.openOrder(user.id);
    if(waiting)fail(409,'Existe um pagamento Pix, boleto ou débito pendente. Resolva-o antes de autorizar o cartão automático.');
    if(!card&&member?.status==='active'&&member.current_period_end&&Date.parse(member.current_period_end)-Date.now()>7*86400000)
      fail(409,'Você já possui um mês pago. Autorize o cartão nos últimos 7 dias do período para evitar duas cobranças.');
    if(card) {
      if(!card.provider_id)fail(409,'Há uma solicitação de assinatura em revisão. Não criaremos outra cobrança.');
      card=await syncCard(card);
      if(card.state==='cancelled')fail(409,'Você já cancelou sua assinatura de cartão. Contate o suporte para reativação.');
      return output({...result,card:{state:card.state,checkout_url:card.checkout_url}});
    }
    card=await db.claimCard(user.id);
    if(!card)fail(409,'A assinatura está sendo preparada. Consulte novamente.');
    try{
      const sub=await mercado('/preapproval','POST',{
       reason:'PPMT Premium — R$ 19,99 por mês',
       external_reference:card.external_reference,
       payer_email:user.email,
       auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:AMOUNT,currency_id:'BRL'},
       back_url:BACK_URL,status:'pending'
      },card.external_reference);
      if(!sub?.id||String(sub.external_reference)!==card.external_reference||
        Number(sub.collector_id)!==SELLER||Number(sub.auto_recurring?.transaction_amount)!==AMOUNT||
        sub.auto_recurring?.frequency!==1||sub.auto_recurring?.frequency_type!=='months')
        fail(502,'A assinatura retornada não corresponde ao plano de R$ 19,99.');
      await db.updateCard(user.id,{provider_id:sub.id,state:'pending',checkout_url:safeUrl(sub.init_point,true)});
      return output({...result,card:{state:'pending',checkout_url:safeUrl(sub.init_point,true)}});
    }catch(e){await db.updateCard(user.id,{state:'needs_review'});throw e;}
   }
   let order=await db.openOrder(user.id);
   if(body.action==='manual_checkout'){
    if(card?.provider_id){
      const checked=await syncCard(card);
      if(checked.state==='authorized')fail(409,'Sua assinatura do cartão já renova automaticamente. Cancele a renovação antes de solicitar uma cobrança manual.');
    }
    if(member?.status==='active'&&member.current_period_end && Date.parse(member.current_period_end)-Date.now()>7*86400000)
      fail(409,'Seu plano já está ativo. A próxima mensalidade poderá ser paga nos últimos 7 dias de vigência.');
    if(!order) {
      order=await db.claimOrder(user.id);
      if(!order)fail(409,'Uma cobrança já está em preparação.');
      try{
       const response=await mercado('/checkout/preferences','POST',{
        items:[{id:'ppmt-premium-30d',title:'PPMT Premium — 1 mês',description:'Acesso mensal, renovação manual por Pix, boleto ou cartão de débito',quantity:1,currency_id:'BRL',unit_price:AMOUNT}],
        payer:{email:user.email},
        external_reference:order.id,
        back_urls:{success:BACK_URL+'?resultado=aprovado',pending:BACK_URL+'?resultado=pendente',failure:BACK_URL+'?resultado=falhou'},
        notification_url:WEBHOOK_URL,
        expires:true,expiration_date_from:new Date().toISOString(),expiration_date_to:new Date(order.expires_at).toISOString(),
        statement_descriptor:'PPMT'
       },order.id);
       const url=safeUrl(response?.init_point);
       if(!response?.id||!url)fail(502,'Mercado Pago não retornou um checkout oficial válido.');
       await db.updateOrder(order.id,{provider_preference_id:String(response.id),checkout_url:url,state:'pending'});
       return output({...result,manual:{state:'pending',checkout_url:url}});
      }catch(e){await db.updateOrder(order.id,{state:'needs_review'});throw e;}
    }
    order=await syncManual(order);
    return output({...result,manual:{state:order.state,checkout_url:order.checkout_url}});
   }
   if(card)card=await syncCard(card);
   if(order)order=await syncManual(order);
   const updated=await db.member(user.id);
   return output({...result,
    premium:updated?.status==='active'&&Date.parse(updated.current_period_end)>Date.now(),
    current_period_end:updated?.current_period_end??null,
    card:card?{state:card.state,checkout_url:card.checkout_url||null}:null,
    manual:order?{state:order.state,checkout_url:order.checkout_url||null}:null
   });
  }catch(e){return output({error:e instanceof BillingError?e.message:'Consulta indisponível. Não gere outra cobrança sem verificar a situação.'},e instanceof BillingError?e.status:503);}
 };
}

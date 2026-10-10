// Webhook Mercado Pago: assinatura HMAC obrigatória, nunca acredita no corpo
// para aprovar pedidos. Sempre relê a transação na API oficial de produção.
export const SELLER=740298583;
export const AMOUNT=19.99;
export const PILOT_AMOUNT=0.01;
export function trustedCentavoPix(p){
 return p && p.live_mode===true &&
  Number(p.collector_id)===SELLER &&
  Number(p.transaction_amount)===PILOT_AMOUNT &&
  p.currency_id==='BRL' && p.payment_method_id==='pix' &&
  /^[0-9]{1,25}$/.test(String(p.id)) &&
  /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(String(p.external_reference||'')); 
}
export function trustedPayment(p){
 return p&&p.live_mode===true&&Number(p.collector_id)===SELLER&&Number(p.transaction_amount)===AMOUNT&&p.currency_id==='BRL'&&/^[0-9]{1,25}$/.test(String(p.id));
}
export function signatureParts(header){
 const fields=Object.fromEntries(String(header||'').split(',').map(part=>part.trim().split('=').map(x=>x.trim())).filter(x=>x.length===2));
 if(!/^\d{10,16}$/.test(fields.ts||'')||!/^[a-f0-9]{64}$/i.test(fields.v1||''))return null;
 return fields;
}
export async function checkSignature({secret,signature,requestId,id}){
 if(!secret||!requestId||!/^[a-zA-Z0-9_-]{1,150}$/.test(requestId)||!id||id.length>100)return false;
 const p=signatureParts(signature);if(!p)return false;
 const timestamp=Number(p.ts),ms=p.ts.length>12?timestamp:timestamp*1000;
 if(!Number.isFinite(ms)||Math.abs(Date.now()-ms)>24*60*60*1000)return false;
 // Manifesto idêntico ao WebhookSignatureValidator do SDK oficial Mercado Pago.
 // A assinatura secreta nunca inclui quebras ou espaços externos copiados do painel.
 const msg='id:'+id+';request-id:'+requestId+';ts:'+p.ts+';';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret.trim()),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(msg)));
 const expected=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
 let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^p.v1.toLowerCase().charCodeAt(i);
 return diff===0;
}
export function webhookHandler({secret,token,db,mp}){
 const respond=(status=200)=>new Response('OK',{status,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}});
 return async(req)=>{
  if(req.method!=='POST')return respond(405);
  const url=new URL(req.url);
  const resourceId=url.searchParams.get('data.id')||'';
  const secretValue=await secret();
  const signature=req.headers.get('x-signature');
  const requestId=req.headers.get('x-request-id');
  const approved=await checkSignature({secret:secretValue,signature,requestId,id:resourceId});
  if(!approved){
   // Somente flags diagnósticas; nunca registrar URL completa, segredo, HMAC ou identificador.
   const parts=signatureParts(signature);
   console.warn('PPMT webhook: assinatura não validada', {
    secret_configured:Boolean(secretValue),
    signature_present:Boolean(signature),
    signature_format_valid:Boolean(parts),
    request_id_present:Boolean(requestId),
    resource_id_present:Boolean(resourceId),
    timestamp_recent:Boolean(parts&&Math.abs(Date.now()-(parts.ts.length>12?Number(parts.ts):Number(parts.ts)*1000))<=24*60*60*1000),
    secret_has_outer_whitespace:Boolean(secretValue&&secretValue!==secretValue.trim()),
    secret_has_outer_quotes:Boolean(secretValue&&((secretValue.startsWith('"')&&secretValue.endsWith('"'))||(secretValue.startsWith("'")&&secretValue.endsWith("'"))))
   });
   return respond(401);
  }
  const text=await req.text();if(text.length>4096)return respond(413);
  let event;try{event=JSON.parse(text);}catch{return respond(400);}
  const kind=String(event.type||'');
  if(!['payment','subscription_preapproval','subscription_authorized_payment'].includes(kind))return respond();
  if(String(event.data?.id||'').toLowerCase()!==resourceId.toLowerCase()||
     (event.user_id!=null&&Number(event.user_id)!==SELLER))return respond(400);
  // A notificação simulada pelo painel MP usa live_mode=false e um ID fictício.
  // Depois de VALIDAR a assinatura, reconhecer apenas o evento de teste,
  // sem consultar o MP, criar cobrança ou alterar acesso Premium.
  if(event.live_mode===false) return respond(200);
  if(resourceId==='123456' && event.id==='123456' &&
      event.date==='2021-11-01T02:02:02Z' &&
      kind==='subscription_preapproval') return respond(200);
  const access=await token();if(!access)return respond(503);
  const get=path=>mp(access,path);
  // A operação pode se repetir: os IDs de transações têm UNIQUE no banco.
  try{
   if(kind==='payment'&&/^\d{1,25}$/.test(resourceId)){
    const p=await get('/v1/payments/'+resourceId);
    // Pix de R$ 0,01, cadastrado na tabela de piloto restrito:
    // somente a API oficial valida a transação. Nunca alterar mensalidades reais.
    if(trustedCentavoPix(p)){
     const testOrder=await db.centavoByPayment(String(p.id));
     if(testOrder?.provider_payment_id===String(p.id)&&
        String(testOrder.id)===String(p.external_reference)){
      if(p.status==='approved' && p.date_approved &&
         Number.isFinite(Date.parse(p.date_approved)) &&
         Number(p.transaction_amount_refunded||0)===0)
        await db.approveCentavo(testOrder.id,String(p.id));
      else if(['refunded','charged_back'].includes(p.status)||
              Number(p.transaction_amount_refunded||0)>0)
        await db.revokeCentavo(testOrder.id,String(p.id));
     }
     return respond();
    }
    if(!trustedPayment(p))return respond();
    const order=await db.orderById(p.external_reference);
    if(order&&order.provider_preference_id){
     if(p.status==='approved'&&Number(p.transaction_amount_refunded||0)===0){
      await db.credit(order.user_id,p,'manual',order.id);
      await db.updateOrder(order.id,{state:'paid'});
     }else if(['refunded','charged_back'].includes(p.status)||Number(p.transaction_amount_refunded||0)>0){
      await db.void(p.id);
     }
    }
    return respond();
   }
   if(kind==='subscription_preapproval'||kind==='subscription_authorized_payment'){
    let card=null;
    if(kind==='subscription_preapproval'){
     // Simulações assinadas com IDs fictícios devem ser reconhecidas sem tocar em alunos.
     // Assinaturas desconhecidas não podem gerar crédito nem exigir consulta à API.
     card=await db.cardByProvider(resourceId);
     if(!card?.provider_id)return respond();
     const sub=await get('/preapproval/'+encodeURIComponent(card.provider_id));
     if(Number(sub?.collector_id)!==SELLER)return respond();
    }else{
     // O ID desta notificação representa uma fatura autorizada.
     const invoice=await get('/authorized_payments/'+encodeURIComponent(resourceId));
     card=await db.cardByProvider(invoice?.preapproval_id);
    }
    if(!card?.provider_id)return respond();
    const sub=await get('/preapproval/'+encodeURIComponent(card.provider_id));
    if(String(sub.external_reference)!==card.external_reference||Number(sub.collector_id)!==SELLER||
       Number(sub.auto_recurring?.transaction_amount)!==AMOUNT||
       sub.auto_recurring?.frequency!==1||sub.auto_recurring?.frequency_type!=='months')return respond();
    const invoices=await get('/authorized_payments/search?preapproval_id='+encodeURIComponent(card.provider_id)+'&limit=30');
    for(const item of (invoices.results||[]).slice(0,30)){
     if(item.preapproval_id!==card.provider_id||!/^\d{1,25}$/.test(String(item.payment?.id||'')))continue;
     const p=await get('/v1/payments/'+item.payment.id);
     if(!trustedPayment(p))continue;
     if(p.status==='approved'&&Number(p.transaction_amount_refunded||0)===0)await db.credit(card.user_id,p,'card');
     else if(['refunded','charged_back'].includes(p.status)||Number(p.transaction_amount_refunded||0)>0)await db.void(p.id);
    }
    await db.updateCard(card.user_id,{state:['authorized','cancelled','paused'].includes(sub.status)?sub.status:'pending'});
    return respond();
   }
   return respond();
  }catch{
   // HTTP 503 instrui o provedor a tentar novamente sem duplicar créditos.
   return respond(503);
  }
 };
}

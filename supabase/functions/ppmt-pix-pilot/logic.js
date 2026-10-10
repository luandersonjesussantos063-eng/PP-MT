// Uma única compra real, experimental, de R$ 0,01 por usuário autorizado.
// Não configura assinatura, renovação automática ou liberação de Premium.
export const CENTAVO = 0.01;
export const SELLER_REAL = 740298583; // Conta de produção mostrada no Mercado Pago.
export const ORIGIN = 'https://luandersonjesussantos063-eng.github.io';

export class PixError extends Error {
  constructor(status,message){super(message);this.status=status;}
}
const fail=(status,message)=>{throw new PixError(status,message);};
const safeTicket = value=>{
  if(typeof value!=='string')return null;
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||!['www.mercadopago.com.br','mercadopago.com.br'].includes(u.hostname)||u.port||u.username||u.password)return null;
    return u.href;
  }catch{return null;}
};
export function isRealPixPayment(payment,row){
  return payment && String(payment.id)===String(row.provider_id) &&
    payment.live_mode===true && Number(payment.collector_id)===SELLER_REAL &&
    Number(payment.transaction_amount)===CENTAVO && payment.currency_id==='BRL' &&
    payment.payment_method_id==='pix' && payment.external_reference===row.id &&
    Number(payment.transaction_amount_refunded||0)===0;
}
function safeStatus(status){
  if(status==='approved')return 'approved';
  if(status==='cancelled')return 'cancelled';
  if(status==='refunded'||status==='charged_back')return 'refunded';
  if(status==='rejected')return 'rejected';
  if(status==='expired')return 'expired';
  return 'pending';
}
function result(payment,row){
  if(!isRealPixPayment(payment,row))fail(502,'Não foi possível validar os dados do pagamento. Nenhum acesso foi liberado.');
  const state=safeStatus(payment.status);
  const detail=payment.point_of_interaction?.transaction_data||{};
  return {
    amount:CENTAVO,
    state,
    payment_confirmed:state==='approved',
    recurring:false,
    premium_granted:false,
    pix_code:state==='pending'&&typeof detail.qr_code==='string'&&detail.qr_code.length<2500?detail.qr_code:null,
    ticket_url:state==='pending'?safeTicket(detail.ticket_url):null
  };
}
export function createHandler({authenticate,db,mercado}){
  return async function(req){
    const headers={
      'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
      'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'
    };
    const respond=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers});
    if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return respond({error:'Origem não autorizada.'},403);
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return respond({error:'Use POST.'},405);
    try{
      const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if(!token)fail(401,'Entre com sua conta PPMT.');
      const user=await authenticate(token);
      if(!user || user.is_anonymous || !user.email_confirmed_at || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email||''))fail(401,'A conta PPMT precisa ter e-mail confirmado.');
      if(!await db.isTester(user.id))fail(403,'Este Pix real está restrito ao administrador autorizado.');
      const raw=await req.text();
      if(raw.length>120)fail(400,'Requisição inválida.');
      let input;try{input=JSON.parse(raw);}catch{fail(400,'JSON inválido.');}
      if(!['check','create','status'].includes(input?.action))fail(422,'Ação desconhecida.');
      const enabled=await db.isEnabled();
      const mpToken=await db.token();
      if(input.action==='check')return respond({amount:CENTAVO,enabled:enabled&&!!mpToken,recurring:false});
      if(!enabled||!mpToken)fail(503,'Pix real ainda não configurado. É necessário habilitar a integração com credencial de produção.');
      const mp=(path,method='GET',body=null,idempotency=null)=>mercado(mpToken,path,method,body,idempotency);
      const seller=await mp('/users/me');
      if(Number(seller?.id)!==SELLER_REAL || seller?.tags?.includes('test_user'))fail(503,'A credencial não corresponde à conta real de recebimento prevista.');
      let row=await db.get(user.id);
      if(input.action==='status'&&!row)return respond({amount:CENTAVO,state:'none',payment_confirmed:false,recurring:false,premium_granted:false});
      if(input.action==='create'&&!row){
        row=await db.claim(user.id);
        if(!row)fail(409,'Já existe uma tentativa de pagamento. Consulte a situação.');
        try{
          // Valor, método de pagamento e destinatário são definidos somente no servidor.
          const payment=await mp('/v1/payments','POST',{
            transaction_amount:CENTAVO,description:'PPMT — verificação única de Pix (um centavo)',
            payment_method_id:'pix', payer:{email:user.email},external_reference:row.id
          },row.id);
          // Só usa um ID de pagamento confirmado pela resposta da API.
          if(!payment?.id || !isRealPixPayment(payment,{...row,provider_id:String(payment.id)})){
            await db.update(row.id,{state:'needs_review'});
            fail(502,'O Mercado Pago retornou dados inconsistentes. A cobrança precisa de revisão.');
          }
          await db.update(row.id,{provider_id:String(payment.id),state:safeStatus(payment.status)});
          row={...row,provider_id:String(payment.id)};
          return respond(result(payment,row));
        }catch(error){
          await db.update(row.id,{state:'needs_review'});
          throw error;
        }
      }
      if(!row?.provider_id)fail(409,'Tentativa anterior em análise. Não criamos uma segunda cobrança.');
      const payment=await mp('/v1/payments/'+encodeURIComponent(row.provider_id));
      if(!isRealPixPayment(payment,row))fail(502,'Pagamento não corresponde ao valor, conta ou comprador esperado.');
      const state=safeStatus(payment.status);
      await db.update(row.id,{state});
      return respond(result(payment,row));
    }catch(error){
      const message=error instanceof PixError?error.message:'Não foi possível consultar o Mercado Pago. Não tente outro pagamento antes de verificar a situação.';
      return respond({error:message},error instanceof PixError?error.status:503);
    }
  };
}

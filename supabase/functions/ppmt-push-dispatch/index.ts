import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { sendPushNotification } from "npm:@mmmike/web-push@1.3.0/send";
const db=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",{auth:{persistSession:false,autoRefreshToken:false}});
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async request=>{
 if(request.method!=="POST")return json({error:"method"},405);
 try {
  const {data:cfg,error:configError}=await db.rpc("ppmt_push_credentials");
  if(configError||!cfg?.ppmt_webpush_cron)return json({error:"unavailable"},503);
  if(request.headers.get("x-ppmt-cron")!==cfg.ppmt_webpush_cron)return json({error:"forbidden"},403);
  const {data:subs,error:subError}=await db.from("ppmt_push_subscriptions").select("id,user_id,endpoint,p256dh,auth_secret,created_at").limit(500);
  if(subError)throw subError;
  if(!subs?.length)return json({subscriptions:0,sent:0});
  const {data:offers,error:offerError}=await db.from("ppmt_admin_benefits").select("id,user_id,kind,days,discount_percent,created_at,expires_at,status").eq("status","active").gt("expires_at",new Date().toISOString()).limit(500);
  if(offerError)throw offerError;
  let news=[],feedCheckedAt=0,feedLoaded=false;
  // Tolerar DNS/cache do domínio próprio. GitHub raw é fonte secundária do mesmo
  // arquivo de notícias (gerado e revisado no repositório PP-MT).
  const feeds=[
   "https://ppmt.novabytesolucoes.com.br/assets/news/concurso.json",
   "https://luandersonjesussantos063-eng.github.io/PP-MT/assets/news/concurso.json",
   "https://raw.githubusercontent.com/luandersonjesussantos063-eng/PP-MT/main/assets/news/concurso.json"
  ];
  for(const url of feeds){
   try{
    const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(7000)});
    if(!response.ok)continue;
    const result=await response.json();
    if(result?.schemaVersion!==1 || result.checkStatus==="error" || !Array.isArray(result.items))continue;
    const checked=Date.parse(result.checkedAt||"");
    if(!Number.isFinite(checked))continue;
    if(!feedLoaded || checked>feedCheckedAt){
     feedLoaded=true;feedCheckedAt=checked;
     news=result.items.filter(item=>item?.id && item?.title && typeof item?.url==="string"
      && /^https:\/\/(?:[a-z0-9-]+\.)*mt\.gov\.br\//i.test(item.url));
    }
   }catch{}
  }
  if(!feedLoaded)console.warn("PPMT push: feed oficial indisponível em todas as origens");
  let sent=0,failed=0;
  for(const sub of subs){
   const events=[];
   for(const offer of offers||[]){
    if(offer.user_id!==sub.user_id || Date.parse(offer.created_at)<=Date.parse(sub.created_at))continue;
    events.push({key:"offer:"+offer.id,title:"🎁 Benefício disponível no PP-MT",body:offer.kind==="monthly_discount"?"Você ganhou "+offer.discount_percent+"% de desconto no Premium.":"Você recebeu "+offer.days+" dias de Premium.",url:"https://ppmt.novabytesolucoes.com.br/#ofertas"});
   }
   for(const newsItem of news){
    if(!newsItem?.id || !newsItem?.firstSeenAt || !newsItem.title)continue;
    const timestamp=Date.parse(newsItem.firstSeenAt);
    if(!Number.isFinite(timestamp) || timestamp<=Date.parse(sub.created_at) || Date.now()-timestamp>7*86400000)continue;
    const label=newsItem.kind==="novo-concurso"?"Novo concurso":newsItem.kind==="convocacao"?"Convocação / nomeação":"Publicação oficial";
    events.push({key:"news:"+newsItem.id,title:"📢 PP-MT: "+label,body:String(newsItem.title).slice(0,180),url:"https://ppmt.novabytesolucoes.com.br/#noticias"});
   }
   for(const ev of events){
    const {data:old}=await db.from("ppmt_push_deliveries").select("id").eq("subscription_id",sub.id).eq("event_key",ev.key).maybeSingle();
    if(old)continue;
    try{
     const ok=await sendPushNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth_secret}},{title:ev.title,body:ev.body,url:ev.url,tag:ev.key},{publicKey:cfg.ppmt_webpush_public,privateKey:cfg.ppmt_webpush_private,subject:"mailto:contato@novabytesolucoes.com.br"},{ttl:86400,timeoutMs:6000});
     if(!ok){await db.from("ppmt_push_subscriptions").delete().eq("id",sub.id);break;}
     await db.from("ppmt_push_deliveries").upsert({subscription_id:sub.id,event_key:ev.key},{onConflict:"subscription_id,event_key",ignoreDuplicates:true});sent++;
    }catch{failed++}
   }
  }
  return json({subscriptions:subs.length,sent,failed,newsCount:news.length,feedLoaded,feedCheckedAt:feedLoaded?new Date(feedCheckedAt).toISOString():null});
 }catch(e){console.error("PP-MT push dispatch failure",e instanceof Error?e.message:"unknown");return json({error:"unavailable"},503);}
});

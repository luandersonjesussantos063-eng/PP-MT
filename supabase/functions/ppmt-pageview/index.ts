import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
const allowed=new Set(['https://luandersonjesussantos063-eng.github.io','https://ppmt.novabytesolucoes.com.br']);
const events=new Set(['signup_click','premium_click','install_click','whatsapp_click','start_study_click']);
const pagePattern=/^\/(PP-MT\/)?[a-zA-Z0-9_\/.#-]{0,160}$/;
const tagPattern=/^[a-zA-Z0-9_-]{1,50}$/;
Deno.serve(async req=>{
 const origin=req.headers.get('origin');
 const headers={
  'Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://ppmt.novabytesolucoes.com.br',
  'Vary':'Origin','Access-Control-Allow-Methods':'POST,OPTIONS',
  'Access-Control-Allow-Headers':'content-type','Content-Type':'application/json',
  'Cache-Control':'no-store'
 };
 if(!allowed.has(origin))return new Response('{}',{status:403,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return new Response('{}',{status:405,headers});
 try{
  const raw=await req.text();if(raw.length>540)return new Response('{}',{status:413,headers});
  const body=JSON.parse(raw),page=body?.page;
  if(typeof page!=='string'||!pagePattern.test(page))return new Response('{}',{status:400,headers});
  const cleaned=page.replace(/^\/PP-MT/,'')||'/';
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let error;
  if(body.event==null){
   ({error}=await db.rpc('ppmt_count_page_view',{p_page:cleaned}));
  }else{
   const ev=body.event;
   const source=body.source||'direct',medium=body.medium||'none',campaign=body.campaign||'none';
   if(!events.has(ev)||![source,medium,campaign].every(v=>typeof v==='string'&&tagPattern.test(v)))
    return new Response('{}',{status:400,headers});
   ({error}=await db.rpc('ppmt_count_marketing_event',{
    p_page:cleaned,p_event:ev,p_source:source,p_medium:medium,p_campaign:campaign
   }));
  }
  if(error)throw error;
  return new Response('{"ok":true}',{status:200,headers});
 }catch{
  return new Response('{"error":"unavailable"}',{status:503,headers});
 }
});

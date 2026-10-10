import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
Deno.serve(async req=>{const origin='https://luandersonjesussantos063-eng.github.io';const allowed=new Set([origin,'https://ppmt.novabytesolucoes.com.br']);const requestOrigin=req.headers.get('origin');const headers={'Access-Control-Allow-Origin':allowed.has(requestOrigin)?requestOrigin:origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};if(requestOrigin&&!allowed.has(requestOrigin))return new Response('{"error":"origin_forbidden"}',{status:403,headers});if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return new Response('{}',{status:405,headers});
try{const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return new Response('{"error":"unauthorized"}',{status:401,headers});
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const {data:{user},error}=await db.auth.getUser(token);if(error||!user||user.app_metadata?.ppmt_admin!==true)return new Response('{"error":"forbidden"}',{status:403,headers});
const count=async(table:string,filter?:[string,string])=>{let q=db.from(table).select('*',{count:'exact',head:true});if(filter)q=q.eq(filter[0],filter[1]);const {count,error}=await q;if(error)throw error;return count??0};
let registrations=0;const users=[];for(let page=1;page<=100;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});if(error)throw error;registrations+=data.users.length;for(const u of data.users){const m=u.user_metadata||{};users.push({id:u.id,name:String(m.full_name||m.name||m.nome||m.display_name||'Não informado').slice(0,120),email:u.email||'',created_at:u.created_at||'',last_sign_in_at:u.last_sign_in_at||''})}if(data.users.length<1000)break}
const [active_memberships,overdue,paid_records,orders,active_questions,viewRows]=await Promise.all([count('memberships',['status','active']),count('memberships',['status','past_due']),count('ppmt_monthly_payments',['refunded','false']),count('ppmt_monthly_orders'),count('ppmt_premium_questions',['active','true']),db.from('ppmt_analytics_daily').select('day,page,views').gte('day',new Date(Date.now()-30*86400000).toISOString().slice(0,10)).order('views',{ascending:false}).limit(1000)]);
if(viewRows.error)throw viewRows.error;
const {data:marketingRows,error:marketingError}=await db.from('ppmt_marketing_events_daily')
 .select('day,page,event,source,medium,campaign,events')
 .gte('day',new Date(Date.now()-30*86400000).toISOString().slice(0,10))
 .order('events',{ascending:false}).limit(1000);
if(marketingError)throw marketingError;
const channelData=Object.entries((marketingRows||[]).reduce((obj,r)=>{
 const key=[r.event,r.source,r.medium,r.campaign].join('|');
 obj[key]=(obj[key]||0)+Number(r.events||0);return obj;
},{} as Record<string,number>))
 .sort((a,b)=>b[1]-a[1]).slice(0,20)
 .map(([key,clicks])=>{const [event,source,medium,campaign]=key.split('|');return {event,source,medium,campaign,clicks}});
const marketing_total=(marketingRows||[]).reduce((sum,r)=>sum+Number(r.events||0),0);
const {data:memberRows,error:memberError}=await db.from('memberships').select('user_id,status,current_period_end');if(memberError)throw memberError;const memberMap=new Map((memberRows||[]).map(m=>[m.user_id,{status:m.status,period_end:m.current_period_end}]));for(const u of users){const m=memberMap.get(u.id);u.membership_status=m?.status||'free';u.period_end=m?.period_end||null}users.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));const views=(viewRows.data||[]).reduce((s,r)=>s+Number(r.views),0);const pages=Object.entries((viewRows.data||[]).reduce((a,r)=>{a[r.page]=(a[r.page]||0)+Number(r.views);return a},{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([page,views])=>({page,views}));
return new Response(JSON.stringify({registrations,users,active_memberships,overdue,paid_records,orders,active_questions,views,pages,marketing:channelData,marketing_total,period:'last_30_days',note:'Visualizações são carregamentos de página, não visitantes únicos nem tráfego filtrado de bots.'}),{headers});
}catch(e){return new Response(JSON.stringify({error:'dashboard_unavailable'}),{status:503,headers})}
});
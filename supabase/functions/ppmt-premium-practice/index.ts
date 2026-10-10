import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {makePracticeHandler} from './logic.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function checked<T>(r:{data:T,error:unknown}):T{
 if(r.error)throw new Error('Falha ao consultar banco');
 return r.data;
}
const db={
 async member(id:string){
  return checked(await admin.from('memberships').select('status,current_period_end').eq('user_id',id).maybeSingle());
 },
 async summary(id:string){
  const total=checked(await admin.from('ppmt_premium_questions').select('id',{count:'exact',head:true}).eq('active',true));
  const attempts=checked(await admin.from('ppmt_premium_attempts').select('id',{count:'exact',head:true}).eq('user_id',id));
  return {total_questions:total?.length??0,answered:attempts?.length??0};
 },
 async next(id:string){
  const seen=checked(await admin.from('ppmt_premium_attempts').select('question_id').eq('user_id',id).order('created_at',{ascending:false}).limit(200));
  const recent=new Set((seen||[]).map((r:any)=>r.question_id));
  const questions=checked(await admin.from('ppmt_premium_questions').select('id,subject,topic,statement,options').eq('active',true).order('id',{ascending:true}).limit(400));
  if(!questions?.length)return null;
  return questions.find((q:any)=>!recent.has(q.id)) || questions[Math.floor(Math.random()*questions.length)];
 },
 async get(id:string){
  return checked(await admin.from('ppmt_premium_questions').select('id,active,options,answer_index,explanation').eq('id',id).maybeSingle());
 },
 async record(userId:string,questionId:string,selection:number,correct:boolean){
  checked(await admin.from('ppmt_premium_attempts').insert({user_id:userId,question_id:questionId,selected_index:selection,correct}));
 }
};
Deno.serve(makePracticeHandler({
 db,
 async authenticate(jwt:string){const {data,error}=await admin.auth.getUser(jwt);return error?null:data.user;}
}));

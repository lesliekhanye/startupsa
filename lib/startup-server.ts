import {env} from 'cloudflare:workers';
import {createClient} from '@supabase/supabase-js';
export const response=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function adminClient(){
 if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Service unavailable.');
 return createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function authenticate(request:Request){
 if(request.method!=='GET'&&request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Please use this website.');
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token||!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)throw new Error('Please sign in again.');
 const admin=adminClient();const {data,error}=await admin.auth.getUser(token);
 if(error||!data.user?.email_confirmed_at)throw new Error('Please sign in with a verified email.');
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
 return {admin,client,user:data.user};
}
export async function boundedBody(request:Request,limit:number){
 const reader=request.body?.getReader();if(!reader)throw new Error('Missing request.');
 const chunks:Uint8Array[]=[];let size=0;
 while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Upload is too large.')}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}return bytes;
}
// Only the stored, verified account email is used; never a recipient from a request.
export async function deliverNotifications(admin:ReturnType<typeof adminClient>,ownerId?:string,submissionId?:string){
 if(!env.RESEND_API_KEY||!env.RESEND_FROM_EMAIL)return {pending:true};
 let query=admin.from('startup_email_outbox').select('*').is('sent_at',null).lte('retry_after',new Date().toISOString()).order('created_at').limit(10);
 if(ownerId)query=query.eq('owner_id',ownerId);if(submissionId)query=query.eq('submission_id',submissionId);
 const {data:jobs,error}=await query;if(error)return {pending:true};let pending=false;
 for(const job of jobs??[]){
  const now=new Date().toISOString();
  const {data:claimed,error:claimError}=await admin.from('startup_email_outbox').update({retry_after:new Date(Date.now()+120000).toISOString(),attempts:job.attempts+1}).eq('id',job.id).is('sent_at',null).lte('retry_after',now).select('id');
  if(claimError){pending=true;continue}if(!claimed?.length)continue;
  try{
   const [{data:item,error:itemError},{data:account,error:accountError}]=await Promise.all([admin.from('startup_submissions').select('name').eq('id',job.submission_id).single(),admin.auth.admin.getUserById(job.owner_id)]);
   if(itemError||accountError||!item||!account.user?.email||!account.user.email_confirmed_at)throw new Error('Recipient unavailable');
   const approved=job.event==='approved';
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`startup-sa-${job.id}`},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[account.user.email],subject:approved?'Your startup has been approved — Startup SA':'Submission received — Startup SA',text:approved?`Good news! ${item.name} has been approved and is now listed on Startup SA.\n\nOpen Startup SA and find your startup on the leaderboard.\n\nThanks for sharing what you’re building.\nThe Startup SA team`:`We’ve received ${item.name} and it is now awaiting review.\n\nWe’ll email you again once it is approved. You can check the status in My account on Startup SA.\n\nThe Startup SA team`})});
   if(!sent.ok)throw new Error('Email provider unavailable');
   const {error:saveError}=await admin.from('startup_email_outbox').update({sent_at:new Date().toISOString()}).eq('id',job.id);if(saveError)pending=true;
  }catch{pending=true}
 }
 let remaining=admin.from('startup_email_outbox').select('id',{head:true,count:'exact'}).is('sent_at',null);
 if(ownerId)remaining=remaining.eq('owner_id',ownerId);if(submissionId)remaining=remaining.eq('submission_id',submissionId);
 const {count,error:remainingError}=await remaining;
 return {pending:pending||!!remainingError||(count??0)>0};
}

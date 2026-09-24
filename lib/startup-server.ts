import {renderEmail,renderAdminReviewEmail,renderRejectionEmail} from './email-templates';
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
   const [{data:item,error:itemError},{data:account,error:accountError}]=await Promise.all([admin.from('startup_submissions').select('name,deleted_at').eq('id',job.submission_id).single(),admin.auth.admin.getUserById(job.owner_id)]);
   if(itemError||accountError||!item||!account.user?.email||!account.user.email_confirmed_at)throw new Error('Recipient unavailable');
   if(item.deleted_at){pending=true;continue}
   const email=job.event==='rejected'?renderRejectionEmail(item.name,job.review_note||'Please review your submission and update its details.',env.SITE_URL||'https://startups.summit88.co.za'):renderEmail(job.event==='approved'?'approved':'submitted',item.name,env.SITE_URL||'https://startups.summit88.co.za');
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`startup-sa-${job.id}`},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[account.user.email],...email})});
   if(!sent.ok)throw new Error('Email provider unavailable');
   const {error:saveError}=await admin.from('startup_email_outbox').update({sent_at:new Date().toISOString()}).eq('id',job.id);if(saveError)pending=true;
  }catch{pending=true}
 }
 let remaining=admin.from('startup_email_outbox').select('id',{head:true,count:'exact'}).is('sent_at',null);
 if(ownerId)remaining=remaining.eq('owner_id',ownerId);if(submissionId)remaining=remaining.eq('submission_id',submissionId);
 const {count,error:remainingError}=await remaining;
 return {pending:pending||!!remainingError||(count??0)>0};
}
export async function deliverAdminReviewNotifications(admin:ReturnType<typeof adminClient>){
 if(!env.RESEND_API_KEY||!env.RESEND_FROM_EMAIL)return {pending:true};
 const {data:jobs,error}=await admin.from('startup_admin_email_outbox').select('*').is('sent_at',null).lte('retry_after',new Date().toISOString()).order('created_at').limit(10);
 if(error)return {pending:true};let pending=false;
 for(const job of jobs??[]){
  const now=new Date().toISOString();
  const {data:claimed,error:claimError}=await admin.from('startup_admin_email_outbox').update({retry_after:new Date(Date.now()+120000).toISOString(),attempts:job.attempts+1}).eq('id',job.id).is('sent_at',null).lte('retry_after',now).select('id');
  if(claimError){pending=true;continue}if(!claimed?.length)continue;
  try{
   const [{data:item,error:itemError},{data:moderator,error:moderatorError}]=await Promise.all([admin.from('startup_submissions').select('name,status,deleted_at').eq('id',job.submission_id).single(),admin.auth.admin.getUserById(job.moderator_id)]);
   if(itemError||moderatorError||!item||!moderator.user?.email||!moderator.user.email_confirmed_at)throw new Error('Moderator or submission unavailable');
   if(item.deleted_at||item.status!=='pending'){
    const {error:skipError}=await admin.from('startup_admin_email_outbox').update({sent_at:new Date().toISOString()}).eq('id',job.id);
    if(skipError)pending=true;
    continue;
   }
   const sent=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`startup-admin-${job.id}`},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[moderator.user.email],...renderAdminReviewEmail(item.name,env.SITE_URL||'https://startups.summit88.co.za',job.event==='resubmitted')})});
   if(!sent.ok)throw new Error('Email provider unavailable');
   const {error:saveError}=await admin.from('startup_admin_email_outbox').update({sent_at:new Date().toISOString()}).eq('id',job.id);if(saveError)pending=true;
  }catch{pending=true}
 }
 const {count,error:remainingError}=await admin.from('startup_admin_email_outbox').select('id',{head:true,count:'exact'}).is('sent_at',null);
 return {pending:pending||!!remainingError||(count??0)>0};
}

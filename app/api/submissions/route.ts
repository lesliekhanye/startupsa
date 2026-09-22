import {validateLogo} from '@/lib/png-validation';
import {z} from 'zod';
import {submissionSchema} from '@/lib/startup-schema';
import {authenticate,boundedBody,deliverNotifications,response} from '@/lib/startup-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let auth;try{auth=await authenticate(request)}catch{return response({error:'Please sign in with a verified email.'},401)}
 try{
  const bytes=await boundedBody(request,1100000);
  const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
  const id=z.string().uuid().parse(form.get('request_id'));
  if(form.get('company_url'))return response({error:'Invalid submission.'},400);
  const payload=submissionSchema.parse(JSON.parse(String(form.get('payload'))));
  const {data:existing,error:existingError}=await auth.client.from('startup_submissions').select('id').eq('id',id).maybeSingle();if(existingError)throw existingError;
  let logoPath:string|undefined;
  if(!existing){
   const {count,error}=await auth.client.from('startup_submissions').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
   if(error)throw error;if((count??0)>=5)return response({error:'You can submit up to five startups per day.'},429);
   const logo=form.get('logo');
   if(logo instanceof File&&logo.size){
    const content=await validateLogo(new Uint8Array(await logo.arrayBuffer()));
    logoPath=`${id}.png`;
    const {error:uploadError}=await auth.admin.storage.from('startup-sa-logos').upload(logoPath,content,{contentType:'image/png',upsert:false,metadata:{owner:auth.user.id}});
    if(uploadError&&String(uploadError.statusCode)!=='409')throw new Error('Logo upload failed. Please retry.');
   }
  }
  const {error}=await auth.client.rpc('submit_startup',{payload:{...payload,logo_path:logoPath},request_id:id});if(error)return response({error:'Could not save your submission. Check your details and retry.'},400);
  const delivery=await deliverNotifications(auth.admin,auth.user.id,id);
  return response({id,emailPending:delivery.pending});
 }catch(e){return response({error:e instanceof z.ZodError?'Please check the submission details.':'Could not save your submission. Check your details and logo, then retry.'},400)}
}
export async function PATCH(request:Request){
 let auth;try{auth=await authenticate(request)}catch{return response({error:'Please sign in with a verified email.'},401)}
 let uploaded:string|undefined;
 try{
  const bytes=await boundedBody(request,1100000);const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
  const submissionId=z.string().uuid().parse(form.get('submission_id')),editId=z.string().uuid().parse(form.get('edit_request_id'));const payload=submissionSchema.parse(JSON.parse(String(form.get('payload'))));
  const {data:previous,error:previousError}=await auth.admin.from('startup_submissions').select('owner_id,logo_path').eq('id',submissionId).maybeSingle();if(previousError||!previous||previous.owner_id!==auth.user.id)return response({error:'Startup not found.'},404);
  const logo=form.get('logo');
  if(logo instanceof File&&logo.size){const content=await validateLogo(new Uint8Array(await logo.arrayBuffer()));uploaded=`${submissionId}/${editId}.png`;const {error:uploadError}=await auth.admin.storage.from('startup-sa-logos').upload(uploaded,content,{contentType:'image/png',upsert:false,metadata:{owner:auth.user.id}});if(uploadError&&String(uploadError.statusCode)!=='409')throw new Error('Logo upload failed. Please retry.');}
  const {error}=await auth.client.rpc('edit_startup_submission',{submission_id:submissionId,payload,new_logo_path:uploaded??null});if(error)throw new Error(error.message);
  if(uploaded&&previous.logo_path&&previous.logo_path!==uploaded){const {data:published}=await auth.admin.from('startups').select('logo_path').eq('id',submissionId).maybeSingle();if(previous.logo_path!==published?.logo_path)await auth.admin.storage.from('startup-sa-logos').remove([previous.logo_path]);}
  return response({saved:true});
 }catch(error){return response({error:error instanceof z.ZodError?'Please check the startup details.':'Could not save your changes. Check your details and logo, then retry.'},400)}
}

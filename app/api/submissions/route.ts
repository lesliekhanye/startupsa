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
  const payload=submissionSchema.parse(JSON.parse(String(form.get('payload'))));
  const {data:existing,error:existingError}=await auth.client.from('startup_submissions').select('id').eq('id',id).maybeSingle();if(existingError)throw existingError;
  let logoPath:string|undefined;
  if(!existing){
   const {count,error}=await auth.client.from('startup_submissions').select('id',{count:'exact',head:true}).eq('owner_id',auth.user.id).gte('created_at',new Date(Date.now()-86400000).toISOString());
   if(error)throw error;if((count??0)>=5)return response({error:'You can submit up to five startups per day.'},429);
   const logo=form.get('logo');
   if(logo instanceof File&&logo.size){
    const content=new Uint8Array(await logo.arrayBuffer());
    const signature=[137,80,78,71,13,10,26,10];
    if(content.length>1048576||content.length<24||!signature.every((v,i)=>content[i]===v))return response({error:'Please choose a valid PNG, JPEG or WebP logo.'},400);
    const dimensions=new DataView(content.buffer);if(dimensions.getUint32(16)>1024||dimensions.getUint32(20)>1024||!dimensions.getUint32(16)||!dimensions.getUint32(20))return response({error:'Logo dimensions are too large.'},400);
    logoPath=`${id}.png`;
    const {error:uploadError}=await auth.admin.storage.from('startup-sa-logos').upload(logoPath,content,{contentType:'image/png',upsert:false,metadata:{owner:auth.user.id}});
    if(uploadError&&String(uploadError.statusCode)!=='409')throw new Error('Logo upload failed. Please retry.');
   }
  }
  const {error}=await auth.client.rpc('submit_startup',{payload:{...payload,logo_path:logoPath},request_id:id});if(error)return response({error:error.message},400);
  const delivery=await deliverNotifications(auth.admin,auth.user.id,id);
  return response({id,emailPending:delivery.pending});
 }catch(e){return response({error:e instanceof z.ZodError?'Please check the submission details.':e instanceof Error?e.message:'Could not save your submission. Please retry.'},400)}
}
export async function PATCH(request:Request){
 let auth;try{auth=await authenticate(request)}catch{return response({error:'Please sign in with a verified email.'},401)}
 try{const input=z.object({submission_id:z.string().uuid(),payload:submissionSchema}).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request,12000))));const {error}=await auth.client.rpc('edit_startup_submission',input);if(error)return response({error:error.message},400);return response({saved:true})}catch(error){return response({error:error instanceof z.ZodError?'Please check the startup details.':error instanceof Error?error.message:'Could not save your changes.'},400)}
}

import {z} from 'zod';
import {authenticate,boundedBody,deliverNotifications,response} from '@/lib/startup-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let auth;try{auth=await authenticate(request)}catch{return response({error:'Please sign in again.'},401)}
 try{
  const input=z.object({submission_id:z.string().uuid(),decision:z.enum(['approved','rejected']),note:z.string().max(1000)}).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request,5000))));
  const {data:before}=input.decision==='approved'?await auth.admin.from('startups').select('logo_path').eq('id',input.submission_id).maybeSingle():{data:null};
  const {error}=await auth.client.rpc('review_startup',input);if(error)return response({error:error.message},400);
  if(input.decision==='approved'&&before?.logo_path){const {data:after}=await auth.admin.from('startup_submissions').select('logo_path').eq('id',input.submission_id).single();if(after?.logo_path&&after.logo_path!==before.logo_path)await auth.admin.storage.from('startup-sa-logos').remove([before.logo_path])}
  const delivery=await deliverNotifications(auth.admin,undefined,input.submission_id);
  return response({saved:true,emailPending:delivery.pending});
 }catch{return response({error:'Could not review this submission. Please retry.'},400)}
}

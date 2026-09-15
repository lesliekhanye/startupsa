import {z} from 'zod';
import {authenticate,boundedBody,deliverNotifications,response} from '@/lib/startup-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let auth;try{auth=await authenticate(request)}catch{return response({error:'Please sign in again.'},401)}
 try{
  const input=z.object({submission_id:z.string().uuid(),decision:z.enum(['approved','rejected']),note:z.string().max(1000)}).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request,5000))));
  const {error}=await auth.client.rpc('review_startup',input);if(error)return response({error:error.message},400);
  const delivery=await deliverNotifications(auth.admin,undefined,input.submission_id);
  return response({saved:true,emailPending:delivery.pending});
 }catch{return response({error:'Could not review this submission. Please retry.'},400)}
}

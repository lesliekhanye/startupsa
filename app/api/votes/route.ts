import {clientIp} from '@/lib/client-ip';
import {z} from 'zod';
import {adminClient,boundedBody,response} from '@/lib/startup-server';
import {browserIdentity,digest,legacyUser} from '@/lib/guest-voting';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Please vote from this website.'},403);
 let identity;try{identity=await browserIdentity(request)}catch{return response({error:'Please enable cookies and refresh the page before voting.'},400)}
 try{
  const input=z.object({target_id:z.string().uuid(),desired_active:z.boolean()}).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request,1024))));
  const ip=clientIp(request);
  const {error}=await adminClient().rpc('set_startup_browser_vote',{...input,browser_key:identity.browserKey,ip_key:await digest('vote-ip:'+new Date().toISOString().slice(0,10)+':'+ip),legacy_user:await legacyUser(request)});
  if(error)return response({error:error.code==='P0002'?'Too many votes. Please try again later.':'Could not save your vote. Please refresh and retry.'},error.code==='P0002'?429:400);
  return response({saved:true});
 }catch{return response({error:'Could not save your vote. Please retry.'},400)}
}

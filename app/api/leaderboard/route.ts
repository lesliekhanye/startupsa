import {adminClient,response} from '@/lib/startup-server';
import {browserIdentity,legacyUser} from '@/lib/guest-voting';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const identity=await browserIdentity(request,true);const {data,error}=await adminClient().rpc('startup_browser_board',{browser_key:identity.browserKey,legacy_user:await legacyUser(request)});if(error)throw error;const result=response({records:data});if(identity.cookie)result.headers.set('Set-Cookie',identity.cookie);return result}catch{return response({error:'Could not load the leaderboard. Please retry.'},503)}
}

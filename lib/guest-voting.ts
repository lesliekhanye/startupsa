import {env} from 'cloudflare:workers';
import {adminClient} from './startup-server';
const cookieName='startup_sa_voter';
async function key(){if(!env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Voting is unavailable.');return crypto.subtle.importKey('raw',new TextEncoder().encode(env.SUPABASE_SERVICE_ROLE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('')}
export async function browserIdentity(request:Request,create=false){
 const raw=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(raw&&/^[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(raw)){
  const [id,signature]=raw.split('.');const bytes=Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16));
  if(await crypto.subtle.verify('HMAC',await key(),bytes,new TextEncoder().encode('startup-voter:'+id)))return {browserKey:await digest('browser:'+id),cookie:null};
 }
 if(!create)throw new Error('Please enable cookies and refresh the page before voting.');
 const id=crypto.randomUUID();const signature=await digest('startup-voter:'+id);
 return {browserKey:await digest('browser:'+id),cookie:`${cookieName}=${id}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`};
}
export async function legacyUser(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)return null;
 const {data,error}=await adminClient().auth.getUser(token);return !error&&data.user?.email_confirmed_at?data.user.id:null;
}

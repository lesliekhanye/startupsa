import {renderEmail} from '@/lib/email-templates';
import {digest} from '@/lib/guest-voting';
import {env} from 'cloudflare:workers';
import {createClient} from '@supabase/supabase-js';
import {z} from 'zod';
export const dynamic='force-dynamic';
const reply=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Please sign in from this website.'},403);
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||!env.RESEND_API_KEY||!env.RESEND_FROM_EMAIL)return reply({error:'Email sign-in is not available yet.'},503);
  let email:string;
  try{const reader=request.body?.getReader();if(!reader)return reply({error:'Invalid request.'},400);const chunks:Uint8Array[]=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>1024){await reader.cancel();return reply({error:'Invalid request.'},400)}chunks.push(part.value)}const combined=new Uint8Array(size);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length}email=z.object({email:z.string().trim().toLowerCase().email().max(254),website:z.string().max(0).optional()}).parse(JSON.parse(new TextDecoder().decode(combined))).email}catch{return reply({error:'Enter a valid email address.'},400)}
  const client=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const ip=request.headers.get('cf-connecting-ip')||'local-development';
    const reservation=await client.rpc('reserve_startup_email',{email_hash:await digest('login-email:'+email),ip_hash:await digest('login-ip:'+new Date().toISOString().slice(0,10)+':'+ip)});
    if(reservation.error)return reply({error:'Email sign-in is temporarily unavailable.'},503);
    if(!reservation.data)return reply({error:'Please wait a minute before requesting another code.'},429);
    const generated=await client.auth.admin.generateLink({type:'magiclink',email});
    if(generated.error||!generated.data.properties?.email_otp)return reply({error:'Could not prepare your sign-in code. Please try again later.'},503);
    const code=generated.data.properties.email_otp;
    const sent=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.RESEND_FROM_EMAIL,to:[email],...renderEmail('signin',code,env.SITE_URL||'https://startups.summit88.co.za')})});
    if(!sent.ok)return reply({error:'Could not send your code. Please try again later.'},503);
    return reply({sent:true});
  }catch{return reply({error:'Email sign-in is temporarily unavailable. Please retry.'},503)}
}

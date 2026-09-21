import {z} from 'zod';
import {adminClient,authenticate} from '@/lib/startup-server';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=z.string().uuid().parse((await params).id);const admin=adminClient();
  let path:string|null|undefined;
  if(request.headers.get('authorization')){try{const {client}=await authenticate(request);const {data:pending}=await client.from('startup_submissions').select('logo_path').eq('id',id).maybeSingle();path=pending?.logo_path}catch{}}
  if(!path){const {data:published}=await admin.from('startups').select('logo_path').eq('id',id).eq('hidden',false).maybeSingle();path=published?.logo_path}
  if(!path)return new Response(null,{status:404});
  const {data,error}=await admin.storage.from('startup-sa-logos').download(path);if(error||!data)return new Response(null,{status:404});
  return new Response(data,{headers:{'Content-Type':'image/png','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch{return new Response(null,{status:404})}
}

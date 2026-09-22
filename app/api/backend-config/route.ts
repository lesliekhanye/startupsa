import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(){
  const url=env.SUPABASE_URL;
  const key=env.SUPABASE_PUBLISHABLE_KEY;
  // Never publish a service-role/secret key, even if misconfigured.
  let validKey=key?.startsWith('sb_publishable_')??false;
  if(key?.startsWith('eyJ')){try{const payload=key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');validKey=JSON.parse(atob(payload)).role==='anon'}catch{validKey=false}}
  let validUrl=false;
  try{const parsed=new URL(url||'');validUrl=parsed.protocol==='https:'&&!parsed.username&&!parsed.password&&parsed.pathname==='/'&&!parsed.search&&!parsed.hash}catch{}
  if(!(url&&key&&validKey&&validUrl)&&process.env.NODE_ENV==='production')return Response.json({error:'Startup service unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
  return Response.json(url&&key&&validKey&&validUrl?{configured:true,url,key}:{configured:false},{headers:{'Cache-Control':'no-store'}});
}

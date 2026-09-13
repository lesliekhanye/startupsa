import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
let pending:Promise<SupabaseClient|null>|null=null;
export function getSupabase(){
  if(!pending)pending=(async()=>{
    const response=await fetch('/api/backend-config',{cache:'no-store'});
    if(!response.ok)throw new Error('Could not connect. Please try again.');
    const config=z.discriminatedUnion('configured',[z.object({configured:z.literal(false)}),z.object({configured:z.literal(true),url:z.string().url(),key:z.string().min(1)})]).parse(await response.json());
    if(!config.configured)return null;
    return createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  })().catch(error=>{pending=null;throw error});
  return pending;
}

import {cache} from 'react';
import {createClient} from '@supabase/supabase-js';
import {env} from 'cloudflare:workers';
import type {StartupRecord} from './startup-schema';
export const publicStartup=cache(async(slug:string):Promise<StartupRecord|null>=>{
 if(!/^[a-z0-9-]{1,160}$/.test(slug))return null;
 if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY)throw new Error('Startup service unavailable.');
 const client=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.from('startups').select('id,slug,name,website,pitch,story,category,city,country,stage,founded_year,founder,published_at,logo_path').eq('slug',slug).eq('hidden',false).maybeSingle();
 if(error)throw new Error('Startup service unavailable.');
 return data?{...data,total_votes:0,today_votes:0,week_votes:0,month_votes:0,my_vote:false}:null;
});

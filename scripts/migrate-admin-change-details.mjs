import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const e=parseEnv(readFileSync(process.argv[2],'utf8'));
const db=new pg.Client({connectionString:e.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(process.argv[3],'utf8')},connectionTimeoutMillis:12000});
try{await db.connect();const current=await db.query("select pg_get_functiondef('public.startup_admin_dashboard()'::regprocedure) as source");if(current.rows[0]?.source?.includes("'published_version'"))throw new Error('Admin change-details migration already applied. No changes made.');await db.query(readFileSync(new URL('../supabase/migrations/202609210003_admin_change_details.sql',import.meta.url),'utf8'));console.log('Admin dashboard now receives the published values needed for change review.')}catch(error){console.error(error.code||'',error.message);process.exitCode=1}finally{await db.end()}

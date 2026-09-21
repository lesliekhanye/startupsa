import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const e=parseEnv(readFileSync(process.argv[2],'utf8'));
const db=new pg.Client({connectionString:e.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(process.argv[3],'utf8')},connectionTimeoutMillis:12000});
try{await db.connect();const current=await db.query("select pg_get_functiondef('public.startup_admin_dashboard()'::regprocedure) as source");if(current.rows[0]?.source?.includes("'has_pending_changes'"))throw new Error('Admin pending-update migration already applied. No changes made.');await db.query(readFileSync(new URL('../supabase/migrations/202609210002_admin_pending_updates.sql',import.meta.url),'utf8'));console.log('Admin dashboard now identifies edits awaiting review.')}catch(error){console.error(error.code||'',error.message);process.exitCode=1}finally{await db.end()}

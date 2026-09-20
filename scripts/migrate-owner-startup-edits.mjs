import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const e=parseEnv(readFileSync(process.argv[2],'utf8'));
const db=new pg.Client({connectionString:e.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(process.argv[3],'utf8')},connectionTimeoutMillis:12000});
try{await db.connect();const existing=await db.query("select to_regprocedure('public.edit_startup_submission(uuid,jsonb)') as fn");if(existing.rows[0].fn)throw new Error('Owner edit migration already applied. No changes made.');await db.query(readFileSync(new URL('../supabase/migrations/202609200004_owner_startup_edits.sql',import.meta.url),'utf8'));console.log('Startup owners can now submit listing edits for review.')}catch(error){console.error(error.code||'',error.message);process.exitCode=1}finally{await db.end()}

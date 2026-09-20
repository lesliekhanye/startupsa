import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const e=parseEnv(readFileSync(process.argv[2],'utf8'));
const db=new pg.Client({connectionString:e.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(process.argv[3],'utf8')},connectionTimeoutMillis:12000});
try{await db.connect();const r=await db.query("select 1 from information_schema.columns where table_schema='public' and table_name='startup_submissions' and column_name='deleted_at'");if(r.rowCount)throw new Error('Admin migration already applied. No changes made.');await db.query(readFileSync(new URL('../supabase/migrations/202609200002_admin_dashboard.sql',import.meta.url),'utf8'));console.log('Admin dashboard migration applied. No accounts or submissions removed.')}catch(e){console.error(e.code||'',e.message);process.exitCode=1}finally{await db.end()}

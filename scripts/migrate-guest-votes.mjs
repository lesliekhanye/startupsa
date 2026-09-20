import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const e=parseEnv(readFileSync(process.argv[2],'utf8'));
const db=new pg.Client({connectionString:e.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(process.argv[3],'utf8')},connectionTimeoutMillis:12000});
try{await db.connect();const r=await db.query("select to_regclass('public.startup_guest_votes') as existing");if(r.rows[0].existing)throw new Error('Guest migration already applied. No changes made.');await db.query(readFileSync(new URL('../supabase/migrations/202609200001_guest_votes.sql',import.meta.url),'utf8'));console.log('Guest voting migration applied; existing account votes preserved.')}catch(e){console.error(e.code||'',e.message);process.exitCode=1}finally{await db.end()}

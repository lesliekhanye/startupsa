import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const source=process.argv[2],certificate=process.argv[3];
if(!source||!certificate)throw new Error('Pass the authorised env-file path and Supabase CA certificate path.');
const settings=parseEnv(readFileSync(source,'utf8'));
const client=new pg.Client({connectionString:settings.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(certificate,'utf8')},connectionTimeoutMillis:12000});
try{
 await client.connect();
 const before=(await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);
 const target=['startup_moderators','startup_submissions','startup_votes','startups'];
 if(target.some(t=>before.includes(t)))throw new Error('A Startup SA table already exists. Inspect migration state before applying.');
 const functions=await client.query("select proname from pg_proc join pg_namespace n on n.oid=pronamespace where n.nspname='public' and proname=any($1)",[['is_startup_moderator','submit_startup','review_startup','set_startup_vote','startup_leaderboard','reserve_startup_email']]);
 if(functions.rowCount)throw new Error('A target function already exists. No changes applied.');
 await client.query(readFileSync(new URL('../supabase/migrations/202609130001_startup_sa.sql',import.meta.url),'utf8'));
 const after=(await client.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);
 if(!before.every(t=>after.includes(t)))throw new Error('Unexpected table inventory change.');
 console.log(JSON.stringify({applied:true,added:after.filter(t=>!before.includes(t)),existingTablesPreserved:before.length}));
}catch(e){console.error('Migration not completed:',e.code||'',String(e.message).replaceAll(settings.DATABASE_URL||'__missing__','[redacted]'));process.exitCode=1}finally{await client.end()}

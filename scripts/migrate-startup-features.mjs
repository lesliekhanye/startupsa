import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const [source,certificate]=process.argv.slice(2);
const settings=parseEnv(readFileSync(source,'utf8'));
const client=new pg.Client({connectionString:settings.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(certificate,'utf8')},connectionTimeoutMillis:12000});
try{
 await client.connect();
 const {rows}=await client.query("select 1 from information_schema.columns where table_schema='public' and table_name='startup_submissions' and column_name='logo_path'");
 if(rows.length)throw new Error('Feature migration already applied; no changes made.');
 await client.query(readFileSync(new URL('../supabase/migrations/202609150001_logos_notifications.sql',import.meta.url),'utf8'));
 console.log('Logo storage and transactional notification outbox migration applied. Existing records preserved.');
}catch(e){console.error(e.code||'',String(e.message).replaceAll(settings.DATABASE_URL,'[redacted]'));process.exitCode=1}finally{await client.end()}

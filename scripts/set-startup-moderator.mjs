// Run only after the owner names the exact email authorised to moderate Startup SA.
import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import pg from 'pg';
const [source,certificate,email]=process.argv.slice(2);
if(!source||!certificate||!email||!email.includes('@'))throw new Error('Pass env-file, CA certificate and the owner-approved moderator email.');
const settings=parseEnv(readFileSync(source,'utf8'));
const client=new pg.Client({connectionString:settings.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:readFileSync(certificate,'utf8')},connectionTimeoutMillis:12000});
try{await client.connect();const users=await client.query('select id from auth.users where lower(email)=lower($1) and email_confirmed_at is not null',[email]);if(users.rowCount!==1)throw new Error('That email must sign in and verify first. No permissions changed.');await client.query('insert into public.startup_moderators(user_id) values($1) on conflict do nothing',[users.rows[0].id]);console.log('Moderator access enabled for the explicitly selected account.')}catch(e){console.error(String(e.message).replaceAll(settings.DATABASE_URL,'[redacted]'));process.exitCode=1}finally{await client.end()}

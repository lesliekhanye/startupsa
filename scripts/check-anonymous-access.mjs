import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const env=parseEnv(readFileSync('.dev.vars','utf8'));
const client=createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
for(const table of ['startup_submissions','startup_votes','startup_moderators','startup_email_outbox']){const result=await client.from(table).select('*').limit(1);assert.ok(result.error||result.data?.length===0,`Anonymous access leaked ${table}`);console.log(`PASS: anonymous ${table} access blocked.`)}
const dashboard=await client.rpc('startup_admin_dashboard');assert.ok(dashboard.error,'Anonymous dashboard access must fail');
const role=await client.rpc('is_startup_moderator');assert.ok(role.error||role.data===false,'Anonymous visitor must not be a moderator');
const storage=await client.storage.from('startup-sa-logos').list('',{limit:1});assert.ok(storage.error||storage.data?.length===0,'Anonymous storage listing must be private');
console.log('PASS: live anonymous dashboard, moderator role, and storage listing checks. Read-only; no records changed.');

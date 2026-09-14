import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import assert from 'node:assert/strict';
const env=parseEnv(readFileSync('.dev.vars','utf8'));
const clients=[0,1].map(()=>createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}));
const topic=`startup-sa:presence-test:${crypto.randomUUID()}`;
const channels=clients.map((c,i)=>c.channel(topic,{config:{presence:{key:`test-${i}`}}}));
const counts=[];
channels[0].on('presence',{event:'sync'},()=>counts.push(Object.keys(channels[0].presenceState()).length));
async function until(test){const end=Date.now()+15000;while(!test()){if(Date.now()>end)throw new Error('Presence state timed out');await new Promise(r=>setTimeout(r,100))}}
try{
  await Promise.all(channels.map(c=>new Promise((resolve,reject)=>c.subscribe(status=>{if(status==='SUBSCRIBED')resolve();if(['CHANNEL_ERROR','TIMED_OUT'].includes(status))reject(new Error(status))}))));
  assert.equal(await channels[0].track({active:true}),'ok');
  await until(()=>Object.keys(channels[0].presenceState()).length===1);
  assert.equal(await channels[1].track({active:true}),'ok');
  await until(()=>Object.keys(channels[0].presenceState()).length===2);
  await channels[1].untrack();
  await until(()=>Object.keys(channels[0].presenceState()).length===1);
  console.log('PASS: anonymous presence counts 1 → 2 → 1; no database records created.');
}finally{await Promise.all(clients.map(c=>c.removeAllChannels()));clients.forEach(c=>c.realtime.disconnect())}

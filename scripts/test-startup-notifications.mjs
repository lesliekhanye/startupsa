import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
const events=['submitted','approved'].map((event,i)=>({id:`event-${i}`,event,submission_id:'startup-1',owner_id:'founder-1',retry_after:new Date(0).toISOString(),sent_at:null,attempts:0,created_at:new Date(i).toISOString()}));
const sent=[];let fail=false;
class Query{
 constructor(table){this.table=table;this.tests=[];this.values=null;this.head=false}
 select(_fields,options){this.head=!!options?.head;return this}
 is(key,value){this.tests.push(x=>x[key]===value);return this}
 eq(key,value){this.tests.push(x=>x[key]===value);return this}
 lte(key,value){this.tests.push(x=>x[key]<=value);return this}
 order(){return this}limit(){return this}single(){this.singleRow=true;return this}
 update(values){this.values=values;return this}
 then(resolve,reject){return Promise.resolve().then(()=>{const rows=(this.table==='startup_email_outbox'?events:[{id:'startup-1',name:'Test startup'}]).filter(x=>this.tests.every(test=>test(x)));if(this.values)rows.forEach(x=>Object.assign(x,this.values));return {data:this.head?null:this.singleRow?rows[0]:rows.map(x=>({...x})),count:rows.length,error:null}}).then(resolve,reject)}
}
const admin={from:table=>new Query(table),auth:{admin:{getUserById:async id=>({data:{user:{id,email:'founder@example.invalid',email_confirmed_at:'2026-01-01'}},error:null})}}};
const source=readFileSync(new URL('../lib/startup-server.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const emailExports={};vm.runInNewContext(ts.transpileModule(readFileSync('lib/email-templates.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:emailExports,URL});
const exports={};
vm.runInNewContext(compiled,{exports,require:name=>name==='./email-templates'?emailExports:name==='cloudflare:workers'?{env:{RESEND_API_KEY:'test-only',RESEND_FROM_EMAIL:'test@example.invalid'}}:{createClient:()=>{throw new Error('No network client allowed')}},Response,Uint8Array,Date,AbortSignal,fetch:async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));assert.ok(options.headers['Idempotency-Key']);return {ok:!fail}}});
let result=await exports.deliverNotifications(admin,'founder-1');assert.equal(result.pending,false);assert.equal(sent.length,2);
assert.match(sent[0].subject,/Submission received/);assert.match(sent[1].subject,/approved/);sent.forEach(x=>{assert.deepEqual(x.to,['founder@example.invalid']);assert.ok(x.html.includes('prefers-color-scheme:dark'));assert.ok(x.text)});
await exports.deliverNotifications(admin,'founder-1');assert.equal(sent.length,2,'saved sent markers prevent duplicate emails');
events[0].sent_at=null;events[0].retry_after=new Date(0).toISOString();fail=true;
result=await exports.deliverNotifications(admin,'founder-1');assert.equal(result.pending,true);assert.equal(events[0].sent_at,null);
const attempts=sent.length;await exports.deliverNotifications(admin,'founder-1');assert.equal(sent.length,attempts,'lease prevents immediate retries');
events[0].retry_after=new Date(0).toISOString();fail=false;
result=await exports.deliverNotifications(admin,'founder-1');assert.equal(result.pending,false);
console.log('PASS: submitted/approved templates, verified recipient selection, sent markers, failure queue and retry lease. No emails sent.');

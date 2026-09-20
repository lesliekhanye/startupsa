import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let signedIn=true,moderator=true,roleError=null,calls=0;
const source=ts.transpileModule(readFileSync(new URL('../app/api/admin/accounts/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
vm.runInNewContext(source,{exports,URL,Number,require:()=>({response:(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}}),authenticate:async()=>{
 if(!signedIn)throw Error('No session');
 return {client:{rpc:async()=>({data:moderator,error:roleError})},admin:{auth:{admin:{listUsers:async({page,perPage})=>{calls++;assert.equal(perPage,25);return {data:{users:[{id:'test-id',email:'test@example.invalid',email_confirmed_at:'2026-01-01',user_metadata:{private:'must not leak'}}],lastPage:2},error:null}}}}}};
}})});
const request=page=>new Request(`https://example.invalid/api/admin/accounts?page=${page}`);
signedIn=false;assert.equal((await exports.GET(request(1))).status,401);assert.equal(calls,0);
signedIn=true;moderator=false;assert.equal((await exports.GET(request(1))).status,403);assert.equal(calls,0);
moderator=true;roleError={message:'Unavailable'};assert.equal((await exports.GET(request(1))).status,403);assert.equal(calls,0);
roleError=null;assert.equal((await exports.GET(request(-1))).status,400);assert.equal(calls,0);
let r=await exports.GET(request(1));assert.equal(r.headers.get('Cache-Control'),'no-store');let data=await r.json();assert.deepEqual(data.accounts,[{id:'test-id',email:'test@example.invalid',verified:true}]);assert.equal(data.hasNext,true);
data=await (await exports.GET(request(2))).json();assert.equal(data.hasNext,false);
console.log('PASS: admin-only emails, fail-closed permissions, bounded pagination, no-store and minimal data.');

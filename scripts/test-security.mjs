import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deflateSync} from 'node:zlib';
import ts from 'typescript';
import vm from 'node:vm';
function load(file,require=()=>({})){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,URL,Uint8Array,DataView,Blob,DecompressionStream,Response,TextDecoder,TextEncoder,Date,Set});return exports}
const {renderEmail}=load('lib/email-templates.ts');
for(const kind of ['signin','submitted','approved']){
 const email=renderEmail(kind,'<script>alert("x")</script>','https://startupsafrica.summit88.co.za');
 assert.ok(email.html.includes('prefers-color-scheme:dark'));assert.ok(email.html.includes('color-scheme'));assert.ok(email.text);assert.ok(!email.html.includes('<script>'));assert.ok(email.html.includes('&lt;script&gt;'));assert.ok(!email.html.includes('http://'));assert.ok(!email.html.includes('<img'));
}
assert.ok(!renderEmail('submitted','Safe','javascript:alert(1)').html.includes('href='));
const {validateLogo}=load('lib/png-validation.ts');
function chunk(type,data){const t=Buffer.from(type);let crc=0xffffffff;for(const b of Buffer.concat([t,data])){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);t.copy(out,4);data.copy(out,8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out}
function png({width=1,height=1,raw=Buffer.from([0,255,0,0,255]),extra=Buffer.alloc(0)}={}){const h=Buffer.alloc(13);h.writeUInt32BE(width);h.writeUInt32BE(height,4);h[8]=8;h[9]=6;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0)),extra])}
const valid=png();assert.deepEqual(Buffer.from(await validateLogo(valid)),valid);
await assert.rejects(()=>validateLogo(png({extra:Buffer.from('<script>')})));
await assert.rejects(()=>validateLogo(png({width:2000})));
await assert.rejects(()=>validateLogo(png({raw:Buffer.alloc(1000000)})));
await assert.rejects(()=>validateLogo(png({raw:Buffer.from([9,0,0,0,0])})));
const broken=Buffer.from(valid);broken[40]^=1;await assert.rejects(()=>validateLogo(broken));
await assert.rejects(()=>validateLogo(valid.subarray(0,24)));
console.log('PASS: email escaping, HTTPS-only links, light/dark templates, PNG CRC, truncation, dimensions, trailing payloads and decompression limits.');
const proxyExports={};
const NextResponse={next:({request})=>{const r=new Response(null);r.forwardedHeaders=request.headers;return r},redirect:(url,status)=>new Response(null,{status,headers:{Location:String(url)}}),json:Response.json};
const analyticsPath=load('lib/analytics-path.ts');
vm.runInNewContext(ts.transpileModule(readFileSync('proxy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:proxyExports,require:name=>name==='next/server'?{NextResponse}:name==='cloudflare:workers'?{env:{SUPABASE_URL:'https://example.supabase.co',POSTHOG_PROJECT_KEY:'phc_test'}}:name==='./lib/analytics-path'?analyticsPath:{},URL,Headers,Response,process:{env:{NODE_ENV:'production'}},crypto:globalThis.crypto,btoa});
const redirect=proxyExports.proxy(new Request('http://startupsafrica.summit88.co.za/'));
assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://startupsafrica.summit88.co.za/');
const secure=proxyExports.proxy(new Request('https://startupsafrica.summit88.co.za/'));
assert.equal(secure.headers.get('strict-transport-security'),'max-age=31536000');assert.ok(!secure.headers.get('content-security-policy').includes('unsafe-eval'));assert.ok(secure.headers.get('content-security-policy').includes('https://example.supabase.co wss://example.supabase.co'));
assert.equal(secure.headers.get('content-security-policy'),secure.forwardedHeaders.get('content-security-policy'));
assert.ok(secure.headers.get('content-security-policy').includes('https://us.i.posthog.com'));
assert.ok(secure.headers.get('content-security-policy').includes('https://us-assets.i.posthog.com'));
const privatePage=proxyExports.proxy(new Request('https://startupsafrica.summit88.co.za/admin'));
assert.equal(privatePage.headers.get('cache-control'),'private, no-store');assert.equal(privatePage.headers.get('x-robots-tag'),'noindex, nofollow');
assert.ok(!privatePage.headers.get('content-security-policy').includes('posthog.com'));
console.log('PASS: production HTTPS redirect, HSTS, nonce propagation, constrained connections, no eval, private page caching and indexing protection.');

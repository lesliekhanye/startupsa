import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
process.env.NODE_ENV='production';
process.env.PUBLIC_LAUNCH='false';
for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY'])delete process.env[key];
const {default:handler}=await import('../.vercel/output/functions/__server.func/index.mjs');
const base='https://startups.summit88.co.za';
let count=0;
async function check(path,status,init){const r=await handler.fetch(new Request(base+path,init));assert.equal(r.status,status,path);count++;return r;}
for(const path of ['/','/account','/admin','/submit','/privacy','/terms']){
 const r=await check(path,200);const html=await r.text();
 assert.equal(r.headers.get('x-frame-options'),'DENY');
 assert.equal(r.headers.get('x-content-type-options'),'nosniff');
 const nonce=r.headers.get('content-security-policy').match(/'nonce-([^']+)'/)[1];
 assert.ok(html.includes(`nonce="${nonce}"`),`${path}: nonce`);
 assert.equal(r.headers.get('x-robots-tag'),'noindex, nofollow');
}
for(const path of ['/.env','/.dev.vars','/.git/config','/nonexistent-page'])await check(path,404);
await check('/api/admin',401);
for(const path of ['/api/submissions','/api/reviews','/api/notifications'])await check(path,401,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({owner_id:'10000000-0000-4000-8000-000000000001'})});
await check('/api/votes',400,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
await check('/api/submissions',403,{method:'POST',headers:{Origin:'https://untrusted.example'},body:'{}'});
await check('/api/backend-config',503);
await check('/api/auth/email-code',503,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid'})});
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_runtime_test';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-private-runtime-only';
const config=await(await check('/api/backend-config',200)).json();
assert.deepEqual(config,{configured:true,url:process.env.SUPABASE_URL,key:process.env.SUPABASE_PUBLISHABLE_KEY});
process.env.SUPABASE_PUBLISHABLE_KEY=['sb', 'secret', 'invalid_public_key'].join('_');
await check('/api/backend-config',503);
assert.ok((await(await check('/robots.txt',200)).text()).includes('Disallow: /'));
assert.ok((await(await check('/sitemap.xml',200)).text()).includes('<urlset'));
const output=JSON.parse(readFileSync('.vercel/output/config.json','utf8'));
assert.equal(output.version,3);assert.ok(output.routes.some(r=>r.dest==='/__server'));
assert.equal(JSON.parse(readFileSync('.vercel/output/functions/__server.func/.vc-config.json','utf8')).runtime,'nodejs22.x');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const assets=walk('.vercel/output/static');
assert.ok(assets.some(p=>p.endsWith('.css')));assert.ok(assets.some(p=>p.endsWith('.js')));
for(const file of assets){const text=readFileSync(file,'utf8');assert.ok(!text.includes('vercel-build-secret-sentinel'),`Secret in ${file}`);}
console.log(`PASS: ${count} Vercel function requests, security headers/nonces, runtime env, secret-key rejection, static assets and deployment manifest. No external service calls.`);

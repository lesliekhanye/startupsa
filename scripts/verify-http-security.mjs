import assert from 'node:assert/strict';
const base=process.argv[2]||'http://localhost:5174';
let n=0;
async function request(path,status,options){await new Promise(resolve=>setTimeout(resolve,100));const response=await fetch(base+path,{...options,headers:{...options?.headers,Connection:"close"}});const body=await response.clone().text();assert.equal(response.status,status,`${path}: unexpected status ${body.slice(0,300)}`);n++;return response}
for(const path of ['/','/account','/admin','/submit','/privacy','/terms']){const r=await request(path,200);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.equal(r.headers.get('x-frame-options'),'DENY');assert.ok(r.headers.get('content-security-policy')?.includes("object-src 'none'"));const html=await r.text();const nonce=r.headers.get('content-security-policy').match(/'nonce-([^']+)'/)[1];assert.ok(html.includes(`nonce="${nonce}"`),`${path} must include matching script nonce`);assert.ok(!html.includes('codex-preview'));}
await request('/definitely-not-a-real-page',404);
for(const path of ['/.env','/.env.local','/.dev.vars','/.git/config'])await request(path,404);
await request('/api/admin',401);
for(const path of ['/api/submissions','/api/reviews','/api/notifications'])await request(path,401,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({owner_id:'10000000-0000-4000-8000-000000000001'})});
for(const path of ['/api/auth/email-code','/api/votes','/api/admin','/api/submissions'])await request(path,403,{method:'POST',headers:{Origin:'https://untrusted.example','Content-Type':'application/json'},body:'{}'});
await request('/api/votes',400,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});
const config=await (await request('/api/backend-config',200)).json();assert.deepEqual(Object.keys(config).sort(),config.configured?['configured','key','url']:['configured']);
if(config.configured){await request('/api/auth/email-code',400,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'invalid'})});await request('/api/auth/email-code',400,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid',website:'spam'})});}
const robots=await(await request('/robots.txt',200)).text();assert.ok(robots.includes('Disallow: /'));
const sitemap=await(await request('/sitemap.xml',200)).text();assert.ok(sitemap.includes('<urlset'));
console.log(`PASS: ${n} HTTP checks: headers/nonces, private routes, forged identity, cross-origin rejection, environment files, metadata, robots and sitemap. No emails or submissions created.`);

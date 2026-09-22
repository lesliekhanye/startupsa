import {execFileSync} from 'node:child_process';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {parseEnv} from 'node:util';
// Report only location and category. Never print matched secret values.
const patterns=[[/sb_secret_[A-Za-z0-9_-]{16,}/g,'Supabase secret'],[/re_[A-Za-z0-9]{20,}/g,'Resend key'],[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,'private key'],[/postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/g,'database credential'],[/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'JWT']];
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:30000000}).trim();
let findings=0;
function scan(text,location){for(const [pattern,label]of patterns)for(const match of text.matchAll(pattern)){if(label==='JWT'){try{if(JSON.parse(Buffer.from(match[0].split('.')[1],'base64url')).role!=='service_role')continue}catch{continue}}console.log('Potential secret:',location,label);findings++}}
const commits=git('rev-list','--all').split('\n').filter(Boolean),seen=new Set();
for(const commit of commits)for(const row of git('ls-tree','-r',commit).split('\n')){const [info,path]=row.split('\t');if(!path||/\.(png|jpe?g|woff2?|ico)$|package-lock\.json$/.test(path))continue;const hash=info.split(' ')[2];if(seen.has(hash))continue;seen.add(hash);scan(git('show',hash),`${commit.slice(0,8)}:${path}`)}
const workFiles=git('ls-files','--cached','--others','--exclude-standard').split('\n');for(const path of workFiles)if(existsSync(path)&&!(/\.(png|jpe?g|woff2?|ico)$|package-lock\.json$/.test(path)))scan(readFileSync(path,'utf8'),path);
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(join(dir,entry.name)):[join(dir,entry.name)]);
let assetCount=0;
if(existsSync('.dev.vars')&&existsSync('dist/client')){const secrets=Object.entries(parseEnv(readFileSync('.dev.vars','utf8'))).filter(([key,value])=>/SECRET|SERVICE_ROLE|PASSWORD|DATABASE_URL|RESEND_API_KEY/.test(key)&&value.length>10);const assets=walk('dist/client');assetCount=assets.length;for(const file of assets){const text=readFileSync(file,'utf8');for(const [key,value]of secrets)if(text.includes(value)){console.log('Browser secret leak:',file,key);findings++}}}
console.log(`Scanned ${commits.length} commits, ${workFiles.length} current files, and ${assetCount} browser assets. Potential secret matches: ${findings}.`);
if(findings)process.exitCode=1;

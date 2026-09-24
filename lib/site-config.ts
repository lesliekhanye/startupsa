import {env} from 'cloudflare:workers';
export function siteConfig(){
 let url: string | undefined;
 try{const parsed=new URL(env.SITE_URL||'https://startupsafrica.summit88.co.za');if(parsed.protocol==='https:'&&!parsed.username&&!parsed.password)url=parsed.origin}catch{}
 const legalName=env.LEGAL_ENTITY_NAME?.trim()||'startupsSA';
 const contact=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.PRIVACY_CONTACT_EMAIL||'central@summit88.co.za')?(env.PRIVACY_CONTACT_EMAIL||'central@summit88.co.za'):undefined;
 return {url,legalName,contact};
}

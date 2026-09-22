import {siteConfig} from '@/lib/site-config';
import {adminClient} from '@/lib/startup-server';
import {escapeHtml} from '@/lib/email-templates';
export async function GET(){
 const {url,launched}=siteConfig();let paths=['/','/privacy','/terms'];
 if(launched){const {data,error}=await adminClient().from('startups').select('slug').eq('hidden',false);if(error)return new Response('Sitemap temporarily unavailable',{status:503});paths=[...paths,...(data??[]).map(row=>'/startups/'+encodeURIComponent(row.slug))]}
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${launched?paths.map(path=>`<url><loc>${escapeHtml(url+path)}</loc></url>`).join(''):''}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
}

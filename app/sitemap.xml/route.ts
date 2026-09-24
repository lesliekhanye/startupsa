import {siteConfig} from '@/lib/site-config';
import {adminClient} from '@/lib/startup-server';
import {escapeHtml} from '@/lib/email-templates';
export async function GET(){
 const {url}=siteConfig();let paths=['/','/how-it-works','/privacy','/terms'];
 try{const {data,error}=await adminClient().from('startups').select('slug').eq('hidden',false);if(error)throw error;paths=[...paths,...(data??[]).map(row=>'/startups/'+encodeURIComponent(row.slug))]}catch{return new Response('Sitemap temporarily unavailable',{status:503})}
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path=>`<url><loc>${escapeHtml(url+path)}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
}

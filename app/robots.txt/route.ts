import {siteConfig} from '@/lib/site-config';
export function GET(){const {url,launched}=siteConfig();return new Response(launched?`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /submit\nDisallow: /api/\nSitemap: ${url}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})}

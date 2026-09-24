import {siteConfig} from '@/lib/site-config';
export function GET(){const {url}=siteConfig();return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /account\nDisallow: /submit\nDisallow: /api/\nSitemap: ${url}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})}

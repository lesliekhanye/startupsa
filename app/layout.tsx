import type {Metadata} from 'next';
import {env} from 'cloudflare:workers';
import {siteConfig} from '@/lib/site-config';
import {PrivacyControls} from '@/components/privacy-controls';
import './globals.css';
export function generateMetadata():Metadata{
 const {url,launched}=siteConfig();
 return {metadataBase:new URL(url||'https://startups.summit88.co.za'),title:'Startup SA — Before everyone knows them',description:'Discover what South Africa is building next. Find your favourite emerging startups and give them a little lift.',robots:launched?{index:true,follow:true}:{index:false,follow:false},openGraph:{type:'website',siteName:'Startup SA',locale:'en_ZA',title:'Startup SA — Before everyone knows them',description:'Discover what South Africa is building next.',images:[{url:'/social-preview.png',width:1200,height:630,alt:'Startup SA — Before everyone knows them. Discover what South Africa is building next.'}]},twitter:{card:'summary_large_image',images:['/social-preview.png']},icons:{icon:'/favicon.svg?v=2',apple:'/apple-touch-icon.png'}};
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-ZA"><body className="antialiased">{children}<PrivacyControls analyticsEnabled={env.VERCEL_ANALYTICS_ENABLED==='true'}/></body></html>}

import type {Metadata} from 'next';
import {siteConfig} from '@/lib/site-config';
import {PrivacyControls} from '@/components/privacy-controls';
import './globals.css';
export function generateMetadata():Metadata{
 const {url}=siteConfig();
 return {metadataBase:new URL(url||'https://startupsafrica.summit88.co.za'),title:'StartupsAfrica — Discover Africa’s next generation of startups',description:'Discover Africa’s next generation of startups. Find emerging companies, new launches and founders worth watching — before everyone knows them.',robots:{index:true,follow:true},openGraph:{type:'website',siteName:'StartupsAfrica',locale:'en',title:'StartupsAfrica — Discover Africa’s next generation of startups',description:'Discover Africa’s next generation of startups. Find emerging companies, new launches and founders worth watching — before everyone knows them.',images:[{url:'/social-preview.png',width:1200,height:630,alt:'StartupsAfrica — Discover Africa’s next generation of startups.'}]},twitter:{card:'summary_large_image',images:['/social-preview.png']},manifest:'/site.webmanifest',icons:{icon:[{url:'/favicon.ico'},{url:'/favicon-32x32.png',sizes:'32x32',type:'image/png'},{url:'/favicon-16x16.png',sizes:'16x16',type:'image/png'}],apple:'/apple-touch-icon.png'}};
}
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en-ZA"><body className="antialiased">{children}<PrivacyControls/></body></html>}

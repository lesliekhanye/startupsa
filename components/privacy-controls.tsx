'use client';
import {usePathname} from 'next/navigation';
import Link from '@/components/site-link';
import {Analytics} from '@vercel/analytics/next';
import {SpeedInsights} from '@vercel/speed-insights/next';

function filterTelemetry<T extends {url:string}>(event:T):T|null{
 try{
  const url=new URL(event.url);
  if(!['/','/how-it-works','/privacy','/terms'].includes(url.pathname)&&!url.pathname.startsWith('/startups/'))return null;
  url.search='';url.hash='';return {...event,url:url.toString()};
 }catch{return null}
}

export function PrivacyControls(){
 const pathname=usePathname();
 const publicPage=pathname==='/'||pathname==='/how-it-works'||pathname==='/privacy'||pathname==='/terms'||pathname.startsWith('/startups/');
 return <>
  <nav className="legal-footer" aria-label="Legal and privacy"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & conditions</Link><a href="mailto:central@summit88.co.za">Contact</a></nav>
  {publicPage&&<><Analytics debug={false} mode="production" beforeSend={filterTelemetry}/><SpeedInsights debug={false} beforeSend={filterTelemetry}/></>}
 </>;
}

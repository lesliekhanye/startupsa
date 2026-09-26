'use client';
import {usePathname} from 'next/navigation';
import Link from '@/components/site-link';
import {useEffect} from 'react';
import {isPublicAnalyticsPath} from '@/lib/analytics-path';

export function PrivacyControls(){
 const pathname=usePathname();
 useEffect(()=>{
  if(!isPublicAnalyticsPath(pathname))return;
  let cancelled=false;
  void (async()=>{
   const analytics=await import('@/lib/analytics');
   const response=await fetch('/api/analytics-config',{cache:'no-store'});
   if(!response.ok||cancelled)return;
   const config=await response.json() as {key?:string;host?:string};
   if(!config.key||!config.host||cancelled)return;
   analytics.startAnalytics({key:config.key,host:config.host});
   analytics.capturePublicPageview(pathname);
  })().catch(()=>{});
  return()=>{cancelled=true};
 },[pathname]);
 return <>
  <nav className="legal-footer" aria-label="Legal and privacy"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & conditions</Link><a href="mailto:central@summit88.co.za">Contact</a></nav>
 </>;
}

'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import Link from '@/components/site-link';
import {Analytics} from '@vercel/analytics/next';
import {SpeedInsights} from '@vercel/speed-insights/next';
const key='startup-sa-privacy-v1';
const subscribe=(listener:()=>void)=>{window.addEventListener('storage',listener);window.addEventListener('privacy-change',listener);return()=>{window.removeEventListener('storage',listener);window.removeEventListener('privacy-change',listener)}};
const snapshot=()=>{try{return localStorage.getItem(key)||'unset'}catch{return 'unset'}};
const serverSnapshot=()=>'loading';
function filterTelemetry<T extends {url:string}>(event:T):T|null{
 if(snapshot()!=='analytics')return null;
 try{
  const url=new URL(event.url);
  if(!['/','/how-it-works','/privacy','/terms'].includes(url.pathname)&&!url.pathname.startsWith('/startups/'))return null;
  url.search='';url.hash='';return {...event,url:url.toString()};
 }catch{return null}
}
export function PrivacyControls(){
 const choice=useSyncExternalStore(subscribe,snapshot,serverSnapshot),[editing,setEditing]=useState(false),[notice,setNotice]=useState('');
 const pathname=usePathname();
 function save(value:'essential'|'analytics'){
  try{localStorage.setItem(key,value);window.dispatchEvent(new Event('privacy-change'));setEditing(false);setNotice('Your privacy preference has been saved.');if(choice==='analytics'&&value==='essential')location.reload()}catch{setNotice('Your browser could not save this preference. Optional analytics stays off.');setEditing(false)}
 }
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key===key&&event.newValue!=='analytics')location.reload()};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const publicPage=pathname==='/'||pathname==='/how-it-works'||pathname==='/privacy'||pathname==='/terms'||pathname.startsWith('/startups/');
 return <><nav className="legal-footer" aria-label="Legal and privacy"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & conditions</Link><button onClick={()=>setEditing(true)}>Cookie settings</button><a href="mailto:central@summit88.co.za">Contact</a></nav><p className="sr-only" role="status">{notice}</p>{(choice==='unset'||editing)&&<section className="cookie-banner" aria-labelledby="cookie-title"><div><h2 id="cookie-title">Your privacy, your choice.</h2><p>We use essential storage for sign-in and voting. With your permission, Vercel Analytics and Speed Insights help us understand visits and measure site performance. <Link href="/privacy">Read our privacy policy</Link>.</p></div><div className="cookie-actions"><button className="secondary" onClick={()=>save('essential')}>Essential only</button><button className="secondary" onClick={()=>save('analytics')}>Allow analytics</button></div></section>}{choice==='analytics'&&publicPage&&<><Analytics debug={false} mode="production" beforeSend={filterTelemetry}/><SpeedInsights debug={false} beforeSend={filterTelemetry}/></>}</>;
}

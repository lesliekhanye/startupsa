'use client';
import {useEffect,useState,useSyncExternalStore} from 'react';
import {usePathname} from 'next/navigation';
import Link from '@/components/site-link';
import {Analytics} from '@vercel/analytics/react';
const key='startup-sa-privacy-v1';
const subscribe=(listener:()=>void)=>{window.addEventListener('storage',listener);window.addEventListener('privacy-change',listener);return()=>{window.removeEventListener('storage',listener);window.removeEventListener('privacy-change',listener)}};
const snapshot=()=>{try{return localStorage.getItem(key)||'unset'}catch{return 'unset'}};
const serverSnapshot=()=>'loading';
export function PrivacyControls({analyticsEnabled}:{analyticsEnabled:boolean}){
 const choice=useSyncExternalStore(subscribe,snapshot,serverSnapshot),[editing,setEditing]=useState(false),[notice,setNotice]=useState('');
 const pathname=usePathname();
 function save(value:'essential'|'analytics'){
  try{localStorage.setItem(key,value);window.dispatchEvent(new Event('privacy-change'));setEditing(false);setNotice('Your privacy preference has been saved.');if(choice==='analytics'&&value==='essential')location.reload()}catch{setNotice('Your browser could not save this preference. Optional analytics stays off.');setEditing(false)}
 }
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key===key&&event.newValue!=='analytics')location.reload()};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const publicPage=pathname==='/'||pathname==='/privacy'||pathname==='/terms'||pathname.startsWith('/startups/');
 return <><nav className="legal-footer" aria-label="Legal and privacy"><Link href="/privacy">Privacy policy</Link><Link href="/terms">Terms & conditions</Link><button onClick={()=>setEditing(true)}>Cookie settings</button><a href="mailto:central@summit88.co.za">Contact</a></nav><p className="sr-only" role="status">{notice}</p>{(choice==='unset'||editing)&&<section className="cookie-banner" aria-labelledby="cookie-title"><div><h2 id="cookie-title">Your privacy, your choice.</h2><p>We use essential storage for sign-in and voting. With your permission, Vercel Analytics helps us understand visits and improve the site. <Link href="/privacy">Read our privacy policy</Link>.</p></div><div className="cookie-actions"><button className="secondary" onClick={()=>save('essential')}>Essential only</button><button className="secondary" onClick={()=>save('analytics')}>Allow analytics</button></div></section>}{analyticsEnabled&&choice==='analytics'&&publicPage&&<Analytics debug={false} mode="production" beforeSend={event=>{if(snapshot()!=='analytics')return null;const url=new URL(event.url);if(!['/','/privacy','/terms'].includes(url.pathname)&&!url.pathname.startsWith('/startups/'))return null;url.search='';url.hash='';return {...event,url:url.toString()}}}/>}</>;
}

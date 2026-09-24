"use client";
import Link from "@/components/site-link";
import type {StartupRecord} from '@/lib/startup-schema';
import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,ChevronUp,Check} from 'lucide-react';
import {useStartupBackend} from '@/hooks/use-startup-backend';
import {SignInDialog} from '@/components/startup-account';
import {StartupLogo} from '@/components/startup-logo';
import {InlineLoader} from '@/components/infinity-loop';
import {Toaster} from '@/components/ui/sonner';
import {toast} from 'sonner';
export function StartupPage({slug,initialItem}:{slug:string;initialItem:StartupRecord}){
 const backend=useStartupBackend();const [auth,setAuth]=useState(false),[busy,setBusy]=useState(false);
 const item=backend.records.find(s=>s.slug===slug)??(backend.status==='loading'?initialItem:undefined);
 useEffect(()=>{if(item)document.title=`${item.name} — StartupsAfrica`},[item]);
 async function vote(){if(!item||!backend.client||busy)return;setBusy(true);try{await backend.vote(item.id,!item.my_vote)}catch(error){toast.error(error instanceof Error?error.message:'Could not save your vote. Please retry.')}finally{setBusy(false)}}
 return <div className="shell"><header><Link className="brand" href="/" aria-label="StartupsAfrica home"><img src="/startupsa-logo.png" alt=""/><span>StartupsAfrica</span></Link><button className="account-button" style={{marginLeft:'auto'}} onClick={()=>backend.session?location.assign(backend.moderator?'/admin':'/account'):setAuth(true)}>{backend.session?backend.moderator?'Admin':'My account':'Sign in'}</button></header><main className="startup-detail"><Link className="detail-back" href="/"><ArrowLeft size={16}/> Back to startups</Link>{backend.status==='loading'&&!item?<p><InlineLoader label="Loading startup…"/></p>:backend.status==='error'?<div role="alert"><p>{backend.error}</p><button className="secondary" onClick={()=>backend.reload()}>Retry</button></div>:!item?<><h1>Startup not found</h1><p>This listing isn’t published or is no longer available.</p></>:<><div className="detail-title"><span className="mark"><StartupLogo id={item.id} name={item.name} hasLogo={!!item.logo_path}/></span><div><p className="detail-label">{item.category} · {item.city}{item.country?` · ${item.country}`:''}</p><h1>{item.name}</h1></div></div><p className="detail-pitch">{item.pitch}</p><div className="dialog-actions"><button className="primary" disabled={busy||backend.status!=='ready'} onClick={vote}>{item.my_vote?<Check size={17}/>:<ChevronUp size={17}/>} {item.my_vote?'Supported':'Support this startup'}{backend.status==='ready'?` · ${item.total_votes}`:''}</button><a className="secondary" href={/^https?:\/\//.test(item.website)?item.website:undefined} target="_blank" rel="noopener noreferrer">Visit website <ArrowUpRight size={16}/></a><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(location.href);toast.success('Profile link copied.')}catch{toast.error('Copy the link from your address bar.')}}}>Copy link</button></div><section className="detail-story"><h2>About {item.name}</h2><p>{item.story}</p></section><dl className="detail-facts"><div><dt>Founder</dt><dd>{item.founder}</dd></div><div><dt>Founded</dt><dd>{item.founded_year}</dd></div><div><dt>Stage</dt><dd>{item.stage}</dd></div><div><dt>Listing</dt><dd>Reviewed listing</dd></div></dl></>}</main><SignInDialog open={auth} onOpenChange={setAuth} client={backend.client}/><Toaster/></div>;
}

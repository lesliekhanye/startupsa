"use client";
import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';

export function LiveVisitors({client}:{client:SupabaseClient|null}){
  const [count,setCount]=useState<number|null>(null);
  useEffect(()=>{
    if(!client)return;
    let stopped=false,subscribed=false;
    let queue=Promise.resolve();
    // Origin-scoped, ephemeral presence: no emails, account IDs or visit history.
    const channel=client.channel(`startup-sa:visitors:${location.host}`,{config:{presence:{key:crypto.randomUUID()}}});
    const update=()=>{
      queue=queue.then(async()=>{
        if(stopped||!subscribed)return;
        const result=document.visibilityState==='visible'?await channel.track({active:true}):await channel.untrack();
        if(!stopped&&result!=='ok')setCount(null);
      }).catch(()=>{if(!stopped)setCount(null)});
    };
    channel.on('presence',{event:'sync'},()=>{
      if(!stopped)setCount(Object.values(channel.presenceState<{active?:boolean}>()).filter(entries=>entries.some(entry=>entry.active===true)).length);
    }).subscribe(status=>{
      if(stopped)return;
      subscribed=status==='SUBSCRIBED';
      if(subscribed)update();else setCount(null);
    });
    const offline=()=>setCount(null);
    document.addEventListener('visibilitychange',update);
    window.addEventListener('offline',offline);
    return()=>{stopped=true;document.removeEventListener('visibilitychange',update);window.removeEventListener('offline',offline);void client.removeChannel(channel)};
  },[client]);
  return <span className="live-visitors" title="Estimated active browser tabs, updated live. No names or emails are shared. Multiple tabs or devices may count separately."><span className={count===null?'visitor-dot unavailable':'visitor-dot'} aria-hidden="true"/>{count===null?'Live count unavailable':`${count} ${count===1?'visitor':'visitors'} online`}</span>;
}

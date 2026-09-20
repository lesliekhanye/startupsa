"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import {getSupabase} from '@/lib/supabase';
import type {StartupRecord,SubmissionRecord} from '@/lib/startup-schema';
export function useStartupBackend(){
  const [client,setClient]=useState<SupabaseClient|null>(null);
  const [status,setStatus]=useState<'loading'|'demo'|'ready'|'error'>('loading');
  const [session,setSession]=useState<Session|null>(null);
  const [records,setRecords]=useState<StartupRecord[]>([]);
  const [submissions,setSubmissions]=useState<SubmissionRecord[]>([]);
  const [moderator,setModerator]=useState(false);
  const [error,setError]=useState('');
  const generation=useRef(0);
  const refresh=useCallback(async(c:SupabaseClient,userId?:string)=>{
    const run=++generation.current;
    const [board,role,items]=await Promise.all([
      (async()=>{try{const {data:auth}=await c.auth.getSession();const r=await fetch('/api/leaderboard',{cache:'no-store',headers:auth.session?{Authorization:`Bearer ${auth.session.access_token}`}:{}});const result=await r.json() as {records?:StartupRecord[]};return {data:result.records??[],error:!r.ok}}catch{return {data:[],error:true}}})(),
      userId?c.rpc('is_startup_moderator'):Promise.resolve({data:false,error:null}),
      userId?c.from('startup_submissions').select('id,name,website,pitch,story,category,city,stage,founded_year,founder,status,review_note,created_at,logo_path').order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
    ]);
    if(run!==generation.current)return;
    if(board.error||role.error||items.error){setError('The startup service is unavailable. Please retry.');setStatus('error');return}
    setRecords(board.data??[]);setModerator(!!role.data);setSubmissions(items.data??[]);setError('');setStatus('ready');
  },[]);
  useEffect(()=>{let cancelled=false;let unsubscribe:(()=>void)|undefined;
    getSupabase().then(async c=>{if(cancelled)return;if(!c){setStatus('demo');return}setClient(c);
      const subscription=c.auth.onAuthStateChange((_event,next)=>{if(cancelled)return;setSession(next);setModerator(false);setSubmissions([]);queueMicrotask(()=>{if(!cancelled)void refresh(c,next?.user.id)})});unsubscribe=()=>subscription.data.subscription.unsubscribe();
      const {data,error:authError}=await c.auth.getSession();if(cancelled)return;if(authError){setError('Your sign-in could not be restored. Please sign in again.');setStatus('error');return}setSession(data.session);await refresh(c,data.session?.user.id);
    }).catch(()=>{if(!cancelled){setError('Could not reach the startup service. Please reload to retry.');setStatus('error')}});
    return()=>{cancelled=true;generation.current++;unsubscribe?.()};
  },[refresh]);
  async function vote(id:string,active:boolean){
    if(!client)throw new Error('Voting is unavailable.');
    const {data:auth}=await client.auth.getSession();
    const r=await fetch('/api/votes',{method:'POST',headers:{'Content-Type':'application/json',...(auth.session?{Authorization:`Bearer ${auth.session.access_token}`}:{})},body:JSON.stringify({target_id:id,desired_active:active})});
    const result=await r.json() as {error?:string};if(!r.ok)throw new Error(result.error||'Could not save your vote.');await refresh(client,auth.session?.user.id);
  }
  return {client,status,session,records,submissions,moderator,error,vote,reload:()=>client?refresh(client,session?.user.id):Promise.resolve()};
}

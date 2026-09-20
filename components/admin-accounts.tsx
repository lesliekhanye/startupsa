"use client";
import {useEffect,useState} from 'react';
type Account={id:string;email:string|null;verified:boolean};
export function AdminAccounts({token}:{token:string}){
 const [page,setPage]=useState(1),[refresh,setRefresh]=useState(0),[result,setResult]=useState<{accounts:Account[];hasNext:boolean}|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();setResult(null);setError('');
  void (async()=>{try{
   const response=await fetch(`/api/admin/accounts?page=${page}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal});
   const data=await response.json() as {accounts:Account[];hasNext:boolean;error?:string};
   if(!response.ok)throw new Error(data.error||'Could not load accounts.');
   if(!controller.signal.aborted)setResult(data);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Could not load accounts.')}})();
  return()=>controller.abort();
 },[token,page,refresh]);
 return <section className="admin-workspace" aria-labelledby="admin-accounts-heading"><div className="admin-toolbar"><h2 id="admin-accounts-heading">All user accounts</h2><button className="secondary" onClick={()=>setRefresh(v=>v+1)}>Refresh accounts</button></div><p className="admin-caption">Private admin view · Includes Startup SA and finance-app accounts.</p>
 {error?<p role="alert">{error} <button className="secondary" onClick={()=>setRefresh(v=>v+1)}>Retry</button></p>:!result?<p role="status">Loading accounts…</p>:<>{result.accounts.length?<ul className="admin-account-list">{result.accounts.map(account=><li key={account.id}><span>{account.email||'No email address'}</span><span className="admin-caption">{account.verified?'Email verified':'Email not verified'}</span></li>)}</ul>:<p>No accounts on this page.</p>}<nav className="admin-pagination" aria-label="Account pages"><button className="secondary" disabled={page===1} onClick={()=>setPage(v=>v-1)}>Previous</button><span>Page {page}</span><button className="secondary" disabled={!result.hasNext} onClick={()=>setPage(v=>v+1)}>Next</button></nav></>}
 </section>
}

"use client";
import Image from "next/image";
import Link from "@/components/site-link";
import {useObjectUrl} from "@/hooks/use-object-url";
import {Toaster} from "@/components/ui/sonner";
import {useEffect,useState,useRef} from "react";
import {ArrowRight,ChevronLeft} from "lucide-react";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from "@/components/ui/select";
import {toast} from "sonner";
import {useStartupBackend} from '@/hooks/use-startup-backend';
import {submissionSchema} from '@/lib/startup-schema';
import {prepareLogo} from '@/components/startup-logo';
import {SignInDialog} from '@/components/startup-account';

const categories=["All startups","Fintech","AI","SaaS","Climate / Energy","Health","Education","Commerce","Mobility","AgriTech","Developer Tools","Other"];
const emptyDraft={name:"",website:"",pitch:"",category:"",city:"",stage:"",founder:"",year:"2026",story:""};

export default function SubmitPage(){
 const backend=useStartupBackend();
 const [logo,setLogo]=useState<File|null>(null),[logoBusy,setLogoBusy]=useState(false),[emailPending,setEmailPending]=useState(false);
 const [authOpen,setAuthOpen]=useState(false),[sending,setSending]=useState(false),[saved,setSaved]=useState(false),[draft,setDraft]=useState(emptyDraft);
 const [companyUrl,setCompanyUrl]=useState('');
 const submissionRequest=useRef<{id:string;body:string}|null>(null);

 const logoPreview=useObjectUrl(logo);
 useEffect(()=>{try{const d=JSON.parse(localStorage.getItem("startup-sa-draft")||"null");if(d&&Object.keys(emptyDraft).every(k=>typeof d[k]==="string"))queueMicrotask(()=>setDraft(d))}catch{}},[]);
 
 // Force auth if needed
 useEffect(()=>{
   if(backend.status === 'ready' && !backend.session){
     queueMicrotask(()=>setAuthOpen(true));
   }
 },[backend.status, backend.session]);

 async function sendSubmission(){
   if(sending||logoBusy)return;
   const parsed=submissionSchema.safeParse(draft);
   if(!parsed.success){toast.error(parsed.error.issues[0].message);return}
   if(!backend.client){try{localStorage.setItem('startup-sa-draft',JSON.stringify(draft));setSaved(true)}catch{toast.error('Could not save this draft.')}return}
   if(!backend.session){setAuthOpen(true);return}
   const body=JSON.stringify(parsed.data)+(logo?`${logo.size}:${logo.lastModified}`:'');
   if(submissionRequest.current?.body!==body)submissionRequest.current={id:crypto.randomUUID(),body};
   setSending(true);
   try{
     const form=new FormData();
     form.set('payload',JSON.stringify(parsed.data));
     form.set('company_url',companyUrl);
     form.set('request_id',submissionRequest.current.id);
     if(logo)form.set('logo',logo);
     const {data:auth}=await backend.client.auth.getSession();
     const result=await fetch('/api/submissions',{method:'POST',headers:{Authorization:`Bearer ${auth.session?.access_token}`},body:form});
     const data=await result.json() as {error?:string;emailPending?:boolean};
     if(!result.ok)throw new Error(data.error||'Could not save submission.');
     setEmailPending(!!data.emailPending);
     setSaved(true);
     setDraft(emptyDraft);
     setLogo(null);
     submissionRequest.current=null;
     try{localStorage.removeItem('startup-sa-draft')}catch{}
     await backend.reload();
   }catch(e){
     toast.error(e&&typeof e==='object'&&'message' in e?String(e.message):'Could not submit. Your details are still here.');
   }finally{
     setSending(false);
   }
 }

 if(saved) {
   return <div className="submit-page">
     <div className="submit-container success-container">
       <div className="success-icon"><ArrowRight size={40}/></div>
       <h1>{backend.client?'Sent for review.':'Your draft is saved.'}</h1>
       <p>{backend.client?emailPending?'Your submission is saved. Your confirmation email is queued for retry; check My account for updates. We’ll also email you once approved.':'Your submission is saved. A confirmation email is on its way, and we’ll email you again once approved. Check My account for its review status.':saved?'Saved on this device.':'This preview saves a local draft; it does not publish your listing.'}</p>
       <Link className="primary submit-btn" href="/">Back to discovering <ArrowRight size={16}/></Link>
     </div>
   </div>
 }

 return <div className="submit-page">
   <div className="submit-container">
     <Link href="/" className="back-link"><ChevronLeft size={16}/> Back</Link>
     <div className="submit-header">
       <h1>Give your startup a head start.</h1>
       <p>Tell us what you’re building. You’ll receive a confirmation email after submitting and another email once approved.</p>
     </div>
     
     <form className="submit-form" onSubmit={e=>{e.preventDefault();void sendSubmission()}}>
       <label className="honeypot" aria-hidden="true">Leave empty<input tabIndex={-1} autoComplete="off" value={companyUrl} onChange={e=>setCompanyUrl(e.target.value)}/></label><fieldset disabled={sending||logoBusy}>
         <div className="form-section">
           <label className="logo-upload">
             <span>Startup logo (optional)</span>
             <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setLogoBusy(true);try{setLogo(await prepareLogo(file));submissionRequest.current=null}catch(error){toast.error(error instanceof Error?error.message:'Could not load this image.');e.target.value=''}finally{setLogoBusy(false)}}}/>
             <small>PNG, JPEG or WebP, up to 5 MB. Your logo will appear after approval.</small>
           </label>
           {logoPreview&&<div className="logo-preview"><Image unoptimized width={112} height={112} src={logoPreview} alt="Selected logo preview"/><button className="secondary" type="button" onClick={()=>setLogo(null)}>Remove logo</button></div>}
         </div>

         <div className="form-grid">
           {([['name','Startup name','text'],['website','Website','url'],['founder','Founder name','text'],['city','City','text'],['year','Founded year','number']] as const).map(([key,label,type])=><label key={key}><span>{label}</span><input required type={type} min={type==='number'?1900:undefined} max={type==='number'?new Date().getFullYear():undefined} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
           <label><span>Category</span><Select required value={draft.category} onValueChange={v=>setDraft({...draft,category:v})}><SelectTrigger><SelectValue placeholder="Choose a category"/></SelectTrigger><SelectContent>{categories.slice(1).map(c=><SelectItem value={c} key={c}>{c}</SelectItem>)}</SelectContent></Select></label>
           <label><span>Stage</span><Select required value={draft.stage} onValueChange={v=>setDraft({...draft,stage:v})}><SelectTrigger><SelectValue placeholder="Choose a stage"/></SelectTrigger><SelectContent>{['Idea','Building','Launched','Revenue','Growing'].map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></label>
         </div>

         <div className="form-section full-width">
           <label><span>One-line pitch</span><input required minLength={10} maxLength={120} value={draft.pitch} onChange={e=>setDraft({...draft,pitch:e.target.value})}/></label>
           <label><span>Your story</span><textarea required minLength={50} maxLength={3000} rows={4} value={draft.story} onChange={e=>setDraft({...draft,story:e.target.value})}/></label>
         </div>
       </fieldset>

       <p className="form-legal">By submitting, you confirm that you’re authorised to share this listing and agree to our <Link href="/terms">Terms & conditions</Link>. See our <Link href="/privacy">Privacy policy</Link> for how we handle your information.</p><div className="submit-actions">
         <button className="primary submit-btn" disabled={sending||logoBusy||backend.status==='loading'||backend.status==='error'} type="submit">{sending?'Submitting…':backend.client?'Submit for review':'Save startup draft'} <ArrowRight size={16}/></button>
       </div>
     </form>
   </div>
   <Toaster position="bottom-center" closeButton/><SignInDialog open={authOpen} onOpenChange={(o)=>{if(!o && !backend.session){/* User cancelled login */} setAuthOpen(o);}} client={backend.client}/>
 </div>
}

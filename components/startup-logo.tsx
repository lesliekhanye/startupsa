"use client";
import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
export function StartupLogo({id,name,hasLogo,client}:{id?:string;name:string;hasLogo?:boolean;client?:SupabaseClient|null}){
 const [src,setSrc]=useState<string|null>(null),[failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false);if(!id||!hasLogo)return;let cancelled=false,url:string|undefined;
  if(!client){setSrc(`/api/logos/${id}`);return}
  void (async()=>{const {data}=await client.auth.getSession();const r=await fetch(`/api/logos/${id}`,{headers:data.session?{Authorization:`Bearer ${data.session.access_token}`}:{}});if(!r.ok)throw new Error();const blob=await r.blob();if(cancelled)return;url=URL.createObjectURL(blob);setSrc(url)})().catch(()=>{if(!cancelled)setFailed(true)});
  return()=>{cancelled=true;if(url)URL.revokeObjectURL(url)};
 },[id,hasLogo,client]);
 return src&&hasLogo&&!failed?<img className="startup-logo" src={src} alt={`${name} logo`} onError={()=>setFailed(true)}/>:<>{name.slice(0,2)}</>;
}
export async function prepareLogo(file:File){
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error('Choose a PNG, JPEG or WebP image up to 5 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width>4096||bitmap.height>4096)throw new Error('Logo dimensions must be at most 4096 × 4096.');
  const ratio=Math.min(1,512/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  const context=canvas.getContext('2d');if(!context)throw new Error('Could not process this image.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not process this image.')),'image/png'));
  if(blob.size>1048576)throw new Error('Please choose a simpler or smaller logo.');return new File([blob],'logo.png',{type:'image/png'});
 }finally{bitmap.close()}
}

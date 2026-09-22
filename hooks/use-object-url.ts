'use client';
import {useEffect,useState} from 'react';
export function useObjectUrl(file:File|null){
 const [preview,setPreview]=useState<{file:File;url:string}|null>(null);
 useEffect(()=>{if(!file)return;let active=true;const url=URL.createObjectURL(file);queueMicrotask(()=>{if(active)setPreview({file,url})});return()=>{active=false;URL.revokeObjectURL(url)}},[file]);
 return preview?.file===file?preview?.url||'':'';
}

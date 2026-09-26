'use client';
import posthog from 'posthog-js';
import {isPublicAnalyticsPath} from '@/lib/analytics-path';

type AnalyticsConfig={key:string;host:string};
type PublicEvent='submit_cta_clicked'|'startup_website_clicked'|'startup_vote_added'|'startup_vote_removed';
type EventProperties={startup_slug?:string;category?:string};
let started=false;

function cleanUrl(value:string){
 try{const url=new URL(value);return /^https?:$/.test(url.protocol)?`${url.origin}${url.pathname}`:undefined}
 catch{return undefined}
}

function maskReplayAttribute(name:string,value:string){
 if(name==='value'||name.startsWith('data-'))return '';
 if(['href','src','action','poster'].includes(name)){
  if(value.startsWith('/')&&!value.startsWith('//'))return value.split(/[?#]/,1)[0];
  return cleanUrl(value)??'';
 }
 return value;
}

export function startAnalytics({key,host}:AnalyticsConfig){
 if(started||typeof window==='undefined')return;
 posthog.init(key,{
  api_host:host,
  person_profiles:'never',
  persistence:'memory',
  autocapture:false,
  capture_pageview:false,
  capture_pageleave:false,
  capture_performance:false,
  disable_session_recording:true,
  disable_capture_url_hashes:true,
  advanced_disable_feature_flags:true,
  session_recording:{
   maskAllInputs:true,
   blockSelector:'[role="dialog"], .account-page, .submit-page, .admin-app',
   maskAttributeFn:maskReplayAttribute,
   maskCapturedNetworkRequestFn:()=>null,
   captureJsonLd:false,
   recordHeaders:false,
   recordBody:false,
  },
  before_send:event=>{
   if(!event||!['$pageview','$snapshot','submit_cta_clicked','startup_website_clicked','startup_vote_added','startup_vote_removed'].includes(event.event))return null;
   const properties={...event.properties};
   for(const [name,value] of Object.entries(properties)){
    if(typeof value==='string'&&/(url|referrer)/i.test(name))properties[name]=cleanUrl(value)??'';
   }
   let path='';
   try{path=new URL(String(properties.$current_url)).pathname}catch{
    if(event.event!=='$snapshot')return null;
    path=window.location.pathname;
   }
   if(!isPublicAnalyticsPath(path))return null;
   if(event.event==='$snapshot'&&!isPublicAnalyticsPath(window.location.pathname))return null;
   return {...event,properties};
  },
 });
 started=true;
}

export function syncPublicSessionReplay(path:string){
 if(!started)return;
 if(isPublicAnalyticsPath(path)){
  if(!posthog.sessionRecordingStarted())posthog.startSessionRecording({sampling:true,linked_flag:true,url_trigger:true,event_trigger:true});
 }else posthog.stopSessionRecording();
}

export function capturePublicPageview(path:string){
 if(!started||!isPublicAnalyticsPath(path))return;
 posthog.capture('$pageview',{$current_url:`${window.location.origin}${path}`});
}

export function capturePublicEvent(event:PublicEvent,properties:EventProperties={}){
 if(!started||!isPublicAnalyticsPath(window.location.pathname))return;
 posthog.capture(event,{...properties,$current_url:`${window.location.origin}${window.location.pathname}`},{send_instantly:true});
}

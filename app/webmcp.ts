"use client";
import {useEffect} from "react";
import {flushSync} from "react-dom";
type ModelContext={registerTool:(tool:{name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void>};
export function useDiscoveryTool(setQuery:(value:string)=>void,setCategory:(value:string)=>void,setCity:(value:string)=>void,setView:(value:string)=>void){
 useEffect(()=>{const context=(document as Document&{modelContext?:ModelContext}).modelContext;if(!context)return;const lifecycle=new AbortController();
 const register=()=>context.registerTool({name:"search_startup_preview",description:"Search fictional Startup SA preview listings and show the matching leaderboard. Clears category and city filters; does not submit data or vote.",inputSchema:{type:"object",properties:{query:{type:"string",maxLength:120}},required:["query"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=="object"||Array.isArray(input)||!("query" in input)||typeof input.query!=="string"||input.query.length>120||Object.keys(input).length!==1)throw new Error("Provide one query string of at most 120 characters.");flushSync(()=>{setQuery(input.query as string);setCategory("All startups");setCity("all");setView("ranked")});return {query:input.query,visibleProfiles:Array.from(document.querySelectorAll(".startup-title")).map(el=>el.textContent)}}},{signal:lifecycle.signal});
 try{Promise.resolve(register()).catch(()=>{})}catch{}return()=>lifecycle.abort();
 },[setQuery,setCategory,setCity,setView]);
}

import {authenticate,boundedBody,response} from '@/lib/startup-server';
import {z} from 'zod';
export async function GET(request:Request){
 try{const {client}=await authenticate(request);const {data,error}=await client.rpc('startup_admin_dashboard');if(error)return response({error:'Administrator access is required, or the dashboard is unavailable.'},403);return response(data)}catch{return response({error:'Please sign in with your administrator email.'},401)}
}
export async function POST(request:Request){
 try{const {client}=await authenticate(request);const input=z.object({submission_id:z.string().uuid(),restore:z.boolean()}).parse(JSON.parse(new TextDecoder().decode(await boundedBody(request,1024))));const {error}=await client.rpc('startup_admin_trash',input);if(error)return response({error:'Could not update this submission. Check your admin access and retry.'},400);return response({saved:true})}catch{return response({error:'Invalid request or expired session. Please sign in and retry.'},400)}
}

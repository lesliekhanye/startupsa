import {authenticate,deliverNotifications,response} from '@/lib/startup-server';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 let auth;try{auth=await authenticate(request)}catch{return response({error:'Please sign in again.'},401)}
 try{const {admin,client,user}=auth;const {data:moderator,error}=await client.rpc('is_startup_moderator');if(error)throw error;return response(await deliverNotifications(admin,moderator?undefined:user.id))}catch{return response({error:'Notification service unavailable.'},503)}
}

import {authenticate,response} from '@/lib/startup-server';

export async function GET(request:Request){
 let auth;
 try{auth=await authenticate(request)}catch{return response({error:'Please sign in again.'},401)}
 const {data:moderator,error:roleError}=await auth.client.rpc('is_startup_moderator');
 if(roleError||moderator!==true)return response({error:'Administrator access required.'},403);
 const page=Number(new URL(request.url).searchParams.get('page')??1);
 if(!Number.isSafeInteger(page)||page<1||page>100000)return response({error:'Invalid page.'},400);
 try{
  const {data,error}=await auth.admin.auth.admin.listUsers({page,perPage:25});
  if(error)return response({error:'Could not load accounts. Please retry.'},503);
  // Return only the fields needed by this private directory, never auth metadata.
  return response({accounts:data.users.map(user=>({id:user.id,email:user.email||null,verified:!!user.email_confirmed_at})),page,hasNext:page<data.lastPage});
 }catch{return response({error:'Could not load accounts. Please retry.'},503)}
}

import {env} from 'cloudflare:workers';

export const dynamic='force-dynamic';

export async function GET(){
 const key=env.POSTHOG_PROJECT_KEY;
 const host=env.POSTHOG_HOST||'https://us.i.posthog.com';
 const validKey=typeof key==='string'&&/^phc_[A-Za-z0-9]+$/.test(key);
 const validHost=host==='https://us.i.posthog.com'||host==='https://eu.i.posthog.com';
 return Response.json(validKey&&validHost?{key,host}:{configured:false},{headers:{'Cache-Control':'no-store'}});
}

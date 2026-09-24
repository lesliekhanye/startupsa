import {NextResponse,type NextRequest} from 'next/server';
import {env} from 'cloudflare:workers';
export function proxy(request:NextRequest){
 const url=new URL(request.url),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
 if(!local&&url.protocol!=='https:'){url.protocol='https:';return NextResponse.redirect(url,308)}
 if(/(?:^|\/)\.(?:env|git|dev\.vars|wrangler|sites-runtime|codex|agents)(?:[./]|$)/i.test(url.pathname))return new NextResponse(null,{status:404});
 if(url.pathname.startsWith('/api/')&&request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return NextResponse.json({error:'Please use this website.'},{status:403});
 const development=process.env.NODE_ENV!=='production';
 const nonce=btoa(crypto.randomUUID());
 let backend='';try{const u=new URL(env.SUPABASE_URL||'');if(u.protocol==='https:')backend=`${u.origin} wss://${u.host}`}catch{}
 const csp=["default-src 'self'",`script-src 'self' 'nonce-${nonce}'${local&&development?" 'unsafe-eval'":''}`,"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self'",`connect-src 'self' ${backend}${local&&development?' ws:':''}`,"object-src 'none'","base-uri 'none'","frame-ancestors 'none'","form-action 'self'",...(!local?['upgrade-insecure-requests']:[])].join('; ');
 const headers=new Headers(request.headers);headers.set('Content-Security-Policy',csp);headers.set('x-nonce',nonce);
 const response=NextResponse.next({request:{headers}});
 response.headers.set('Content-Security-Policy',csp);
 response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('X-Frame-Options','DENY');
 response.headers.set('Referrer-Policy','strict-origin-when-cross-origin');
 response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
 if(!local)response.headers.set('Strict-Transport-Security','max-age=31536000');
 if(url.pathname.startsWith('/api/')||/^\/(admin|account|submit)(\/|$)/.test(url.pathname))response.headers.set('Cache-Control','private, no-store');
 if(/^\/(admin|account|submit|api)(\/|$)/.test(url.pathname))response.headers.set('X-Robots-Tag','noindex, nofollow');
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|assets/).*)']};

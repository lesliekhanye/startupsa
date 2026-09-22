import {notFound} from 'next/navigation';
import {StartupPage} from '@/components/startup-page';
import {publicStartup} from '@/lib/public-startup';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const item=await publicStartup((await params).slug);return item?{title:`${item.name} | Startup SA`,description:item.pitch,alternates:{canonical:`/startups/${item.slug}`},openGraph:{title:`${item.name} | Startup SA`,description:item.pitch,images:['/social-preview.png']}}:{title:'Startup not found | Startup SA',robots:{index:false,follow:false}}}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const item=await publicStartup(slug);if(!item)notFound();return <StartupPage slug={slug} initialItem={item}/>}

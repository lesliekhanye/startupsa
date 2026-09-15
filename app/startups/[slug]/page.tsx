import {StartupPage} from '@/components/startup-page';
export default async function Page({params}:{params:Promise<{slug:string}>}){return <StartupPage slug={(await params).slug}/>}

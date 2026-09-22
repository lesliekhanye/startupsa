'use client';
import Link from '@/components/site-link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="legal-page error-page"><h1>Something went wrong.</h1><p>We couldn’t load this page. Please try again.</p><button className="primary" onClick={reset}>Try again</button> <Link className="secondary" href="/">Back to startups</Link></main>}

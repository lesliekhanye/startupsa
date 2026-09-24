import Link from '@/components/site-link';
import {ArrowRight,ArrowUpRight} from 'lucide-react';

export const metadata={
 title:'How it works | StartupsAfrica',
 description:'Learn how StartupsAfrica submissions, reviews, community votes and rankings work.',
 alternates:{canonical:'/how-it-works'},
};

export default function HowItWorks(){
 return <div className="shell how-page">
  <header><Link className="brand" href="/" aria-label="StartupsAfrica home"><img src="/startupsa-logo.png" alt=""/><span>StartupsAfrica</span></Link><nav aria-label="Main navigation"><Link href="/">Discover startups</Link></nav></header>
  <main>
   <div className="how-hero"><p className="eyebrow">HOW IT WORKS</p><h1>A fair shot for ideas across Africa.</h1><p>Discover emerging startups, support the ones you believe in, and give founders a place to be found.</p><Link className="primary" href="/submit">Put your startup on the map <ArrowUpRight size={17}/></Link></div>
   <div className="how-sections">
    <section><span className="how-number">01</span><div><h2>Find your next favourite startup</h2><p>Browse approved startups from across Africa. Search by name, idea, category or country, and open a listing to learn more about the founder and what they’re building.</p></div></section>
    <section><span className="how-number">02</span><div><h2>Support what you believe in</h2><p>You can vote for a startup without creating an account. A browser cookie remembers one vote per startup, and you can remove your vote at any time. We use rate limits to reduce spam.</p></div></section>
    <section><span className="how-number">03</span><div><h2>Understand the rankings</h2><p><strong>All time</strong> shows total support. <strong>Today</strong> shows votes in the current South African calendar day. Ties favour the more recently published startup, then its stable ID. A vote reflects community interest, not an endorsement or investment recommendation.</p></div></section>
    <section><span className="how-number">04</span><div><h2>Submit for review</h2><p>Tell us about your startup, where it’s based, and provide a working website. A moderator reviews submissions before they appear publicly. We look for a real project, an African connection and a clear, honest pitch. You’ll receive an email after review and can track or edit your submission in My account.</p></div></section>
    <section><span className="how-number">05</span><div><h2>Keep promotion separate</h2><p>Paid promotion is labelled separately. Advertising does not buy votes or change community rankings. We may remove spam, impersonation or misleading listings.</p></div></section>
   </div>
   <div className="how-bottom"><h2>Ready to explore?</h2><p>See what Africa is building next.</p><Link href="/">Discover startups <ArrowRight size={17}/></Link></div>
  </main>
 </div>;
}

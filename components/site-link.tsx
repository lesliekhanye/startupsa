import type {ComponentProps} from 'react';
/** Document navigation avoids Vinext's broken production RSC link runtime and
 * obtains a fresh per-response CSP nonce. Revisit when that runtime is fixed. */
export default function SiteLink(props:ComponentProps<'a'>){return <a {...props}/>}

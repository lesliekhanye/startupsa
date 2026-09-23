// Select the header supplied by the hosting platform, never by request headers.
export function clientIp(request: Request) {
  const header = process.env.DEPLOY_TARGET === 'vercel' || process.env.VERCEL === '1'
    ? 'x-vercel-forwarded-for' : 'cf-connecting-ip';
  return request.headers.get(header)?.split(',')[0].trim() || 'unknown';
}

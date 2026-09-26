export function isPublicAnalyticsPath(path:string){
 return path==='/'||path==='/how-it-works'||path==='/privacy'||path==='/terms'||/^\/startups\/[^/]+\/?$/.test(path);
}

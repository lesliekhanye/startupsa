declare namespace Cloudflare {
  interface Env {
    SITE_URL?: string;
    LEGAL_ENTITY_NAME?: string;
    PRIVACY_CONTACT_EMAIL?: string;
    PUBLIC_LAUNCH?: string;
    VERCEL_ANALYTICS_ENABLED?: string;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}

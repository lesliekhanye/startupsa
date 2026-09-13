declare namespace Cloudflare {
  interface Env {
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}

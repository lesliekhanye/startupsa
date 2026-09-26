declare namespace Cloudflare {
  interface Env {
    SITE_URL?: string;
    LEGAL_ENTITY_NAME?: string;
    PRIVACY_CONTACT_EMAIL?: string;
    SUPABASE_URL?: string;
    SUPABASE_PUBLISHABLE_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM_EMAIL?: string;
    POSTHOG_PROJECT_KEY?: string;
    POSTHOG_HOST?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}

declare namespace NodeJS {
  export interface ProcessEnv {
    // General settings
    LOG_DRIZZLE_QUERIES?: "true" | "false";
    ENVIRONMENT: "dev" | "staging" | "prod";
    NEXT_PUBLIC_SITE_URL: string;
    CONTACT_EMAIL: string;

    // Auth0 settings
    NEXT_PUBLIC_AUTH0_DOMAIN: string;
    NEXT_PUBLIC_AUTH0_CLIENT_ID: string;
    NEXT_PUBLIC_AUTH0_CONNECTION: string;
    AUTH0_CLIENT_SECRET: string;
    AUTH0_ORIGINAL_DOMAIN: string;
    AUTH0_SCOPE: string;

    // Search
    NEXT_PUBLIC_SEARCH_INDEX_PREFIX?: string;
    ELASTIC_CLOUD_ID: string;
    ELASTIC_USERNAME: string;
    ELASTIC_PASSWORD: string;
    ELASTIC_ORIGIN_DATE: string;

    // Databases
    DATABASE_URL: string;

    // CkEditor
    CK_ENVIRONMENT_ID: string;
    CK_API_PREFIX: string;
    CK_SECRET_KEY: string;
    CK_API_SECRET_KEY: string;
    NEXT_PUBLIC_CK_WEBSOCKET_URL: string;
    NEXT_PUBLIC_CK_UPLOAD_URL: string;

    // Cloudinary
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;

    // Mailchimp
    MAILCHIMP_API_KEY?: string;
    MAILCHIMP_DIGEST_LIST_ID?: string;

    // Other services
    NEXT_PUBLIC_IPAPI_KEY?: string;
    NEXT_PUBLIC_INTERCOM_APP_ID: string;
    AKISMET_API_KEY: string;
    NEXT_PUBLIC_RECAPTCHA_KEY: string;
    RECAPTCHA_PRIVATE_KEY: string;
    SENTRY_DSN: string;

    // Site access protection (optional)
    SITE_ACCESS_PASSWORD?: string;

    // Site config
    START_HERE_POST_ID: string;
    INTRO_POST_ID: string;
    CONTACT_POST_ID: string;
    COMMUNITY_TAG_ID: string;
    OPPORTUNITIES_TAG_ID: string;
    TRANSLATION_TAG_ID: string;
    APRIL_FOOLS_TAG_ID: string;
    NEXT_PUBLIC_OPEN_THREAD_TAG_ID: string;
    NEXT_PUBLIC_AMA_TAG_ID: string;
  }
}

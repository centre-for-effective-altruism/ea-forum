declare namespace NodeJS {
  export interface ProcessEnv {
    // General settings
    NEXT_PUBLIC_SITE_URL: string;
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: string;
    ENVIRONMENT: "dev" | "staging" | "prod";

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

    // Site config
    LOG_DRIZZLE_QUERIES?: "true";
    COMMUNITY_TAG_ID: string;
    OPPORTUNITIES_TAG_ID: string;
  }
}

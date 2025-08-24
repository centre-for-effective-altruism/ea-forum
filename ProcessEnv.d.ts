declare namespace NodeJS {
  export interface ProcessEnv {
    // General settings
    NEXT_PUBLIC_SITE_URL: string;
    DATABASE_URL: string;
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: string;
    NEXT_PUBLIC_SEARCH_INDEX_PREFIX?: string;

    // Auth0 settings
    NEXT_PUBLIC_AUTH0_DOMAIN: string;
    NEXT_PUBLIC_AUTH0_CLIENT_ID: string;
    NEXT_PUBLIC_AUTH0_CONNECTION: string;
    AUTH_CLIENT_ID: string; // Note: this is different from the _public_ client id
    AUTH0_CLIENT_SECRET: string;
    AUTH0_ORIGINAL_DOMAIN: string;
    AUTH0_SCOPE: string;

    // Elasticsearch settings
    ELASTIC_CLOUD_ID: string;
    ELASTIC_USERNAME: string;
    ELASTIC_PASSWORD: string;
    ELASTIC_ORIGIN_DATE: string;
  }
}

declare namespace NodeJS {
  export interface ProcessEnv {
    // General settings
    NEXT_PUBLIC_SITE_URL: string;
    DATABASE_URL: string;

    // Auth0 settings
    NEXT_PUBLIC_AUTH0_DOMAIN: string;
    NEXT_PUBLIC_AUTH0_CLIENT_ID: string;
    NEXT_PUBLIC_AUTH0_CONNECTION: string;
  }
}

import type { JsonRecord } from "tradukisto";
import { combineUrls } from "../routeHelpers";

class Auth0ClientError extends Error {
  constructor(
    message?: string | null,
    public policy?: string | null,
  ) {
    super(message || "Something went wrong");
  }
}

class Auth0Client {
  private async post(endpoint: string, body: JsonRecord): Promise<void> {
    const result = await fetch(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (result.status !== 200) {
      const data = await result.json();
      let message =
        data.error ||
        data.description ||
        data.error_description ||
        "Something went wrong";
      // Remove the ugly full-stop that auth0 appends to its error messages
      if (message[message.length - 1] === ".") {
        message = message.slice(0, -1);
      }
      throw new Auth0ClientError(message, data.policy);
    }
  }

  async login(email: string, password: string): Promise<void> {
    await this.post("/api/auth/login", { email, password });
  }

  async signup(email: string, password: string): Promise<void> {
    await this.post("/api/auth/signup", { email, password });
  }

  googleLogin(): void {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = `/api/auth?returnTo=${returnTo}&connection=google-oauth2`;
  }

  private getClientSettings() {
    const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
    const connection = process.env.NEXT_PUBLIC_AUTH0_CONNECTION;
    if (!domain) {
      throw new Error("Missing auth0 domain");
    }
    if (!clientId) {
      throw new Error("Missing auth0 client id");
    }
    if (!connection) {
      throw new Error("Missing auth0 connection");
    }
    return { domain, clientId, connection };
  }

  async resetPassword(email: string): Promise<void> {
    if (!email) {
      throw new Auth0ClientError(
        "Enter your email above to receive password reset instructions",
      );
    }

    const settings = this.getClientSettings();
    const url = combineUrls(
      `https://${settings.domain}`,
      "/dbconnections/change_password",
    );
    await this.post(url, {
      client_id: settings.clientId,
      connection: settings.connection,
      email,
    });
  }
}

let client: Auth0Client;

/**
 * This client allows us to authenticate a user with auth0 directly on the
 * forum without redirecting to a separate domain. For this to work, you must
 * setup cross-origin authentication:
 *   https://auth0.com/docs/get-started/applications/set-up-cors
 */
export const useAuth0Client = () => {
  if (!client) {
    client = new Auth0Client();
  }
  return client;
};

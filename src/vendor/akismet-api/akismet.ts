// Adapted from from https://github.com/chrisfosterelli/akismet-api/tree/main

type Alias = [string, ...string[]];

// Index 0 is the API key, indices >= 1 are aliases
const clientAliases: Alias[] = [
  ["blog"],
  ["blog_lang", "lang"],
  ["blog_charset", "charset"],
];

const commentAliases: Alias[] = [
  ["user_ip", "ip"],
  ["user_agent", "useragent"],
  ["referrer", "referer"],
  ["comment_author", "name"],
  ["comment_author_email", "email"],
  ["comment_content", "content"],
  ["is_test", "isTest"],
  ["comment_type", "type"],
  ["comment_date_gmt", "date"],
  ["permalink"],
  ["comment_post_modified_gmt", "permalinkDate"],
  ["comment_author_url", "url"],
  ["user_role", "role"],
];

const mapAliases = <
  T extends Record<string, unknown>,
  A extends Alias[] = typeof commentAliases,
>(
  input: T,
  aliases: A = commentAliases as unknown as A,
): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  for (const alias of aliases) {
    for (const key of alias) {
      if (input[key] !== undefined) {
        output[alias[0]] = input[key];
      }
    }
  }
  return output;
};

const getHoneypotFields = (input: Record<string, string>) => {
  const honeypotKey = "honeypot_field_name";
  const honeypotFieldName = "akismet_api_honeypot_field";
  if (input[honeypotKey]) {
    return {
      [honeypotKey]: input[honeypotKey],
      [input[honeypotKey]]: input[input[honeypotKey]],
    };
  } else if (input.honeypot) {
    return {
      [honeypotKey]: honeypotFieldName,
      [honeypotFieldName]: input.honeypot,
    };
  } else {
    return {};
  }
};

export class AkismetClient {
  private requestOpts: Record<string, unknown>;
  private host: string;
  private protocol: string;
  private version: string;
  private blog: string;
  private key: string;
  private userAgent: string;
  private rootEndpoint: string;
  private endpoint: string;

  // Configure our client based on provided options
  constructor(options: Record<string, string> = {}) {
    this.requestOpts = mapAliases(options, clientAliases);
    this.host = options.host || "rest.akismet.com";
    this.protocol = options.protocol || "https";
    this.version = options.version || "1.1";
    this.blog = options.blog;
    this.key = options.key;

    this.userAgent =
      options.userAgent || `Node.js/${process.version} | Akismet-api/6.0.0`;
    this.rootEndpoint = `${this.protocol}://${this.host}/${this.version}/`;
    this.endpoint = `${this.protocol}://${this.key}.${this.host}/${this.version}/`;
  }

  /**
   * Verify that the provided key is accepted by Akismet.
   */
  async verifyKey(): Promise<boolean> {
    const url = `${this.rootEndpoint}verify-key`;
    const params = new URLSearchParams();
    params.append("key", this.key);
    params.append("blog", this.blog);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.userAgent,
      },
      body: params.toString(),
    });
    const text = await res.text();
    if (text === "valid") {
      return true;
    }
    if (text === "invalid") {
      return false;
    }
    throw new Error(`Akismet verify-key response: ${text}`);
  }

  /**
   * Check if the given data is spam.
   * Returns a Promise<boolean>.
   */
  async checkSpam(comment: Record<string, any> = {}): Promise<boolean> {
    const url = `${this.endpoint}comment-check`;
    const payload = {
      ...mapAliases(comment),
      ...getHoneypotFields(comment),
      ...this.requestOpts,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.userAgent,
      },
      body: params.toString(),
    });
    const text = await res.text();
    const debugHelp = res.headers.get("x-akismet-debug-help");
    if (text === "true") {
      return true;
    }
    if (text === "false") {
      return false;
    }
    if (text === "invalid") {
      throw new Error("Invalid API key");
    }
    if (debugHelp) {
      throw new Error(debugHelp);
    }
    throw new Error(`Akismet comment-check response: ${text}`);
  }

  /**
   * Submit a false-negative spam report to Akismet.
   * Returns a Promise<void>.
   */
  async submitSpam(comment: Record<string, any> = {}): Promise<void> {
    const url = `${this.endpoint}submit-spam`;
    const payload = {
      ...mapAliases(comment),
      ...getHoneypotFields(comment),
      ...this.requestOpts,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.userAgent,
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      const debugHelp = res.headers.get("x-akismet-debug-help");
      throw new Error(
        debugHelp || text || `Akismet submit-spam failed with status ${res.status}`,
      );
    }
  }

  /**
   * Submit a false-positive spam report (ham) to Akismet.
   * Returns a Promise<void>.
   */
  async submitHam(comment: Record<string, any> = {}): Promise<void> {
    const url = `${this.endpoint}submit-ham`;
    const payload = {
      ...mapAliases(comment),
      ...getHoneypotFields(comment),
      ...this.requestOpts,
    };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    }
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.userAgent,
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      const debugHelp = res.headers.get("x-akismet-debug-help");
      throw new Error(
        debugHelp || text || `Akismet submit-ham failed with status ${res.status}`,
      );
    }
  }
}

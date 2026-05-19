import { IntercomClient } from "intercom-client";

let intercomClient: IntercomClient | null = null;

export const getIntercomClient = () => {
  const intercomToken = process.env.INTERCOM_TOKEN;
  if (!intercomClient && intercomToken) {
    intercomClient = new IntercomClient({
      token: intercomToken,
    });
  }
  return intercomClient;
};

import { createSafeActionClient } from "next-safe-action";

export const actionClient = createSafeActionClient({
  throwValidationErrors: true,
  // This is run on the client whenever an action throws on the server
  handleServerError: (error) => {
    throw error;
  },
});

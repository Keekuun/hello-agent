import { createAuthClient } from "better-auth/react";

function getAuthBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100";
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
});

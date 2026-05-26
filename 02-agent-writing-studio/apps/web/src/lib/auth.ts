import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { requireDb } from "@/db";
import * as schema from "@/db/schema";

const appUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3100";

export const auth = betterAuth({
  baseURL: appUrl,
  trustedOrigins: [
    appUrl,
    "http://localhost:3100",
    "http://localhost:3000",
  ],
  database: drizzleAdapter(requireDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});

export type Session = typeof auth.$Infer.Session;

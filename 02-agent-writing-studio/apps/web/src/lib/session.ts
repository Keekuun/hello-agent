import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session.user.id;
}

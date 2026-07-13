import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/session";

// Yerel sürüm: token doğrulaması yoktur; her istek yerel kullanıcıya bağlanır.
export async function getCurrentUser(_req: NextRequest) {
  return requireApiUser();
}

export type ApiUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

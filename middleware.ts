import { NextResponse } from "next/server";

// Yerel sürüm: kimlik doğrulama ve bakım modu yönlendirmeleri kaldırıldı.
// Tüm istekler doğrudan geçer.
export default async function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};

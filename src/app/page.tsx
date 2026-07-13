import { redirect } from "next/navigation";

// Yerel sürüm: tanıtım sayfası yerine doğrudan panele yönlendirilir.
export default function HomePage() {
  redirect("/panel");
}

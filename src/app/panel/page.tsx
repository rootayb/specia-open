import { redirect } from "next/navigation";

// Yerel sürüm: genel bakış yerine doğrudan BEP kitaplığına yönlendirilir.
export default function PanelHomePage() {
  redirect("/panel/bep");
}

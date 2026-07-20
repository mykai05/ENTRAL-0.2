import { redirect } from "next/navigation";

export default async function MemberPage() {
  redirect("/member/dashboard");
}

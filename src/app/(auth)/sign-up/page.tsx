import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Create your account",
};

export default async function SignUpPage() {
  const user = await getUser();
  if (user) redirect("/");

  return <SignUpForm />;
}

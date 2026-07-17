import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Sign in",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (user) redirect("/");

  const params = await searchParams;
  const next = firstValue(params.next);

  return (
    <SignInForm
      next={next && next.startsWith("/") && !next.startsWith("//") ? next : undefined}
      initialError={firstValue(params.error)}
    />
  );
}

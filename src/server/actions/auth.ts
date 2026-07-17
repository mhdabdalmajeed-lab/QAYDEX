"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

/**
 * Server Functions are reachable by direct POST, so nothing here trusts the page
 * that rendered the form: every input is re-validated and Supabase itself is the
 * only thing that decides whether a credential is good.
 *
 * `redirect()` signals success by throwing a control-flow error, so it is always
 * called *outside* any try/catch.
 */

export type AuthFieldErrors = {
  email?: string;
  password?: string;
};

export type AuthFormState = {
  /** Form-level failure, e.g. rejected credentials. */
  error?: string;
  fieldErrors?: AuthFieldErrors;
  /** Echoed back so the field is not cleared when the form re-renders. */
  email?: string;
};

const emailField = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .pipe(z.email("Enter a valid email address."));

const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password."),
});

const signUpSchema = z.object({
  email: emailField,
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Passwords cannot be longer than 72 characters."),
});

function readCredentials(formData: FormData): { email: string; password: string } {
  const email = formData.get("email");
  const password = formData.get("password");
  return {
    email: typeof email === "string" ? email : "",
    password: typeof password === "string" ? password : "",
  };
}

function toFieldErrors(issues: readonly z.core.$ZodIssue[]): AuthFieldErrors {
  const fieldErrors: AuthFieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key === "email" && !fieldErrors.email) fieldErrors.email = issue.message;
    if (key === "password" && !fieldErrors.password) fieldErrors.password = issue.message;
  }
  return fieldErrors;
}

/** Only forward `next` when it is a path on this site — never an absolute URL. */
function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = readCredentials(formData);
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { email: raw.email, fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const nextRaw = formData.get("next");
  const next = safeNextPath(typeof nextRaw === "string" ? nextRaw : null);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Deliberately vague: distinguishing "no such account" from "wrong password"
    // hands an attacker a user-enumeration oracle.
    return {
      email: raw.email,
      error: "That email and password do not match an account.",
    };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const raw = readCredentials(formData);
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { email: raw.email, fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { email: raw.email, error: error.message };
  }

  // This project has email confirmation switched off, so sign-up returns a live
  // session. If that ever changes, `session` is null and there is nobody to send on.
  if (!data.session) {
    return {
      email: raw.email,
      error: "Your account was created but could not be signed in. Please sign in below.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect("/sign-in");
}

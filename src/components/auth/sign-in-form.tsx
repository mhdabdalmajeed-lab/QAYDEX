"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { RiErrorWarningLine } from "@remixicon/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signIn, type AuthFormState } from "@/server/actions/auth";

export function SignInForm({
  next,
  initialError,
}: {
  next?: string;
  /** Surfaced by /auth/callback when the code exchange fails. */
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signIn, {});
  const emailId = useId();
  const passwordId = useId();

  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;
  const formError = state.error ?? initialError;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Continue to your audit workspace.</CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} noValidate>
          <FieldGroup>
            {formError ? (
              <Alert variant="destructive">
                <RiErrorWarningLine aria-hidden="true" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            {next ? <input type="hidden" name="next" value={next} /> : null}

            <Field data-invalid={emailError ? true : undefined}>
              <FieldLabel htmlFor={emailId}>Email</FieldLabel>
              <Input
                id={emailId}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={pending}
                defaultValue={state.email}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? `${emailId}-error` : undefined}
              />
              <FieldError id={`${emailId}-error`}>{emailError}</FieldError>
            </Field>

            <Field data-invalid={passwordError ? true : undefined}>
              <FieldLabel htmlFor={passwordId}>Password</FieldLabel>
              <Input
                id={passwordId}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                disabled={pending}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={passwordError ? `${passwordId}-error` : undefined}
              />
              <FieldError id={`${passwordId}-error`}>{passwordError}</FieldError>
            </Field>

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account yet?{" "}
              <Link
                href="/sign-up"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Create one
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

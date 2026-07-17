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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { signUp, type AuthFormState } from "@/server/actions/auth";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(signUp, {});
  const emailId = useId();
  const passwordId = useId();

  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          You will set up your first workspace on the next step.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} noValidate>
          <FieldGroup>
            {state.error ? (
              <Alert variant="destructive">
                <RiErrorWarningLine aria-hidden="true" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <Field data-invalid={emailError ? true : undefined}>
              <FieldLabel htmlFor={emailId}>Work email</FieldLabel>
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
                autoComplete="new-password"
                required
                minLength={8}
                disabled={pending}
                aria-invalid={passwordError ? true : undefined}
                aria-describedby={
                  passwordError ? `${passwordId}-error` : `${passwordId}-hint`
                }
              />
              {passwordError ? (
                <FieldError id={`${passwordId}-error`}>{passwordError}</FieldError>
              ) : (
                <FieldDescription id={`${passwordId}-hint`}>
                  At least 8 characters.
                </FieldDescription>
              )}
            </Field>

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Sign in
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

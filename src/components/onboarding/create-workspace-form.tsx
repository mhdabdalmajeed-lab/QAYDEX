"use client";

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import {
  ACCOUNTING_STANDARDS,
  BASE_CURRENCIES,
  INDUSTRIES,
  MONTHS,
  WORKSPACE_TYPES,
  standardFieldName,
} from "@/lib/workspace-options";
import { createWorkspace, type WorkspaceFormState } from "@/server/actions/workspace";

export function CreateWorkspaceForm() {
  const [state, formAction, pending] = useActionState<WorkspaceFormState, FormData>(
    createWorkspace,
    {},
  );

  const nameId = useId();
  const typeId = useId();
  const industryId = useId();
  const currencyId = useId();
  const monthId = useId();
  const standardsId = useId();

  const errors = state.fieldErrors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your workspace</CardTitle>
        <CardDescription>
          These settings shape how every audit in the workspace reads its numbers. You can
          change them later in Settings.
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

            <Field data-invalid={errors?.name ? true : undefined}>
              <FieldLabel htmlFor={nameId}>Workspace name</FieldLabel>
              <Input
                id={nameId}
                name="name"
                autoComplete="organization"
                required
                disabled={pending}
                placeholder="Northwind Group"
                aria-invalid={errors?.name ? true : undefined}
                aria-describedby={errors?.name ? `${nameId}-error` : undefined}
              />
              <FieldError id={`${nameId}-error`}>{errors?.name}</FieldError>
            </Field>

            <FieldSet data-invalid={errors?.type ? true : undefined}>
              <FieldLegend variant="label">Workspace type</FieldLegend>
              <FieldDescription>
                This decides whether audits are organised by entity or by client.
              </FieldDescription>
              <RadioGroup
                id={typeId}
                name="type"
                defaultValue="internal"
                disabled={pending}
                required
                aria-describedby={errors?.type ? `${typeId}-error` : undefined}
              >
                {WORKSPACE_TYPES.map((option) => (
                  <FieldLabel key={option.value} htmlFor={`${typeId}-${option.value}`}>
                    <Field orientation="horizontal">
                      <RadioGroupItem
                        id={`${typeId}-${option.value}`}
                        value={option.value}
                        aria-invalid={errors?.type ? true : undefined}
                      />
                      <div className="flex flex-col gap-0.5">
                        <FieldTitle>{option.label}</FieldTitle>
                        <FieldDescription>{option.description}</FieldDescription>
                      </div>
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
              <FieldError id={`${typeId}-error`}>{errors?.type}</FieldError>
            </FieldSet>

            <Field data-invalid={errors?.industry ? true : undefined}>
              <FieldLabel htmlFor={industryId}>Industry</FieldLabel>
              <Input
                id={industryId}
                name="industry"
                list={`${industryId}-options`}
                autoComplete="off"
                disabled={pending}
                placeholder="Manufacturing"
                aria-invalid={errors?.industry ? true : undefined}
                aria-describedby={
                  errors?.industry ? `${industryId}-error` : `${industryId}-hint`
                }
              />
              <datalist id={`${industryId}-options`}>
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry} />
                ))}
              </datalist>
              {errors?.industry ? (
                <FieldError id={`${industryId}-error`}>{errors.industry}</FieldError>
              ) : (
                <FieldDescription id={`${industryId}-hint`}>
                  Optional. Used to pick sensible benchmarks and templates.
                </FieldDescription>
              )}
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={errors?.baseCurrency ? true : undefined}>
                <FieldLabel htmlFor={currencyId}>Base currency</FieldLabel>
                <NativeSelect
                  className="w-full"
                  id={currencyId}
                  name="baseCurrency"
                  defaultValue="USD"
                  disabled={pending}
                  required
                  aria-invalid={errors?.baseCurrency ? true : undefined}
                  aria-describedby={errors?.baseCurrency ? `${currencyId}-error` : undefined}
                >
                  {BASE_CURRENCIES.map((code) => (
                    <NativeSelectOption key={code} value={code}>
                      {code}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError id={`${currencyId}-error`}>{errors?.baseCurrency}</FieldError>
              </Field>

              <Field data-invalid={errors?.fiscalYearStartMonth ? true : undefined}>
                <FieldLabel htmlFor={monthId}>Fiscal year starts</FieldLabel>
                <NativeSelect
                  className="w-full"
                  id={monthId}
                  name="fiscalYearStartMonth"
                  defaultValue="1"
                  disabled={pending}
                  required
                  aria-invalid={errors?.fiscalYearStartMonth ? true : undefined}
                  aria-describedby={
                    errors?.fiscalYearStartMonth ? `${monthId}-error` : undefined
                  }
                >
                  {MONTHS.map((month) => (
                    <NativeSelectOption key={month.value} value={String(month.value)}>
                      {month.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError id={`${monthId}-error`}>
                  {errors?.fiscalYearStartMonth}
                </FieldError>
              </Field>
            </div>

            <FieldSet>
              <FieldLegend variant="label">Accounting standards</FieldLegend>
              <FieldDescription id={`${standardsId}-hint`}>
                Optional. Audits cite the standards you select here when they judge a
                treatment.
              </FieldDescription>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ACCOUNTING_STANDARDS.map((standard) => (
                  <FieldLabel
                    key={standard.value}
                    htmlFor={`${standardsId}-${standard.value}`}
                    className="flex-row items-center gap-2"
                  >
                    <Checkbox
                      id={`${standardsId}-${standard.value}`}
                      name={standardFieldName(standard.value)}
                      disabled={pending}
                    />
                    <FieldTitle>{standard.label}</FieldTitle>
                  </FieldLabel>
                ))}
              </div>
            </FieldSet>

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Creating workspace…" : "Create workspace"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

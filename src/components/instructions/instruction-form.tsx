"use client";

import { useActionState, useId, useState } from "react";
import { RiErrorWarningLine, RiGitCommitLine, RiInformationLine } from "@remixicon/react";

import {
  CATEGORY_BLURBS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  INSTRUCTION_MODULES,
  MODULE_LABELS,
  STATUS_BLURBS,
  STATUS_LABELS,
  STATUS_ORDER,
  USER_VISIBILITIES,
  VISIBILITY_LABELS,
  type InstructionCategory,
  type InstructionStatus,
} from "@/components/instructions/labels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createInstruction,
  updateInstruction,
  type InstructionFormState,
} from "@/server/actions/instruction";

export type InstructionFormValues = {
  name: string;
  description: string;
  text: string;
  category: InstructionCategory;
  visibility: "workspace" | "private" | "client";
  priority: number;
  mandatory: boolean;
  status: InstructionStatus;
  clientId: string | null;
  applicableModules: string[];
  applicableEntityIds: string[];
  applicableTemplateIds: string[];
  effectiveDate: string;
  expirationDate: string;
};

export type InstructionFormProps = {
  workspaceSlug: string;
  /** Absent when writing a new instruction. */
  instructionId?: string;
  values: InstructionFormValues;
  entities: { id: string; legalName: string }[];
  clients: { id: string; name: string }[];
  templates: { id: string; name: string }[];
  tags: string[];
  /** The version an existing instruction is on. Editing the text will cut the next one. */
  currentVersion?: number;
  /** How many audits are already frozen against the current text (PRD §9.4). */
  auditsOnCurrentVersion?: number;
  ownerLabel: string;
};

/**
 * Write or edit one instruction (PRD §9.2).
 *
 * The form's job beyond collecting fields is to make §9.4 legible *before* the user
 * commits: the moment the text differs from what is stored, it says which version will be
 * created and states plainly that audits already run are untouched. The server enforces
 * that regardless — this only stops it being a surprise.
 */
export function InstructionForm({
  workspaceSlug,
  instructionId,
  values,
  entities,
  clients,
  templates,
  tags,
  currentVersion,
  auditsOnCurrentVersion = 0,
  ownerLabel,
}: InstructionFormProps) {
  const isEdit = instructionId !== undefined;
  const [state, formAction, pending] = useActionState<InstructionFormState, FormData>(
    isEdit ? updateInstruction : createInstruction,
    {},
  );

  const [text, setText] = useState(values.text);
  const [category, setCategory] = useState<InstructionCategory>(values.category);
  const [mandatory, setMandatory] = useState(values.mandatory);
  const [visibility, setVisibility] = useState(values.visibility);
  const [saved, setSaved] = useState(false);

  const nameId = useId();
  const descriptionId = useId();
  const textId = useId();
  const categoryId = useId();
  const visibilityId = useId();
  const priorityId = useId();
  const statusId = useId();
  const clientId = useId();
  const effectiveId = useId();
  const expirationId = useId();
  const tagsId = useId();
  const changelogId = useId();
  const mandatoryId = useId();

  const textChanged = isEdit && text.trim() !== values.text.trim();
  const nextVersion = currentVersion !== undefined ? currentVersion + 1 : 1;
  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={(formData) => {
        setSaved(false);
        formAction(formData);
      }}
      onChange={() => setSaved(false)}
      className="flex flex-col gap-6"
      noValidate
    >
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      {instructionId ? <input type="hidden" name="instructionId" value={instructionId} /> : null}

      {state.error ? (
        <Alert variant="destructive">
          <RiErrorWarningLine aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {saved && !state.error && !state.fieldErrors ? (
        <Alert>
          <RiInformationLine aria-hidden="true" />
          <AlertDescription>Saved.</AlertDescription>
        </Alert>
      ) : null}

      <FieldSet>
        <FieldLegend variant="label">What the instruction is</FieldLegend>

        <FieldGroup>
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor={nameId}>Name</FieldLabel>
            <Input
              id={nameId}
              name="name"
              defaultValue={values.name}
              disabled={pending}
              aria-invalid={errors.name ? true : undefined}
              placeholder="Materiality threshold — Company A"
            />
            <FieldDescription>How it appears in the library and in an audit.</FieldDescription>
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>

          <Field data-invalid={errors.description ? true : undefined}>
            <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
            <Textarea
              id={descriptionId}
              name="description"
              rows={2}
              defaultValue={values.description}
              disabled={pending}
              aria-invalid={errors.description ? true : undefined}
              placeholder="Why this exists, for whoever reads the library next."
            />
            <FieldDescription>
              For people, not the model. It is never sent with the audit.
            </FieldDescription>
            {errors.description ? <FieldError>{errors.description}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Instruction text</FieldLegend>
        <FieldDescription>
          The words the model is given, verbatim. Write it as a rule to follow, not a
          description of one.
        </FieldDescription>

        <FieldGroup>
          <Field data-invalid={errors.text ? true : undefined}>
            <FieldLabel htmlFor={textId} className="sr-only">
              Instruction text
            </FieldLabel>
            <Textarea
              id={textId}
              name="text"
              rows={10}
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={pending}
              aria-invalid={errors.text ? true : undefined}
              aria-describedby={textChanged ? `${textId}-version` : undefined}
              className="font-mono text-xs leading-relaxed"
              placeholder="Treat any single journal entry above 50,000 USD as material and report it individually, with its posting date, preparer and approver."
            />
            {errors.text ? <FieldError>{errors.text}</FieldError> : null}
            <FieldDescription aria-live="polite">
              {text.trim().length} characters
              {isEdit && !textChanged && currentVersion !== undefined
                ? ` · unchanged from v${currentVersion}`
                : ""}
            </FieldDescription>
          </Field>

          {textChanged ? (
            <Alert id={`${textId}-version`}>
              <RiGitCommitLine aria-hidden="true" />
              <AlertTitle>Saving this creates version {nextVersion}.</AlertTitle>
              <AlertDescription>
                <p>
                  {auditsOnCurrentVersion > 0
                    ? `${auditsOnCurrentVersion} audit${auditsOnCurrentVersion === 1 ? "" : "s"} already ran under v${currentVersion}. ${auditsOnCurrentVersion === 1 ? "It stays" : "They stay"} pinned to v${currentVersion} and ${auditsOnCurrentVersion === 1 ? "its findings do" : "their findings do"} not change.`
                    : `Any audit that has already run stays pinned to the version it ran under. Nothing already generated changes.`}{" "}
                  Version {nextVersion} applies to audits from now on. Old text is kept, not
                  overwritten.
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          {isEdit ? (
            <Field>
              <FieldLabel htmlFor={changelogId}>What changed</FieldLabel>
              <Input
                id={changelogId}
                name="changelog"
                disabled={pending || !textChanged}
                placeholder="Raised the threshold to 50,000 after the Q1 review."
              />
              <FieldDescription>
                {textChanged
                  ? `Recorded against v${nextVersion} in the history below.`
                  : "Recorded only when the text changes."}
              </FieldDescription>
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Authority</FieldLegend>

        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={errors.category ? true : undefined}>
              <FieldLabel htmlFor={categoryId}>Category</FieldLabel>
              <NativeSelect
                id={categoryId}
                name="category"
                className="w-full"
                value={category}
                disabled={pending}
                aria-invalid={errors.category ? true : undefined}
                onChange={(event) => setCategory(event.target.value as InstructionCategory)}
              >
                {CATEGORY_ORDER.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {CATEGORY_LABELS[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>{CATEGORY_BLURBS[category]}</FieldDescription>
              {errors.category ? <FieldError>{errors.category}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.priority ? true : undefined}>
              <FieldLabel htmlFor={priorityId}>Priority</FieldLabel>
              <Input
                id={priorityId}
                name="priority"
                type="number"
                min={1}
                max={1000}
                step={1}
                inputMode="numeric"
                defaultValue={values.priority}
                disabled={pending}
                aria-invalid={errors.priority ? true : undefined}
                className="max-w-32 tabular-nums"
              />
              <FieldDescription>
                Lower wins. It only settles ties <em>within</em> a rank — it cannot lift an
                instruction above one that outranks it.
              </FieldDescription>
              {errors.priority ? <FieldError>{errors.priority}</FieldError> : null}
            </Field>
          </div>

          <Field orientation="horizontal">
            <Switch
              id={mandatoryId}
              name="mandatory"
              checked={mandatory}
              disabled={pending}
              onCheckedChange={(checked) => setMandatory(checked)}
            />
            <FieldLabel htmlFor={mandatoryId} className="font-normal">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Mandatory</span>
                <span className="text-xs text-muted-foreground">
                  {mandatory
                    ? "Applied to every audit in its scope, whether or not the user selects it, and it cannot be removed from that audit."
                    : "Reaches an audit only when someone attaches it."}
                </span>
              </span>
            </FieldLabel>
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={errors.visibility ? true : undefined}>
              <FieldLabel htmlFor={visibilityId}>Visibility</FieldLabel>
              <NativeSelect
                id={visibilityId}
                name="visibility"
                className="w-full"
                value={visibility}
                disabled={pending}
                aria-invalid={errors.visibility ? true : undefined}
                onChange={(event) =>
                  setVisibility(event.target.value as InstructionFormValues["visibility"])
                }
              >
                {USER_VISIBILITIES.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {VISIBILITY_LABELS[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errors.visibility ? <FieldError>{errors.visibility}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.status ? true : undefined}>
              <FieldLabel htmlFor={statusId}>Status</FieldLabel>
              <NativeSelect
                id={statusId}
                name="status"
                className="w-full"
                defaultValue={values.status}
                disabled={pending}
                aria-invalid={errors.status ? true : undefined}
              >
                {STATUS_ORDER.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {STATUS_LABELS[value]} — {STATUS_BLURBS[value]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errors.status ? <FieldError>{errors.status}</FieldError> : null}
            </Field>
          </div>

          <Field>
            <FieldLabel>Owner</FieldLabel>
            <p className="text-sm">{ownerLabel}</p>
            <FieldDescription>
              Set when the instruction is created. Anyone who can manage instructions can edit
              it.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">Where it applies</FieldLegend>
        <FieldDescription>
          Leave a list empty to mean “no restriction on this axis”.
        </FieldDescription>

        <FieldGroup>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Modules</legend>
            <p className="text-xs text-muted-foreground">
              Which audit library an audit must belong to for this to be offered.
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-0.5">
              {INSTRUCTION_MODULES.map((module) => {
                const id = `module-${module}`;
                return (
                  <li key={module} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      name="applicableModules"
                      value={module}
                      defaultChecked={values.applicableModules.includes(module)}
                      disabled={pending}
                    />
                    <Label htmlFor={id} className="font-normal">
                      {MODULE_LABELS[module]}
                    </Label>
                  </li>
                );
              })}
            </ul>
          </fieldset>

          {clients.length > 0 ? (
            <Field data-invalid={errors.clientId ? true : undefined}>
              <FieldLabel htmlFor={clientId}>Client</FieldLabel>
              <NativeSelect
                id={clientId}
                name="clientId"
                className="w-full max-w-sm"
                defaultValue={values.clientId ?? ""}
                disabled={pending}
                aria-invalid={errors.clientId ? true : undefined}
              >
                <NativeSelectOption value="">Not client-specific</NativeSelectOption>
                {clients.map((client) => (
                  <NativeSelectOption key={client.id} value={client.id}>
                    {client.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                A mandatory Client instruction outranks a template but is outranked by an
                Organization one.
              </FieldDescription>
              {errors.clientId ? <FieldError>{errors.clientId}</FieldError> : null}
            </Field>
          ) : null}

          {entities.length > 0 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Entities</legend>
              <p className="text-xs text-muted-foreground">
                Only applies to audits scoped to one of these entities.
              </p>
              <ul className="grid gap-2 pt-0.5 sm:grid-cols-2">
                {entities.map((entity) => {
                  const id = `entity-${entity.id}`;
                  return (
                    <li key={entity.id} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        name="applicableEntityIds"
                        value={entity.id}
                        defaultChecked={values.applicableEntityIds.includes(entity.id)}
                        disabled={pending}
                      />
                      <Label htmlFor={id} className="font-normal">
                        {entity.legalName}
                      </Label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : null}

          {templates.length > 0 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Audit templates</legend>
              <p className="text-xs text-muted-foreground">
                Only applies to audits started from one of these templates.
              </p>
              <ul className="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-border p-2.5 sm:grid-cols-2">
                {templates.map((template) => {
                  const id = `template-${template.id}`;
                  return (
                    <li key={template.id} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        name="applicableTemplateIds"
                        value={template.id}
                        defaultChecked={values.applicableTemplateIds.includes(template.id)}
                        disabled={pending}
                      />
                      <Label htmlFor={id} className="font-normal">
                        {template.name}
                      </Label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend variant="label">When it applies</FieldLegend>

        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-2">
            <Field data-invalid={errors.effectiveDate ? true : undefined}>
              <FieldLabel htmlFor={effectiveId}>Effective date</FieldLabel>
              <Input
                id={effectiveId}
                name="effectiveDate"
                type="date"
                defaultValue={values.effectiveDate}
                disabled={pending}
                aria-invalid={errors.effectiveDate ? true : undefined}
                className="max-w-48"
              />
              <FieldDescription>Leave empty to apply immediately.</FieldDescription>
              {errors.effectiveDate ? <FieldError>{errors.effectiveDate}</FieldError> : null}
            </Field>

            <Field data-invalid={errors.expirationDate ? true : undefined}>
              <FieldLabel htmlFor={expirationId}>Expiration date</FieldLabel>
              <Input
                id={expirationId}
                name="expirationDate"
                type="date"
                defaultValue={values.expirationDate}
                disabled={pending}
                aria-invalid={errors.expirationDate ? true : undefined}
                className="max-w-48"
              />
              <FieldDescription>
                Leave empty to apply indefinitely. Expiring stops new audits using it; audits
                that already did are unaffected.
              </FieldDescription>
              {errors.expirationDate ? <FieldError>{errors.expirationDate}</FieldError> : null}
            </Field>
          </div>

          <Field data-invalid={errors.tags ? true : undefined}>
            <FieldLabel htmlFor={tagsId}>Tags</FieldLabel>
            <Input
              id={tagsId}
              name="tags"
              defaultValue={tags.join(", ")}
              disabled={pending}
              aria-invalid={errors.tags ? true : undefined}
              placeholder="ifrs, materiality, q2"
            />
            <FieldDescription>Comma-separated. Used to filter the library.</FieldDescription>
            {errors.tags ? <FieldError>{errors.tags}</FieldError> : null}
          </Field>
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {isEdit ? (
            textChanged ? (
              <>
                <Badge variant="secondary" className="mr-1.5">
                  v{nextVersion}
                </Badge>
                New version on save. Finished audits keep their own text.
              </>
            ) : (
              <>Metadata changes do not cut a new version — the model is told the same words.</>
            )
          ) : (
            <>This will be saved as version 1.</>
          )}
        </p>
        <Button type="submit" disabled={pending} onClick={() => setSaved(true)}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending
            ? "Saving…"
            : isEdit
              ? textChanged
                ? `Save as v${nextVersion}`
                : "Save changes"
              : "Create instruction"}
        </Button>
      </div>
    </form>
  );
}

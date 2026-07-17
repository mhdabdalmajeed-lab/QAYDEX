"use client";

import { useActionState, useId, useMemo, useState } from "react";
import {
  RiCheckLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiFileCopyLine,
  RiFileList3Line,
  RiHistoryLine,
  RiSearchLine,
} from "@remixicon/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DOMAIN_LABEL, DOMAIN_ORDER } from "@/components/audit/labels";
import type { AuditDomain } from "@/lib/ai/blocks/types";
import { createAudit, type CreateAuditState } from "@/server/actions/audit";

export type TemplateOption = {
  slug: string;
  name: string;
  category: AuditDomain;
  subcategory: string | null;
  description: string;
  isSystem: boolean;
  tags: string[];
  defaultTitle: string;
  auditDescription: string;
  instructions: string;
  recommendedInputs: { name: string; description: string; formats: string[]; required: boolean }[];
  requiredEvidence: string[];
  suggestedPeriod: string | null;
  suggestedFollowups: string[];
  relevantIntegrations: string[];
};

export type PreviousAuditOption = {
  id: string;
  name: string;
  domain: AuditDomain;
  templateName: string | null;
  periodLabel: string | null;
  status: string;
  updatedAt: string;
};

export type NewAuditFormProps = {
  workspaceSlug: string;
  templates: TemplateOption[];
  previousAudits: PreviousAuditOption[];
  entities: { id: string; legalName: string }[];
  clients: { id: string; name: string }[];
  /** From `?template=`, `?domain=`, `?from=`. */
  initialTemplateSlug: string | null;
  initialDomain: AuditDomain | null;
  initialFromAuditId: string | null;
};

type Mode = "template" | "blank" | "previous";

export function NewAuditForm({
  workspaceSlug,
  templates,
  previousAudits,
  entities,
  clients,
  initialTemplateSlug,
  initialDomain,
  initialFromAuditId,
}: NewAuditFormProps) {
  const [state, formAction, pending] = useActionState<CreateAuditState, FormData>(createAudit, {});

  const initialMode: Mode = initialFromAuditId
    ? "previous"
    : initialTemplateSlug
      ? "template"
      : initialDomain
        ? "template"
        : "template";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialTemplateSlug);
  const [fromAuditId, setFromAuditId] = useState<string | null>(initialFromAuditId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AuditDomain | "all">(initialDomain ?? "all");
  const [preview, setPreview] = useState<TemplateOption | null>(null);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [blankDomain, setBlankDomain] = useState<AuditDomain>(initialDomain ?? "general");

  const nameId = useId();
  const searchId = useId();
  const categoryId = useId();
  const domainId = useId();
  const objectiveId = useId();
  const scopeId = useId();
  const periodLabelId = useId();
  const periodStartId = useId();
  const periodEndId = useId();
  const entityId = useId();
  const clientId = useId();

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.slug === selectedSlug) ?? null,
    [templates, selectedSlug],
  );
  const selectedPrevious = useMemo(
    () => previousAudits.find((a) => a.id === fromAuditId) ?? null,
    [previousAudits, fromAuditId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        (t.subcategory ?? "").toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });
  }, [templates, query, category]);

  const countsByCategory = useMemo(() => {
    const counts = new Map<AuditDomain, number>();
    for (const t of templates) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
    return counts;
  }, [templates]);

  /** The effective name: what the user typed, else the template/previous audit default. */
  const suggestedName = selectedTemplate
    ? selectedTemplate.defaultTitle
    : selectedPrevious
      ? `${selectedPrevious.name} (new run)`
      : "";
  const nameValue = nameTouched ? name : (name || suggestedName);

  function selectTemplate(slug: string) {
    setSelectedSlug((current) => (current === slug ? null : slug));
  }

  // The domain a blank audit needs stated explicitly; a template carries its own, and the
  // server derives it from the template regardless of what is posted here.
  const submittedDomain: AuditDomain =
    mode === "template" && selectedTemplate
      ? selectedTemplate.category
      : mode === "previous" && selectedPrevious
        ? selectedPrevious.domain
        : blankDomain;

  const blocked =
    mode === "template" && !selectedTemplate
      ? "Choose a template, or switch to a blank audit."
      : mode === "previous" && !selectedPrevious
        ? "Choose the audit to copy the setup from."
        : null;

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input
        type="hidden"
        name="templateSlug"
        value={mode === "template" && selectedTemplate ? selectedTemplate.slug : ""}
      />
      <input
        type="hidden"
        name="fromAuditId"
        value={mode === "previous" && selectedPrevious ? selectedPrevious.id : ""}
      />
      <input type="hidden" name="domain" value={submittedDomain} />

      {state.error ? (
        <Alert variant="destructive">
          <RiErrorWarningLine aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="start-from-heading" className="flex flex-col gap-3">
        <h2 id="start-from-heading" className="font-heading text-sm font-semibold">
          Start from
        </h2>

        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <TabsList>
            <TabsTrigger value="template">
              <RiFileCopyLine aria-hidden="true" />
              A template
            </TabsTrigger>
            <TabsTrigger value="blank">
              <RiFileList3Line aria-hidden="true" />
              Blank audit
            </TabsTrigger>
            <TabsTrigger value="previous">
              <RiHistoryLine aria-hidden="true" />
              A previous audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              A template carries the audit method: its instructions, the inputs it expects, the
              evidence it requires, and the questions it suggests afterwards. It does not decide
              the findings — the model still reads your evidence.
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field className="sm:max-w-xs">
                <FieldLabel htmlFor={searchId}>Search templates</FieldLabel>
                <div className="relative">
                  <RiSearchLine
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id={searchId}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Journal entries, revenue recognition…"
                    className="pl-8"
                  />
                </div>
              </Field>

              <Field className="sm:w-56">
                <FieldLabel htmlFor={categoryId}>Category</FieldLabel>
                <NativeSelect
                  id={categoryId}
                  className="w-full"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as AuditDomain | "all")}
                >
                  <NativeSelectOption value="all">
                    All categories ({templates.length})
                  </NativeSelectOption>
                  {DOMAIN_ORDER.map((domain) => (
                    <NativeSelectOption key={domain} value={domain}>
                      {DOMAIN_LABEL[domain]} ({countsByCategory.get(domain) ?? 0})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>

              <p className="pb-1.5 text-xs text-muted-foreground" aria-live="polite">
                {filtered.length} of {templates.length} templates
              </p>
            </div>

            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No template matches “{query}”. Clear the search, or start a blank audit and write
                the instructions yourself.
              </p>
            ) : (
              <ul className="grid max-h-[26rem] gap-2 overflow-y-auto rounded-lg border border-border p-2 md:grid-cols-2">
                {filtered.map((template) => {
                  const isSelected = template.slug === selectedSlug;
                  return (
                    <li key={template.slug}>
                      <div
                        className={
                          isSelected
                            ? "flex h-full flex-col gap-1.5 rounded-lg border border-ring bg-accent p-3 ring-3 ring-ring/30"
                            : "flex h-full flex-col gap-1.5 rounded-lg border border-border p-3"
                        }
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => selectTemplate(template.slug)}
                            aria-pressed={isSelected}
                            className="min-w-0 flex-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            <span className="flex items-center gap-1.5">
                              {isSelected ? (
                                <RiCheckLine aria-hidden="true" className="size-4 shrink-0" />
                              ) : null}
                              <span className="truncate text-sm font-medium">{template.name}</span>
                            </span>
                            <span className="sr-only">
                              {isSelected ? "Selected." : "Select this template."}
                            </span>
                          </button>
                          <Badge variant="outline" className="shrink-0">
                            {DOMAIN_LABEL[template.category]}
                          </Badge>
                        </div>

                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {template.description}
                        </p>

                        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                          <span className="truncate text-xs text-muted-foreground">
                            {template.recommendedInputs.length} recommended input
                            {template.recommendedInputs.length === 1 ? "" : "s"}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreview(template)}
                          >
                            <RiEyeLine aria-hidden="true" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="blank" className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              A blank audit starts with no template instructions. You will write what to audit
              yourself, in the next step.
            </p>
            <Field className="max-w-xs">
              <FieldLabel htmlFor={domainId}>Which library does this belong to?</FieldLabel>
              <NativeSelect
                id={domainId}
                className="w-full"
                value={blankDomain}
                onChange={(event) => setBlankDomain(event.target.value as AuditDomain)}
              >
                {DOMAIN_ORDER.map((domain) => (
                  <NativeSelectOption key={domain} value={domain}>
                    {DOMAIN_LABEL[domain]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                Domain sections are filtered views of your audits. This only decides where the
                audit is listed.
              </FieldDescription>
            </Field>
          </TabsContent>

          <TabsContent value="previous" className="mt-4 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Copies the setup — instructions, written context and period — from an audit you have
              already run. Findings and files are not copied: a new audit reads its own evidence.
            </p>

            {previousAudits.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                There are no earlier audits in this workspace yet.
              </p>
            ) : (
              <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {previousAudits.map((audit) => {
                  const isSelected = audit.id === fromAuditId;
                  return (
                    <li key={audit.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setFromAuditId((c) => (c === audit.id ? null : audit.id))}
                        className={
                          isSelected
                            ? "flex w-full items-center gap-3 bg-accent px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            : "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        }
                      >
                        {isSelected ? (
                          <RiCheckLine aria-hidden="true" className="size-4 shrink-0" />
                        ) : (
                          <span aria-hidden="true" className="size-4 shrink-0" />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">{audit.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {DOMAIN_LABEL[audit.domain]}
                            {audit.templateName ? ` · ${audit.templateName}` : ""}
                            {audit.periodLabel ? ` · ${audit.periodLabel}` : ""} · updated{" "}
                            {audit.updatedAt}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      <FieldSet>
        <FieldLegend variant="label">Audit details</FieldLegend>
        <FieldDescription>
          You can change all of this in the setup step before the audit runs.
        </FieldDescription>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={nameId}>Audit name</FieldLabel>
            <Input
              id={nameId}
              name="name"
              required
              disabled={pending}
              value={nameValue}
              onChange={(event) => {
                setNameTouched(true);
                setName(event.target.value);
              }}
              placeholder="Q2 2026 journal entry review"
            />
            {suggestedName && !nameTouched ? (
              <FieldDescription>Prefilled from your selection. Edit it freely.</FieldDescription>
            ) : null}
          </Field>

          <div className="grid gap-5 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={periodLabelId}>Period</FieldLabel>
              <Input
                id={periodLabelId}
                name="periodLabel"
                disabled={pending}
                defaultValue={selectedTemplate?.suggestedPeriod ?? ""}
                placeholder="Q2 2026"
              />
              {selectedTemplate?.suggestedPeriod ? (
                <FieldDescription>Suggested by the template.</FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel htmlFor={periodStartId}>Period start</FieldLabel>
              <Input id={periodStartId} name="periodStart" type="date" disabled={pending} />
            </Field>
            <Field>
              <FieldLabel htmlFor={periodEndId}>Period end</FieldLabel>
              <Input id={periodEndId} name="periodEnd" type="date" disabled={pending} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor={objectiveId}>Objective</FieldLabel>
            <Textarea
              id={objectiveId}
              name="objective"
              rows={3}
              disabled={pending}
              defaultValue={selectedTemplate?.auditDescription ?? ""}
              key={selectedTemplate?.slug ?? "no-template"}
              placeholder="What this audit is meant to establish."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={scopeId}>Scope</FieldLabel>
            <Textarea
              id={scopeId}
              name="scope"
              rows={2}
              disabled={pending}
              placeholder="Entities, accounts, or transaction types this audit covers."
            />
          </Field>

          {entities.length > 0 ? (
            <Field className="max-w-sm">
              <FieldLabel htmlFor={entityId}>Entity</FieldLabel>
              <NativeSelect id={entityId} name="entityId" disabled={pending} className="w-full">
                <NativeSelectOption value="">Not entity-specific</NativeSelectOption>
                {entities.map((entity) => (
                  <NativeSelectOption key={entity.id} value={entity.id}>
                    {entity.legalName}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>
                Entity-scoped mandatory instructions only apply when an entity is set.
              </FieldDescription>
            </Field>
          ) : null}

          {clients.length > 0 ? (
            <Field className="max-w-sm">
              <FieldLabel htmlFor={clientId}>Client</FieldLabel>
              <NativeSelect id={clientId} name="clientId" disabled={pending} className="w-full">
                <NativeSelectOption value="">No client</NativeSelectOption>
                {clients.map((client) => (
                  <NativeSelectOption key={client.id} value={client.id}>
                    {client.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {blocked ??
            "Next you will confirm the instructions, attach evidence, and review what was read."}
        </p>
        <Button type="submit" disabled={pending || blocked !== null}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? "Creating…" : "Create audit"}
        </Button>
      </div>

      <TemplatePreviewDialog
        template={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onUse={(template) => {
          setMode("template");
          setSelectedSlug(template.slug);
          setPreview(null);
        }}
      />
    </form>
  );
}

function TemplatePreviewDialog({
  template,
  onOpenChange,
  onUse,
}: {
  template: TemplateOption | null;
  onOpenChange: (open: boolean) => void;
  onUse: (template: TemplateOption) => void;
}) {
  return (
    <Dialog open={template !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        {template ? (
          <>
            <DialogHeader>
              <DialogTitle>{template.name}</DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{DOMAIN_LABEL[template.category]}</Badge>
              {template.subcategory ? (
                <Badge variant="outline">{template.subcategory.replace(/_/g, " ")}</Badge>
              ) : null}
              {template.isSystem ? <Badge variant="outline">System template</Badge> : null}
              {template.tags.map((tag) => (
                <Badge key={tag} variant="ghost">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <PreviewSection title="Instructions this template applies">
                <p className="text-pretty whitespace-pre-wrap text-muted-foreground">
                  {template.instructions}
                </p>
              </PreviewSection>

              <PreviewSection title="Recommended inputs">
                {template.recommendedInputs.length === 0 ? (
                  <p className="text-muted-foreground">This template names no specific inputs.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {template.recommendedInputs.map((input) => (
                      <li key={input.name} className="rounded-lg border border-border p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{input.name}</span>
                          <Badge variant={input.required ? "secondary" : "outline"}>
                            {input.required ? "Required" : "Optional"}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{input.description}</p>
                        {input.formats.length > 0 ? (
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {input.formats.join(" · ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </PreviewSection>

              <PreviewSection title="Required evidence">
                {template.requiredEvidence.length === 0 ? (
                  <p className="text-muted-foreground">Nothing is named as mandatory evidence.</p>
                ) : (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {template.requiredEvidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </PreviewSection>

              <PreviewSection title="Suggested follow-up questions">
                {template.suggestedFollowups.length === 0 ? (
                  <p className="text-muted-foreground">None.</p>
                ) : (
                  <ul className="list-disc pl-5 text-muted-foreground">
                    {template.suggestedFollowups.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </PreviewSection>

              {template.suggestedPeriod ? (
                <PreviewSection title="Suggested period">
                  <p className="text-muted-foreground">{template.suggestedPeriod}</p>
                </PreviewSection>
              ) : null}

              {template.relevantIntegrations.length > 0 ? (
                <PreviewSection title="Relevant integrations">
                  <p className="text-muted-foreground">
                    {template.relevantIntegrations.join(", ")}
                  </p>
                </PreviewSection>
              ) : null}
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Close</DialogClose>
              <Button type="button" onClick={() => onUse(template)}>
                Use this template
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-heading text-xs font-semibold tracking-wide uppercase text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

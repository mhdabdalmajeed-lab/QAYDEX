"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { RiEyeLine, RiFileCopyLine } from "@remixicon/react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { duplicateTemplate, type DuplicateTemplateState } from "@/server/actions/template";

export type TemplatePreviewData = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryLabel: string;
  subcategory: string | null;
  version: number;
  isSystem: boolean;
  tags: string[];
  defaultTitle: string;
  auditDescription: string;
  instructions: string;
  recommendedInputs: { name: string; description: string; formats: string[]; required: boolean }[];
  requiredEvidence: string[];
  suggestedPeriod: string | null;
  expectedOutputStructure: string[];
  suggestedFollowups: string[];
  relevantIntegrations: string[];
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-heading text-xs font-semibold tracking-tight text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** PRD §17.1: templates must be previewable. The preview is the whole method, verbatim. */
export function TemplatePreview({
  template,
  slug,
}: {
  template: TemplatePreviewData;
  slug: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <RiEyeLine aria-hidden="true" />
        Preview
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary">{template.categoryLabel}</Badge>
          {template.subcategory ? <Badge variant="outline">{template.subcategory}</Badge> : null}
          <Badge variant="outline">Version {template.version}</Badge>
          <Badge variant="outline">{template.isSystem ? "System template" : "Workspace template"}</Badge>
        </div>

        <ScrollArea className="max-h-[45vh] pr-3">
          <div className="flex flex-col gap-4 text-sm">
            <Section title="Default audit title">
              <p>{template.defaultTitle}</p>
            </Section>

            <Section title="What this audit does">
              <p className="text-muted-foreground">{template.auditDescription}</p>
            </Section>

            <Separator />

            <Section title="Instructions given to the model">
              <p className="text-sm/relaxed whitespace-pre-wrap text-muted-foreground">
                {template.instructions}
              </p>
            </Section>

            <Separator />

            <Section title="Recommended inputs">
              <ul className="flex flex-col gap-1.5">
                {template.recommendedInputs.map((input) => (
                  <li key={input.name} className="rounded-lg border border-border p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{input.name}</span>
                      <Badge variant={input.required ? "secondary" : "outline"}>
                        {input.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{input.description}</p>
                    {input.formats.length > 0 ? (
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
                        {input.formats.join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Section>

            {template.requiredEvidence.length > 0 ? (
              <Section title="Required evidence">
                <ul className="list-disc pl-4 text-muted-foreground marker:text-muted-foreground/50">
                  {template.requiredEvidence.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {template.expectedOutputStructure.length > 0 ? (
              <Section title="Expected output blocks">
                <div className="flex flex-wrap gap-1">
                  {template.expectedOutputStructure.map((block) => (
                    <Badge key={block} variant="outline">
                      {block.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </Section>
            ) : null}

            {template.suggestedFollowups.length > 0 ? (
              <Section title="Suggested follow-ups">
                <ul className="list-disc pl-4 text-muted-foreground marker:text-muted-foreground/50">
                  {template.suggestedFollowups.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {template.suggestedPeriod ? (
              <Section title="Suggested period">
                <p className="text-muted-foreground capitalize">{template.suggestedPeriod}</p>
              </Section>
            ) : null}

            {template.relevantIntegrations.length > 0 ? (
              <Section title="Relevant integrations">
                <div className="flex flex-wrap gap-1">
                  {template.relevantIntegrations.map((key) => (
                    <Badge key={key} variant="outline">
                      {key.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </Section>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          <Button render={<Link href={`/w/${slug}/audits/new?template=${template.slug}`} />}>
            Use this template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const initialState: DuplicateTemplateState = {};

export function DuplicateButton({
  template,
  slug,
}: {
  template: { id: string; name: string };
  slug: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(duplicateTemplate, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <RiFileCopyLine aria-hidden="true" />
        Duplicate
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Copy to workspace templates</DialogTitle>
            <DialogDescription>
              The copy is yours to edit. Audits already running on the original keep using the
              exact version they were created with.
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="workspaceSlug" value={slug} />
          <input type="hidden" name="templateId" value={template.id} />

          <div className="py-4">
            <Field>
              <FieldLabel htmlFor="copy-name">Name</FieldLabel>
              <Input
                id="copy-name"
                name="name"
                required
                maxLength={200}
                defaultValue={`${template.name} (copy)`}
                aria-invalid={state.error ? true : undefined}
                aria-describedby={state.error ? "copy-error" : undefined}
              />
            </Field>
            {state.error ? (
              <p id="copy-error" aria-live="polite" className="mt-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            {state.ok ? (
              <p aria-live="polite" className="mt-2 text-sm text-muted-foreground">
                Copied. It now appears under Workspace templates.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Copying…" : "Copy template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

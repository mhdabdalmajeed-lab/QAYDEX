"use client";

import { useId, useMemo, useState } from "react";
import { addMonths, addYears, subDays } from "date-fns";

import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CUSTOM = "custom";

type Preset = { value: string; label: string; start: Date; end: Date };

/** The fiscal year containing `today`, as the calendar year it starts in. */
function fiscalYearStart(today: Date, startMonth: number): Date {
  const year = today.getMonth() + 1 >= startMonth ? today.getFullYear() : today.getFullYear() - 1;
  return new Date(year, startMonth - 1, 1);
}

/**
 * A fiscal year that runs January to December is named after its only year; any other
 * straddles two, and accountants write both.
 */
function fiscalYearLabel(start: Date, startMonth: number): string {
  if (startMonth === 1) return `FY ${start.getFullYear()}`;
  const endYear = start.getFullYear() + 1;
  return `FY ${start.getFullYear()}/${String(endYear).slice(2)}`;
}

function buildPresets(today: Date, startMonth: number): Preset[][] {
  const current = fiscalYearStart(today, startMonth);
  const previous = addYears(current, -1);

  return [current, previous].map((yearStart) => {
    const label = fiscalYearLabel(yearStart, startMonth);
    const yearEnd = subDays(addYears(yearStart, 1), 1);

    const quarters = [0, 1, 2, 3].map((index) => {
      const start = addMonths(yearStart, index * 3);
      return {
        value: `${label}-q${index + 1}`,
        label: `Q${index + 1} ${label}`,
        start,
        end: subDays(addMonths(start, 3), 1),
      };
    });

    return [{ value: label, label, start: yearStart, end: yearEnd }, ...quarters];
  });
}

export type PeriodFieldsProps = {
  /** 1–12. Decides where the fiscal year — and so every quarter — begins. */
  fiscalYearStartMonth: number;
  disabled?: boolean;
};

/**
 * The period an audit covers: a label and the two dates that bound it.
 *
 * The three are one decision, not three, so the picker leads: choosing a fiscal year or a
 * quarter fills the label and both dates at once. Editing a date afterwards drops back to a
 * custom period rather than leaving a preset's name on dates that no longer match it.
 */
export function PeriodFields({ fiscalYearStartMonth, disabled }: PeriodFieldsProps) {
  const presetId = useId();
  const labelId = useId();
  const startId = useId();
  const endId = useId();

  // Built once per mount: `new Date()` during render would differ between the server and
  // client passes, and the presets only need the day, not the minute.
  const groups = useMemo(
    () => buildPresets(new Date(), fiscalYearStartMonth),
    [fiscalYearStartMonth],
  );
  const presets = useMemo(() => groups.flat(), [groups]);

  const [preset, setPreset] = useState<string>(CUSTOM);
  const [label, setLabel] = useState("");
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);

  function applyPreset(value: string) {
    setPreset(value);
    const chosen = presets.find((option) => option.value === value);
    if (!chosen) return;
    setLabel(chosen.label);
    setStart(chosen.start);
    setEnd(chosen.end);
  }

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={presetId}>Period</FieldLabel>
          <Select
            value={preset}
            onValueChange={(value) => applyPreset(String(value))}
            disabled={disabled}
          >
            <SelectTrigger id={presetId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectGroup key={group[0].value}>
                  <SelectLabel>{group[0].label}</SelectLabel>
                  {group.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
              <SelectSeparator />
              <SelectGroup>
                <SelectItem value={CUSTOM}>Custom period</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>Fills the name and both dates below.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={labelId}>Period name</FieldLabel>
          <Input
            id={labelId}
            name="periodLabel"
            disabled={disabled}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Q2 2026"
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={startId}>Period start</FieldLabel>
          <DatePicker
            id={startId}
            name="periodStart"
            value={start}
            disabled={disabled}
            onChange={(date) => {
              setStart(date);
              setPreset(CUSTOM);
            }}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={endId}>Period end</FieldLabel>
          <DatePicker
            id={endId}
            name="periodEnd"
            value={end}
            disabled={disabled}
            onChange={(date) => {
              setEnd(date);
              setPreset(CUSTOM);
            }}
          />
        </Field>
      </div>
    </>
  );
}

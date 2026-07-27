"use client";

import { useState } from "react";
import { format } from "date-fns";
import { RiCalendarLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DatePickerProps = {
  /** Submitted as `yyyy-MM-dd`, the format every date input in the app posts. */
  name?: string;
  id?: string;
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/** The wire format, kept out of the browser's locale so the server reads what it expects. */
export function toDateValue(date: Date | undefined): string {
  return date ? format(date, "yyyy-MM-dd") : "";
}

/**
 * A single date, picked from a calendar rather than typed.
 *
 * A hidden input carries the value so the surrounding `<form>` posts it exactly like a
 * native date input would — these forms are server actions reading `FormData`, not
 * controlled React state.
 */
export function DatePicker({
  name,
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {name ? <input type="hidden" name={name} value={toDateValue(value)} /> : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedBy}
              className={cn(
                "w-full justify-between font-normal",
                value ? undefined : "text-muted-foreground",
                className,
              )}
            />
          }
        >
          {value ? format(value, "d MMM yyyy") : placeholder}
          <RiCalendarLine aria-hidden="true" className="size-4 shrink-0 opacity-60" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            // The style's default cell is 28px, which two-digit dates sit shoulder to
            // shoulder in. A 36px cell gives them room and matches the trigger's height.
            className="[--cell-size:--spacing(9)] p-3"
            // The year dropdown needs an explicit range; audits are written about the recent
            // past and, at the far end, a period that has not closed yet.
            captionLayout="dropdown"
            startMonth={new Date(new Date().getFullYear() - 10, 0)}
            endMonth={new Date(new Date().getFullYear() + 2, 11)}
            selected={value}
            defaultMonth={value}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

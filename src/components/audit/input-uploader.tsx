"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiFileLine,
  RiUploadCloud2Line,
} from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/components/audit/labels";

type UploadState = "queued" | "uploading" | "reading" | "done" | "error";

type Upload = {
  key: string;
  name: string;
  size: number;
  progress: number;
  state: UploadState;
  /** Parse status returned by the route handler, e.g. `parsed`, `unsupported`. */
  parseStatus?: string;
  message?: string;
};

type UploadResult = {
  name: string;
  status: string;
  inputId?: string;
  warning?: string;
};

const STATE_LABEL: Record<UploadState, string> = {
  queued: "Waiting",
  uploading: "Uploading",
  reading: "Reading the file",
  done: "Added",
  error: "Failed",
};

/**
 * File evidence upload (PRD §8.5).
 *
 * Goes to the `/api/uploads` Route Handler rather than a Server Function: Server Actions cap
 * bodies at 1MB, and an accounting export is routinely far larger. XHR rather than fetch
 * because it is the only way to get real upload progress — and on a 200MB ledger export, a
 * progress bar that is honest matters more than one that is fashionable.
 *
 * Files are uploaded one at a time so each one gets its own progress and its own outcome: a
 * single unreadable PDF must not take the rest of the batch down with it.
 */
export function InputUploader({ auditId, disabled }: { auditId: string; disabled: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputId = useId();

  const update = useCallback((key: string, patch: Partial<Upload>) => {
    setUploads((current) =>
      current.map((upload) => (upload.key === key ? { ...upload, ...patch } : upload)),
    );
  }, []);

  const uploadOne = useCallback(
    (file: File, key: string) =>
      new Promise<void>((resolve) => {
        const body = new FormData();
        body.set("auditId", auditId);
        body.append("files", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/uploads");

        xhr.upload.addEventListener("progress", (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded / event.total) * 100);
          update(key, {
            progress,
            // The server parses inline, so 100% sent is not 100% done.
            state: progress >= 100 ? "reading" : "uploading",
          });
        });

        xhr.addEventListener("load", () => {
          let payload: { results?: UploadResult[]; error?: string } = {};
          try {
            payload = JSON.parse(xhr.responseText) as typeof payload;
          } catch {
            payload = {};
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            update(key, {
              state: "error",
              progress: 100,
              message: payload.error ?? `The server rejected the upload (${xhr.status}).`,
            });
            resolve();
            return;
          }

          const result = payload.results?.[0];
          if (!result) {
            update(key, { state: "error", progress: 100, message: "The server sent no result." });
            resolve();
            return;
          }

          if (result.status === "rejected" || result.status === "failed") {
            update(key, {
              state: "error",
              progress: 100,
              parseStatus: result.status,
              message: result.warning ?? "The file could not be stored.",
            });
          } else {
            update(key, {
              state: "done",
              progress: 100,
              parseStatus: result.status,
              message: result.warning,
            });
          }
          resolve();
        });

        xhr.addEventListener("error", () => {
          update(key, {
            state: "error",
            progress: 100,
            message: "The connection dropped before the file finished uploading.",
          });
          resolve();
        });

        xhr.addEventListener("abort", () => {
          update(key, { state: "error", progress: 100, message: "Upload cancelled." });
          resolve();
        });

        update(key, { state: "uploading" });
        xhr.send(body);
      }),
    [auditId, update],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || disabled) return;

      const queued: Upload[] = files.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        size: file.size,
        progress: 0,
        state: "queued",
      }));

      setUploads((current) => [...current, ...queued]);
      setBusy(true);
      for (const [index, upload] of queued.entries()) {
        await uploadOne(files[index], upload.key);
      }
      setBusy(false);
      // The review list below is server-rendered from the database, so refresh rather than
      // duplicating parse results into client state.
      router.refresh();
    },
    [disabled, uploadOne, router],
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          void addFiles([...event.dataTransfer.files]);
        }}
        className={
          dragging
            ? "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-ring bg-accent px-4 py-8 text-center"
            : "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-8 text-center"
        }
      >
        <RiUploadCloud2Line aria-hidden="true" className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Drop evidence here</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Spreadsheets, CSVs, PDFs, statements, invoices, exports, images, archives. Anything we
          cannot read is still stored and flagged, never silently dropped. Up to 100MB per file.
        </p>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          className="sr-only"
          disabled={disabled || busy}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void addFiles(files);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>
        <label htmlFor={inputId} className="sr-only">
          Add evidence files to this audit
        </label>
      </div>

      {uploads.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-live="polite">
          {uploads.map((upload) => (
            <li key={upload.key} className="rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <StateIcon state={upload.state} />
                <span className="min-w-0 flex-1 truncate text-sm">{upload.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatBytes(upload.size)}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {STATE_LABEL[upload.state]}
                </span>
              </div>

              {upload.state === "uploading" || upload.state === "queued" ? (
                <Progress
                  value={upload.progress}
                  className="mt-1.5"
                  aria-label={`Uploading ${upload.name}`}
                />
              ) : null}
              {upload.state === "reading" ? (
                <Progress value={null} className="mt-1.5" aria-label={`Reading ${upload.name}`} />
              ) : null}

              {upload.message ? (
                <p
                  className={
                    upload.state === "error"
                      ? "mt-1 text-xs text-destructive"
                      : "mt-1 text-xs text-muted-foreground"
                  }
                >
                  {upload.message}
                </p>
              ) : null}
              {upload.state === "done" && upload.parseStatus === "unsupported" ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Stored, but this format could not be read into tables. The model will not be able
                  to cite rows from it.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function StateIcon({ state }: { state: UploadState }) {
  if (state === "done") {
    return (
      <RiCheckboxCircleLine aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    );
  }
  if (state === "error") {
    return <RiCloseCircleLine aria-hidden="true" className="size-4 shrink-0 text-destructive" />;
  }
  return <RiFileLine aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />;
}

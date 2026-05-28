"use client";

import React, { type DragEvent, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "./Button";

type DataPortabilityProps<T> = {
  csvRows?: Array<Record<string, unknown>>;
  data: T;
  filename: string;
  label: string;
  onImport?: (data: unknown) => Promise<void>;
};

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll("\"", "\"\"")}"`;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0] ?? {});
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

export function DataPortability<T>({ csvRows, data, filename, label, onImport }: DataPortabilityProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");

  async function importFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      await onImport?.(parsed);
      setMessage("Import complete.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    }
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];

    if (file) {
      await importFile(file);
    }
  }

  return (
    <section
      className="portability-panel"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => void handleDrop(event)}
      aria-label={`${label} import and export`}
    >
      <div>
        <strong>{label}</strong>
        <span>Drop JSON here, or export current data.</span>
      </div>
      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => download(`${filename}.json`, JSON.stringify(data, null, 2), "application/json")}>
          <Download aria-hidden="true" size={18} />
          JSON
        </Button>
        <Button type="button" variant="secondary" onClick={() => download(`${filename}.csv`, toCsv(csvRows ?? []), "text/csv")}>
          <Download aria-hidden="true" size={18} />
          CSV
        </Button>
        {onImport ? (
          <>
            <input
              accept="application/json,.json"
              className="sr-only"
              ref={inputRef}
              type="file"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) {
                  void importFile(file);
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload aria-hidden="true" size={18} />
              Import
            </Button>
          </>
        ) : null}
      </div>
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}

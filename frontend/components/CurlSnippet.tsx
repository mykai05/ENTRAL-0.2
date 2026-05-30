"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import { Button } from "./Button";
import { useToast } from "./ToastProvider";

type CurlSnippetProps = {
  authenticated?: boolean;
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
};

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
    .replaceAll("'", "'\"'\"'")
    .replaceAll("\n", "\\\n  ");
}

export function CurlSnippet({ authenticated = true, body, method = "GET", path, title }: CurlSnippetProps) {
  const [copied, setCopied] = useState(false);
  const { notify } = useToast();
  const snippet = useMemo(() => {
    const lines = [
      `curl -X ${method} "${API_BASE_URL}/api/v1${path}"`,
      ...(authenticated ? [`  -H "Authorization: Bearer $ENTRAL_TOKEN"`] : []),
      `  -H "Content-Type: application/json"`
    ];

    if (body !== undefined) {
      lines.push(`  -d '${formatJson(body)}'`);
    }

    return lines.join(" \\\n");
  }, [body, method, path]);

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      notify({ title: "Copied", message: `${title} cURL copied.`, type: "success" });
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
      notify({ title: "Copy failed", message: "Clipboard access was blocked.", type: "error" });
    }
  }

  function handleCopyClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void copySnippet();
  }

  return (
    <details className="curl-card">
      <summary>
        <span>
          <strong>{title}</strong>
          <small>Developer API reference</small>
        </span>
        <Button type="button" variant="secondary" onClick={handleCopyClick} aria-label={`Copy ${title} cURL`}>
          {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </summary>
      <pre><code>{snippet}</code></pre>
    </details>
  );
}

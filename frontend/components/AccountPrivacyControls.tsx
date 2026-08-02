"use client";

import React, { useRef, useState } from "react";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { Button } from "./Button";
import { ModeBadge } from "./ModeStatus";

const accountDeletionConfirmation = "DELETE MY ACCOUNT";

type AccountPrivacyControlsProps = {
  onDeleted?: () => void;
};

function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AccountPrivacyControls({ onDeleted }: AccountPrivacyControlsProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deidentificationKey = useRef<string | undefined>(undefined);

  async function handleExport() {
    setError("");
    setStatus("");
    setIsExporting(true);

    try {
      const exportData = await apiFetch<unknown>("/account/export");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJsonFile(`entral-account-export-${timestamp}.json`, exportData);
      setStatus("Account export prepared.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export account data.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (confirmation !== accountDeletionConfirmation) {
      setError(`Type ${accountDeletionConfirmation} to confirm account deletion.`);
      return;
    }

    setIsDeleting(true);

    try {
      deidentificationKey.current ??= crypto.randomUUID();
      await apiFetch("/account", {
        method: "DELETE",
        headers: { "idempotency-key": deidentificationKey.current },
        json: {
          confirmation,
          password
        }
      });
      setStatus("Account deidentified. Tenant records and required evidence were retained.");

      if (onDeleted) {
        onDeleted();
      } else {
        window.location.assign("/dashboard");
      }
    } catch (deleteError) {
      if (deleteError instanceof ApiError && deleteError.status === 409
        && (deleteError.details as { reason_code?: string } | null)?.reason_code === "LAST_ACTIVE_OWNER_REQUIRED") {
        setError("Transfer ownership to another active owner before deidentifying this account.");
      } else if (deleteError instanceof ApiError && deleteError.status === 401) {
        setError("Password confirmation failed.");
      } else {
        setError(deleteError instanceof Error ? deleteError.message : "Unable to delete account.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="privacy-controls">
      <div className="privacy-action">
        <div className="section-title-row">
          <Download aria-hidden="true" size={18} />
          <h3>Privacy export</h3>
          <ModeBadge mode="real">Real account data</ModeBadge>
        </div>
        <p className="settings-helper">Download a JSON copy of your account identity, security descriptors, current tenant membership, and tenant-scoped tasks. No secret material is included and no external provider is contacted.</p>
        <div className="settings-actions">
          <Button isLoading={isExporting} onClick={() => void handleExport()} type="button" variant="secondary">
            <Download aria-hidden="true" size={18} />
            {isExporting ? "Preparing export" : "Download export"}
          </Button>
        </div>
      </div>

      <form className="privacy-action danger-zone" onSubmit={handleDelete}>
        <div className="section-title-row">
          <Trash2 aria-hidden="true" size={18} />
          <h3>Delete account</h3>
          <ModeBadge mode="read-only">Password gated</ModeBadge>
        </div>
        <p className="settings-helper">Revokes account access and deidentifies personal login fields. Tenant records, creator provenance, and required security evidence are retained.</p>
        <label>
          <span>Current password</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Current password"
            type="password"
            value={password}
          />
        </label>
        <label>
          <span>Confirmation phrase</span>
          <input
            autoComplete="off"
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={accountDeletionConfirmation}
            value={confirmation}
          />
        </label>
        <p className="confirmation-phrase">
          Required phrase: <strong>{accountDeletionConfirmation}</strong>
        </p>
        <div className="settings-actions">
          <Button disabled={!password || !confirmation} isLoading={isDeleting} type="submit" variant="danger">
            <ShieldCheck aria-hidden="true" size={18} />
            {isDeleting ? "Deleting account" : "Delete account"}
          </Button>
        </div>
      </form>

      {status ? <p className="form-success" role="status">{status}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

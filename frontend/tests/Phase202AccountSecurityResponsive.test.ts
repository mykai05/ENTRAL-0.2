import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 202 account-security responsive containment", () => {
  it("binds the authority surface to zero-minimum grid tracks", () => {
    const component = readFileSync(resolve(process.cwd(), "components", "AccountSecurityControls.tsx"), "utf8");
    const styles = readFileSync(resolve(process.cwd(), "app", "phase180.css"), "utf8");

    expect(component).toContain('className="member-auth-shell phase202-account-security-shell"');
    expect(component).toContain('className="member-auth-card phase202-account-security-card"');
    expect(component).toContain('className="phase202-account-security-content"');
    expect(component).toContain('maxWidth: "min(72rem, 100%)"');
    expect(styles).toMatch(/\.phase202-account-security-shell,[\s\S]*?\.phase202-account-security-card,[\s\S]*?\.phase202-account-security-content\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);[\s\S]*?max-width:\s*100%;[\s\S]*?min-width:\s*0;/u);
    expect(styles).toMatch(/\.phase202-account-security-card\s+:where\(\.privacy-action,\s*ul,\s*li,\s*form\)\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\);/u);
    expect(styles).toMatch(/\.phase202-account-security-card\s+:where\(code,\s*\.settings-helper,\s*span,\s*strong\)\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/u);
  });
});

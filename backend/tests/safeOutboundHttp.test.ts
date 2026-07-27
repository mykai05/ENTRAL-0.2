import { describe, expect, it } from "vitest";
import { resolvePublicAddresses } from "../src/services/safeOutboundHttp.js";
import { assertSafePublicHttpUrl, isGlobalUnicastIpAddress } from "../src/services/urlSafety.js";

describe("safe outbound HTTP address validation", () => {
  it("classifies public and non-global IPv4 and IPv6 address families", () => {
    expect(isGlobalUnicastIpAddress("93.184.216.34")).toBe(true);
    expect(isGlobalUnicastIpAddress("2606:4700:4700::1111")).toBe(true);
    expect(isGlobalUnicastIpAddress("127.0.0.1")).toBe(false);
    expect(isGlobalUnicastIpAddress("169.254.169.254")).toBe(false);
    expect(isGlobalUnicastIpAddress("198.51.100.7")).toBe(false);
    expect(isGlobalUnicastIpAddress("::ffff:127.0.0.1")).toBe(false);
    expect(isGlobalUnicastIpAddress("fc00::1")).toBe(false);
    expect(isGlobalUnicastIpAddress("fec0::1")).toBe(false);
    expect(isGlobalUnicastIpAddress("64:ff9b:1::1")).toBe(false);
    expect(isGlobalUnicastIpAddress("2001:db8::1")).toBe(false);
    expect(isGlobalUnicastIpAddress("3fff::1")).toBe(false);
  });

  it("rejects a hostname if any A or AAAA answer is non-global", async () => {
    await expect(resolvePublicAddresses("mixed.example.com", async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 }
    ])).rejects.toThrow(/non-public/i);

    await expect(resolvePublicAddresses("public.example.com", async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 }
    ])).resolves.toHaveLength(2);
  });

  it("rejects embedded credentials and private IP literals before DNS", () => {
    expect(() => assertSafePublicHttpUrl("https://user:secret@example.com/path")).toThrow(/embedded credentials/i);
    expect(() => assertSafePublicHttpUrl("http://[::ffff:127.0.0.1]/admin")).toThrow(/public host/i);
  });
});

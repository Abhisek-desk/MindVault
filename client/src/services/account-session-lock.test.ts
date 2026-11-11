import { afterEach, describe, expect, it, vi } from "vitest";

import { withAccountSessionLock } from "./account-session-lock";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Account session lock", () => {
  it("executes an operation when Web Locks are unavailable", async () => {
    vi.stubGlobal("navigator", {
      onLine: true,
    });

    const operation = vi.fn().mockResolvedValue("success");

    const result = await withAccountSessionLock(operation);

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledOnce();
  });

  it("uses the shared synchronization lock when supported", async () => {
    const request = vi.fn(
      async (
        _name: string,
        _options: { mode: string },
        callback: () => Promise<string>,
      ) => callback(),
    );

    vi.stubGlobal("navigator", {
      locks: { request },
    });

    const result = await withAccountSessionLock(async () => "locked");

    expect(result).toBe("locked");

    expect(request).toHaveBeenCalledWith(
      "mindvault-sync",
      { mode: "exclusive" },
      expect.any(Function),
    );
  });

  it("propagates operation errors", async () => {
    vi.stubGlobal("navigator", {
      onLine: true,
    });

    await expect(
      withAccountSessionLock(async () => {
        throw new Error("Operation failed.");
      }),
    ).rejects.toThrow("Operation failed.");
  });

  it("propagates Web Lock errors", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Lock unavailable."));

    vi.stubGlobal("navigator", {
      locks: { request },
    });

    await expect(withAccountSessionLock(async () => "success")).rejects.toThrow(
      "Lock unavailable.",
    );
  });
});

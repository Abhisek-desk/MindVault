import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { synchronizeData } from "../services/sync.service";
import { useSyncStore } from "./sync.store";

vi.mock("../services/sync.service", () => ({
  synchronizeData: vi.fn(),
}));

const mockedSynchronizeData = vi.mocked(synchronizeData);

describe("Sync Store", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal("navigator", {
      onLine: true,
    });

    useSyncStore.setState({
      status: "idle",
      lastSyncedAt: null,
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets the status to offline", () => {
    useSyncStore.getState().setOffline();

    expect(useSyncStore.getState().status).toBe("offline");
  });

  it("prevents synchronization when offline", async () => {
    vi.stubGlobal("navigator", {
      onLine: false,
    });

    await useSyncStore.getState().syncNow();

    expect(useSyncStore.getState().status).toBe("offline");
    expect(mockedSynchronizeData).not.toHaveBeenCalled();
  });

  it("marks synchronization as successful", async () => {
    mockedSynchronizeData.mockResolvedValue(undefined);

    await useSyncStore.getState().syncNow();

    expect(mockedSynchronizeData).toHaveBeenCalledTimes(1);
    expect(useSyncStore.getState().status).toBe("synced");
    expect(useSyncStore.getState().error).toBeNull();
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  });

  it("records an error when synchronization fails", async () => {
    mockedSynchronizeData.mockRejectedValue(
      new Error("Network unavailable")
    );

    await useSyncStore.getState().syncNow();

    expect(useSyncStore.getState().status).toBe("error");
    expect(useSyncStore.getState().error).toBe(
      "Network unavailable"
    );
  });

  it("prevents simultaneous synchronization requests", async () => {
    let finishSync!: () => void;

    mockedSynchronizeData.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSync = resolve;
        })
    );

    const firstSync = useSyncStore.getState().syncNow();

    await Promise.resolve();

    expect(useSyncStore.getState().status).toBe("syncing");

    await useSyncStore.getState().syncNow();

    expect(mockedSynchronizeData).toHaveBeenCalledTimes(1);

    finishSync();

    await firstSync;

    expect(useSyncStore.getState().status).toBe("synced");
  });
});
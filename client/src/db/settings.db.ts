import {
  db,
  withDatabaseLease,
  DEFAULT_APP_SETTINGS,
  type LocalAppSettings,
} from "./database";

export const getAppSettings = async (): Promise<LocalAppSettings> =>
  withDatabaseLease(async () => {
    const saved = await db.settings.get("app-settings");

    if (saved) {
      return saved;
    }

    const defaults: LocalAppSettings = {
      ...DEFAULT_APP_SETTINGS,
      updatedAt: new Date().toISOString(),
    };

    await db.settings.put(defaults);
    return defaults;
  });

export const updateAppSettings = async (
  updates: Partial<Omit<LocalAppSettings, "id" | "updatedAt">>,
): Promise<LocalAppSettings> =>
  withDatabaseLease(async () => {
    const current =
      (await db.settings.get("app-settings")) ?? {
        ...DEFAULT_APP_SETTINGS,
        updatedAt: new Date().toISOString(),
      };

    const updated: LocalAppSettings = {
      ...current,
      ...updates,
      id: "app-settings",
      updatedAt: new Date().toISOString(),
    };

    await db.settings.put(updated);
    return updated;
  });

export const resetAppSettings = async (): Promise<LocalAppSettings> =>
  withDatabaseLease(async () => {
    const defaults: LocalAppSettings = {
      ...DEFAULT_APP_SETTINGS,
      updatedAt: new Date().toISOString(),
    };

    await db.settings.put(defaults);
    return defaults;
  });
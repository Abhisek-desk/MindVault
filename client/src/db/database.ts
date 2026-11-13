import Dexie from "dexie";
import type { Table } from "dexie";

// =====================================
// LOCAL DATABASE TYPES
// =====================================

export interface LocalNote {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: "synced" | "pending" | "conflict";
}

export interface LocalFolder {
  id: string;
  name: string;
  color: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: "synced" | "pending" | "conflict";
}

export interface LocalPack {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  version: string;
  downloadedAt: string;
  fileSizeBytes: number;
  contentBlob?: Blob;
}

export interface LocalLearningProgress {
  packId: string;
  completedTopics: string[];
  totalTopics: number;
  progressPercentage: number;
  status: "not-started" | "in-progress" | "completed";
  startedAt: string;
  updatedAt: string;
  lastLessonId: string | null;
  syncStatus: "synced" | "pending";
}

export interface LocalSyncChange {
  id?: number;
  entityType: "note" | "folder";
  entityId: string;
  operation: "create" | "update" | "delete";
  clientMutationId: string;
  expectedVersion?: number;
  data?: Record<string, unknown>;
  createdAt: string;
  status: "pending" | "processing" | "failed";
}

export interface LocalSyncMeta {
  key: string;
  value: string;
}

export interface LocalConflict {
  id: string;
  entityType: "note" | "folder";
  entityId: string;
  operation: "create" | "update" | "delete";
  localData: Record<string, unknown> | null;
  serverData: Record<string, unknown> | null;
  serverChangeId: string;
  detectedAt: string;
}

// =====================================
// DATABASE CLASS
// =====================================

class MindVaultDatabase extends Dexie {
  notes!: Table<LocalNote, string>;
  packs!: Table<LocalPack, string>;
  folders!: Table<LocalFolder, string>;
  syncQueue!: Table<LocalSyncChange, number>;
  syncMeta!: Table<LocalSyncMeta, string>;
  conflicts!: Table<LocalConflict, string>;
  learningProgress!: Table<LocalLearningProgress, string>;

  constructor(databaseName: string) {
    super(databaseName);

    // VERSION 1
    this.version(1).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      syncQueue:
        "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key",
    });

    // VERSION 2
    this.version(2).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      folders: "id, name, updatedAt, syncStatus",
      syncQueue:
        "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key",
    });

    // VERSION 3
    this.version(3).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      folders: "id, name, updatedAt, syncStatus",
      syncQueue:
        "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key",
      conflicts:
        "id, &[entityType+entityId], entityType, entityId, detectedAt",
    });

    // VERSION 4 — NOTE AND FOLDER VERSIONING
    this.version(4)
      .stores({
        notes: "id, folderId, updatedAt, syncStatus",
        packs: "id, category, language",
        folders: "id, name, updatedAt, syncStatus",
        syncQueue:
          "++id, &clientMutationId, [entityType+entityId], createdAt, status",
        syncMeta: "key",
        conflicts:
          "id, &[entityType+entityId], entityType, entityId, detectedAt",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table("notes")
          .toCollection()
          .modify((note: LocalNote) => {
            note.version ??= 1;
          });

        await transaction
          .table("folders")
          .toCollection()
          .modify((folder: LocalFolder) => {
            folder.version ??= 1;
          });
      });

    // VERSION 5 — OFFLINE LEARNING PROGRESS
    this.version(5).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      folders: "id, name, updatedAt, syncStatus",
      syncQueue:
        "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key",
      conflicts:
        "id, &[entityType+entityId], entityType, entityId, detectedAt",
      learningProgress:
        "packId, status, updatedAt, syncStatus",
    });
  }
}

// =====================================
// ACTIVE DATABASE
// =====================================

// The original database is retained as a legacy database.
// It is never automatically assigned to a new account.

export let db = new MindVaultDatabase("MindVaultDatabase");

let activeUserId: string | null = null;

let databaseSwitchPromise: Promise<void> = Promise.resolve();

// =====================================
// ACTIVE DATABASE USAGE PROTECTION
// =====================================

let activeDatabaseUsers = 0;

let pendingDatabaseSwitches = 0;

let resolveDatabaseUsage: (() => void) | null = null;

// Wait until all active database operations finish.

const waitForDatabaseUsageToFinish = async (): Promise<void> => {
  if (activeDatabaseUsers === 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    resolveDatabaseUsage = resolve;
  });
};

// =====================================
// INTERNAL DATABASE USAGE LEASE
// =====================================

const acquireUsageLease = (
  expectedUserId: string | null,
): (() => void) => {
  if (
    pendingDatabaseSwitches > 0 ||
    activeUserId !== expectedUserId ||
    (expectedUserId !== null && !db.isOpen())
  ) {
    throw new Error("The requested database is not available.");
  }

  activeDatabaseUsers += 1;

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;

    activeDatabaseUsers -= 1;

    if (
      activeDatabaseUsers === 0 &&
      resolveDatabaseUsage !== null
    ) {
      const resolve = resolveDatabaseUsage;

      resolveDatabaseUsage = null;

      resolve();
    }
  };
};

// =====================================
// ACQUIRE ACCOUNT DATABASE LEASE
// =====================================

export const acquireDatabaseLease = (
  userId: string,
): (() => void) => {
  if (
    typeof userId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(userId)
  ) {
    throw new Error("Invalid account ID for database lease.");
  }

  return acquireUsageLease(userId.toLowerCase());
};

// =====================================
// INITIALIZE ACCOUNT DATABASE
// =====================================

export const initializeUserDatabase = async (
  userId: string,
): Promise<void> => {
  if (
    typeof userId !== "string" ||
    !/^[a-fA-F0-9]{24}$/.test(userId)
  ) {
    throw new Error("Invalid account ID for local database.");
  }

  const normalizedUserId = userId.toLowerCase();

  const switchDatabase = async (): Promise<void> => {
    if (
      activeUserId === normalizedUserId &&
      db.isOpen()
    ) {
      return;
    }

    await waitForDatabaseUsageToFinish();

    db.close();

    const accountDatabase = new MindVaultDatabase(
      `MindVaultDatabase_${normalizedUserId}`,
    );

    db = accountDatabase;

    try {
      await accountDatabase.open();

      activeUserId = normalizedUserId;
    } catch (error) {
      accountDatabase.close();

      activeUserId = null;

      throw error;
    }
  };

  pendingDatabaseSwitches += 1;

  const operation = databaseSwitchPromise
    .then(switchDatabase)
    .finally(() => {
      pendingDatabaseSwitches -= 1;
    });

  databaseSwitchPromise = operation.catch(() => undefined);

  await operation;
};

// =====================================
// CLOSE ACTIVE ACCOUNT DATABASE
// =====================================

export const closeUserDatabase = async (): Promise<void> => {
  pendingDatabaseSwitches += 1;

  const operation = databaseSwitchPromise
    .then(async () => {
      await waitForDatabaseUsageToFinish();

      db.close();

      activeUserId = null;

      db = new MindVaultDatabase("MindVaultDatabase_anonymous");
    })
    .finally(() => {
      pendingDatabaseSwitches -= 1;
    });

  databaseSwitchPromise = operation.catch(() => undefined);

  await operation;
};

// =====================================
// ACTIVE ACCOUNT IDENTIFICATION
// =====================================

export const getActiveDatabaseUserId = (): string | null => {
  return activeUserId;
};

// =====================================
// SAFE DATABASE OPERATION
// =====================================

export const withDatabaseLease = async <T>(
  operation: () => Promise<T>,
): Promise<T> => {
  while (pendingDatabaseSwitches > 0) {
    await databaseSwitchPromise;
  }

  await databaseSwitchPromise;

  const releaseLease = acquireUsageLease(activeUserId);

  try {
    return await operation();
  } finally {
    releaseLease();
  }
};

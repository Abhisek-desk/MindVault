
import Dexie from "dexie";
import type { Table } from "dexie";

// =====================================
// LOCAL NOTE TYPE
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

// =====================================
// LOCAL FOLDER TYPE
// =====================================

export interface LocalFolder {
  id: string;
  name: string;
  color: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: "synced" | "pending" | "conflict";
}

// =====================================
// LOCAL KNOWLEDGE PACK TYPE
// =====================================

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

// =====================================
// SYNC QUEUE TYPE
// =====================================

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

// =====================================
// SYNC METADATA TYPE
// =====================================

export interface LocalSyncMeta {
  key: string;
  value: string;
}

// =====================================
// LOCAL CONFLICT TYPE
// =====================================

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
// MIND VAULT DATABASE
// =====================================

class MindVaultDatabase extends Dexie {
  notes!: Table<LocalNote, string>;
  packs!: Table<LocalPack, string>;
  folders!: Table<LocalFolder, string>;
  syncQueue!: Table<LocalSyncChange, number>;
  syncMeta!: Table<LocalSyncMeta, string>;
  conflicts!: Table<LocalConflict, string>;

  constructor() {
    super("MindVaultDatabase");

    // Database version 1
    this.version(1).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      syncQueue:
        "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key",
    });

    // Database version 2: Added folders
    this.version(2).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      folders: "id, name, updatedAt, syncStatus",
      syncQueue:
        "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key",
    });

    // Database version 3: Added conflict storage
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

    // Database version 4: Added OCC version tracking
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
        // Existing records predate OCC.
        // Version 1 is their initial server version.
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
  }
}

// =====================================
// DATABASE INSTANCE
// =====================================

export const db = new MindVaultDatabase();

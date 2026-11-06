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
// MIND VAULT DATABASE
// =====================================

class MindVaultDatabase extends Dexie {
  notes!: Table<LocalNote, string>;
  packs!: Table<LocalPack, string>;
  folders!: Table<LocalFolder, string>;
  syncQueue!: Table<LocalSyncChange, number>;
  syncMeta!: Table<LocalSyncMeta, string>;

  constructor() {
    super("MindVaultDatabase");

    // Database version 1
    this.version(1).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      syncQueue: "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key"
    });

    // Database version 2: Added folders
    this.version(2).stores({
      notes: "id, folderId, updatedAt, syncStatus",
      packs: "id, category, language",
      folders: "id, name, updatedAt, syncStatus",
      syncQueue: "++id, &clientMutationId, [entityType+entityId], createdAt, status",
      syncMeta: "key"
    });
  }
}

// =====================================
// DATABASE INSTANCE
// =====================================

export const db = new MindVaultDatabase();
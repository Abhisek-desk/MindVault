import { db, type LocalPack } from "./database";

// =====================================
// VALIDATE PACK ID
// =====================================

const validatePackId = (id: string): void => {
  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new Error("Invalid knowledge pack ID.");
  }
};

// =====================================
// VALIDATE PACK DATA
// =====================================

const validatePack = (pack: LocalPack): void => {
  validatePackId(pack.id);

  if (
    typeof pack.title !== "string" ||
    !pack.title.trim() ||
    pack.title.length > 150
  ) {
    throw new Error("Invalid knowledge pack title.");
  }

  if (
    typeof pack.description !== "string" ||
    pack.description.length > 1000
  ) {
    throw new Error("Invalid knowledge pack description.");
  }

  if (
    typeof pack.category !== "string" ||
    !pack.category.trim() ||
    pack.category.length > 100
  ) {
    throw new Error("Invalid knowledge pack category.");
  }

  if (
    typeof pack.language !== "string" ||
    !pack.language.trim() ||
    pack.language.length > 20
  ) {
    throw new Error("Invalid knowledge pack language.");
  }

  if (
    typeof pack.version !== "string" ||
    !pack.version.trim() ||
    pack.version.length > 50
  ) {
    throw new Error("Invalid knowledge pack version.");
  }

  if (
    !Number.isSafeInteger(pack.fileSizeBytes) ||
    pack.fileSizeBytes < 0
  ) {
    throw new Error("Invalid knowledge pack file size.");
  }

  if (
    typeof pack.downloadedAt !== "string" ||
    Number.isNaN(Date.parse(pack.downloadedAt))
  ) {
    throw new Error("Invalid knowledge pack download date.");
  }

  if (
    pack.contentBlob !== undefined &&
    !(pack.contentBlob instanceof Blob)
  ) {
    throw new Error("Invalid knowledge pack content.");
  }
};

// =====================================
// SAVE DOWNLOADED PACK
// =====================================

export const saveLocalPack = async (
  pack: LocalPack,
): Promise<void> => {
  validatePack(pack);
  await db.packs.put(pack);
};

// =====================================
// GET ALL DOWNLOADED PACKS
// =====================================

export const getLocalPacks = async (): Promise<LocalPack[]> => {
  return db.packs.toArray();
};

// =====================================
// GET SINGLE DOWNLOADED PACK
// =====================================

export const getLocalPackById = async (
  id: string,
): Promise<LocalPack | undefined> => {
  validatePackId(id);
  return db.packs.get(id);
};

// =====================================
// CHECK WHETHER PACK IS DOWNLOADED
// =====================================

export const isPackDownloaded = async (
  id: string,
): Promise<boolean> => {
  validatePackId(id);
  return (await db.packs.get(id)) !== undefined;
};

// =====================================
// DELETE DOWNLOADED PACK
// =====================================

export const deleteLocalPack = async (
  id: string,
): Promise<void> => {
  validatePackId(id);
  await db.packs.delete(id);
};

// =====================================
// GET TOTAL DOWNLOADED PACK COUNT
// =====================================

export const getLocalPackCount = async (): Promise<number> => {
  return db.packs.count();
};
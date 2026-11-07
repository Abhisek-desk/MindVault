import { db, type LocalPack } from "./database";

// =====================================
// SAVE DOWNLOADED PACK
// =====================================

export const saveLocalPack = async (
  pack: LocalPack,
): Promise<void> => {
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
  return db.packs.get(id);
};

// =====================================
// CHECK WHETHER PACK IS DOWNLOADED
// =====================================

export const isPackDownloaded = async (
  id: string,
): Promise<boolean> => {
  return (await db.packs.get(id)) !== undefined;
};

// =====================================
// DELETE DOWNLOADED PACK
// =====================================

export const deleteLocalPack = async (
  id: string,
): Promise<void> => {
  await db.packs.delete(id);
};

// =====================================
// GET TOTAL DOWNLOADED PACK COUNT
// =====================================

export const getLocalPackCount = async (): Promise<number> => {
  return db.packs.count();
};
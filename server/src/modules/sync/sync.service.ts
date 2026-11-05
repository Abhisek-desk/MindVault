import mongoose from "mongoose";
import { SyncChange } from "./sync.model";

type SyncEntityType = "note" | "folder";

type SyncOperation = "create" | "update" | "delete";

interface RecordSyncChangeInput {
  userId: string | mongoose.Types.ObjectId;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  data?: Record<string, unknown>;
  clientMutationId?: string;
}

export const recordSyncChange = async (
  change: RecordSyncChangeInput,
  session?: mongoose.ClientSession
): Promise<void> => {
  const syncChange = new SyncChange({
    userId: change.userId,
    entityType: change.entityType,
    entityId: change.entityId,
    operation: change.operation,
    ...(change.data !== undefined
      ? { data: change.data }
      : {}),
    ...(change.clientMutationId !== undefined
      ? { clientMutationId: change.clientMutationId }
      : {})
  });

  await syncChange.save(
    session ? { session } : undefined
  );
};
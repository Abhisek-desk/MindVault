import mongoose, { Schema, Document } from "mongoose";

export interface ISyncChange extends Document {
  userId: mongoose.Types.ObjectId;

  entityType: "note" | "folder";

  entityId: string;

  operation: "create" | "update" | "delete";

  data?: Record<string, unknown>;

  clientMutationId?: string;

  createdAt: Date;
}

const syncChangeSchema = new Schema<ISyncChange>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    entityType: {
      type: String,
      enum: ["note", "folder"],
      required: true
    },

    entityId: {
      type: String,
      required: true
    },

    operation: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true
    },

    data: {
      type: Schema.Types.Mixed,
      default: undefined
    },

    clientMutationId: {
      type: String,
      default: undefined
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    }
  }
);

// Efficiently retrieve changes belonging to one user.
syncChangeSchema.index({
  userId: 1,
  _id: 1
});

// Prevent duplicate client operations.
syncChangeSchema.index(
  {
    userId: 1,
    clientMutationId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      clientMutationId: { $type: "string" }
    }
  }
);

export const SyncChange = mongoose.model<ISyncChange>(
  "SyncChange",
  syncChangeSchema
);
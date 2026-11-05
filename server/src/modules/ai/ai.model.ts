import mongoose, { Schema, Document } from "mongoose";

export interface IAIMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface IAIConversation extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: IAIMessage[];
}

const messageSchema = new Schema<IAIMessage>(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },

    content: {
      type: String,
      required: true,
      maxlength: 10000
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: true
  }
);

const aiConversationSchema = new Schema<IAIConversation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "New Conversation"
    },

    messages: {
      type: [messageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

aiConversationSchema.index({
  userId: 1,
  updatedAt: -1
});

export const AIConversation = mongoose.model<IAIConversation>(
  "AIConversation",
  aiConversationSchema
);
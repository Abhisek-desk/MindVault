import { Request, Response } from "express";

import { AIConversation } from "./ai.model";
import { generateAIResponse } from "./ai.service";
import {
  retrieveRelevantNotes,
  RetrievedNote
} from "./knowledge-retrieval.service";

import {
  conversationIdSchema,
  createConversationSchema,
  sendMessageSchema,
} from "./ai.validation";

// Create a new conversation.
export const createConversation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const validation = createConversationSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid conversation data",
        errors: validation.error.issues,
      });
      return;
    }

    const conversation = await AIConversation.create({
      userId,
      title: validation.data.title || "New Conversation",
      messages: [],
    });

    res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    console.error("Create conversation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create conversation",
    });
  }
};

// Get all conversations belonging to the user.
export const getConversations = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const conversations = await AIConversation.find({ userId })
      .select("title createdAt updatedAt")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve conversations",
    });
  }
};

// Get one conversation with its messages.
export const getConversationById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const validation = conversationIdSchema.safeParse({
      id: req.params.id,
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
      return;
    }

    const conversation = await AIConversation.findOne({
      _id: validation.data.id,
      userId,
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve conversation",
    });
  }
};

// Delete a conversation.
export const deleteConversation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const validation = conversationIdSchema.safeParse({
      id: req.params.id,
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
      return;
    }

    const conversation = await AIConversation.findOneAndDelete({
      _id: validation.data.id,
      userId,
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete conversation",
    });
  }
};

// Send a message and receive an AI response.
export const sendMessage = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const idValidation = conversationIdSchema.safeParse({
      id: req.params.id,
    });

    if (!idValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid conversation ID",
      });
      return;
    }

    const bodyValidation = sendMessageSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid message",
        errors: bodyValidation.error.issues,
      });
      return;
    }

    const conversation = await AIConversation.findOne({
      _id: idValidation.data.id,
      userId,
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
      return;
    }

    const userMessage = bodyValidation.data.message;

    // Use the latest 20 messages as conversation context.
    const history = conversation.messages.slice(-20).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    // Retrieve relevant notes belonging to this user.
    let relevantNotes: RetrievedNote[] = [];

    try {
      relevantNotes = await retrieveRelevantNotes(
        userId,
        userMessage
      );
    } catch (error) {
      console.error(
        "Knowledge retrieval failed. Continuing without personal notes:",
        error
      );
    }

    // Generate an AI response using personal knowledge.
    const aiResponse = await generateAIResponse(
      userMessage,
      history,
      relevantNotes,
    );

    // Save both messages only after successful AI generation.
    conversation.messages.push({
      role: "user",
      content: userMessage,
      createdAt: new Date(),
    });

    conversation.messages.push({
      role: "assistant",
      content: aiResponse,
      createdAt: new Date(),
    });

    // Automatically generate a title from the first message.
    if (
      conversation.title === "New Conversation" &&
      conversation.messages.length === 2
    ) {
      conversation.title =
        userMessage.length > 45
          ? `${userMessage.substring(0, 45)}...`
          : userMessage;
    }

    await conversation.save();

    res.status(200).json({
      success: true,
      message: "AI response generated successfully",
      conversationId: conversation._id,
      userMessage,
      aiResponse,
    });
  } catch (error) {
    console.error("AI message error:", error);

    res.status(502).json({
      success: false,
      message: "AI service is temporarily unavailable. Please try again.",
    });
  }
};
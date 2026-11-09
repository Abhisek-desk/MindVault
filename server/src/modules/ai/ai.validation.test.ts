import { describe, it, expect } from "vitest";

import {
  conversationIdSchema,
  createConversationSchema,
  sendMessageSchema,
} from "./ai.validation";

describe("AI Validation", () => {
  describe("Conversation ID", () => {
    it("accepts a valid MongoDB ID", () => {
      expect(
        conversationIdSchema.safeParse({
          id: "507f1f77bcf86cd799439011",
        }).success
      ).toBe(true);
    });

    it("rejects an invalid ID", () => {
      expect(
        conversationIdSchema.safeParse({
          id: "invalid-id",
        }).success
      ).toBe(false);
    });
  });

  describe("Create Conversation", () => {
    it("accepts a valid title", () => {
      expect(
        createConversationSchema.safeParse({
          title: "Learning React",
        }).success
      ).toBe(true);
    });

    it("accepts an omitted title", () => {
      expect(
        createConversationSchema.safeParse({}).success
      ).toBe(true);
    });

    it("rejects an empty title", () => {
      expect(
        createConversationSchema.safeParse({
          title: "   ",
        }).success
      ).toBe(false);
    });

    it("rejects a title longer than 150 characters", () => {
      expect(
        createConversationSchema.safeParse({
          title: "a".repeat(151),
        }).success
      ).toBe(false);
    });
  });

  describe("Send Message", () => {
    it("accepts a valid message", () => {
      expect(
        sendMessageSchema.safeParse({
          message: "Explain React hooks",
        }).success
      ).toBe(true);
    });

    it("rejects an empty message", () => {
      expect(
        sendMessageSchema.safeParse({
          message: "   ",
        }).success
      ).toBe(false);
    });

    it("rejects messages exceeding 10,000 characters", () => {
      expect(
        sendMessageSchema.safeParse({
          message: "a".repeat(10001),
        }).success
      ).toBe(false);
    });

    it("rejects unexpected properties", () => {
      expect(
        sendMessageSchema.safeParse({
          message: "Hello",
          admin: true,
        }).success
      ).toBe(false);
    });
  });
});
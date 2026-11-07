import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

import connectDB from "../config/database";
import { KnowledgePack } from "../modules/knowledge-packs/knowledge-pack.model";

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

// Base URL of the Mind Vault backend
const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

const knowledgePacks = [
  {
    title: "Web Development Fundamentals",
    description:
      "Learn HTML, CSS, responsive design and the fundamentals of building websites.",
    category: "Web Development",
    language: "en",
    version: "1.0.0",
    downloadUrl: `${SERVER_URL}/downloads/web-development.zip`,
    fileSizeBytes: 1543,
    tags: ["HTML", "CSS", "Web Development", "Frontend"],
    isPublished: true
  },
  {
    title: "JavaScript Complete Guide",
    description:
      "Understand JavaScript fundamentals, functions, objects, arrays and asynchronous programming.",
    category: "Programming",
    language: "en",
    version: "1.0.0",
    downloadUrl: `${SERVER_URL}/downloads/javascript.zip`,
    fileSizeBytes: 1686,
    tags: ["JavaScript", "Programming", "ES6"],
    isPublished: true
  },
  {
    title: "Python Programming Basics",
    description:
      "A beginner-friendly introduction to Python programming.",
    category: "Programming",
    language: "en",
    version: "1.0.0",
    downloadUrl: `${SERVER_URL}/downloads/python.zip`,
    fileSizeBytes: 1289,
    tags: ["Python", "Programming", "Beginner"],
    isPublished: true
  },
  {
    title: "Data Structures and Algorithms",
    description:
      "Explore arrays, linked lists, stacks, queues, trees and algorithms.",
    category: "Computer Science",
    language: "en",
    version: "1.0.0",
    downloadUrl: `${SERVER_URL}/downloads/dsa.zip`,
    fileSizeBytes: 1557,
    tags: ["DSA", "Algorithms", "Data Structures"],
    isPublished: true
  },
  {
    title: "Computer Science Fundamentals",
    description:
      "Learn essential computer science concepts and computing fundamentals.",
    category: "Computer Science",
    language: "en",
    version: "1.0.0",
    downloadUrl: `${SERVER_URL}/downloads/computer-science.zip`,
    fileSizeBytes: 1326,
    tags: ["Computer Science", "Computing", "Fundamentals"],
    isPublished: true
  }
];

const seedKnowledgePacks = async (): Promise<void> => {
  try {
    await connectDB();

    for (const pack of knowledgePacks) {
      await KnowledgePack.updateOne(
        { title: pack.title },
        { $set: pack },
        { upsert: true }
      );

      console.log(`Updated: ${pack.title}`);
    }

    console.log("\nKnowledge Packs seeded successfully!");
    console.log(`Total sample packs: ${knowledgePacks.length}`);
  } catch (error) {
    console.error("Knowledge Pack seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedKnowledgePacks();
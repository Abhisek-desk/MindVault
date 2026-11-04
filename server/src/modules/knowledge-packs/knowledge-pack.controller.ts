import { Request, Response } from "express";
import { KnowledgePack } from "./knowledge-pack.model";
import {
  getKnowledgePacksSchema,
  knowledgePackIdSchema
} from "./knowledge-pack.validation";

// Get all published Knowledge Packs
export const getKnowledgePacks = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validation = getKnowledgePacksSchema.safeParse(req.query);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid search parameters",
        errors: validation.error.flatten()
      });
      return;
    }

    const {
      category,
      language,
      search,
      page,
      limit
    } = validation.data;

    const filter: Record<string, unknown> = {
      isPublished: true
    };

    if (category) {
      filter.category = category;
    }

    if (language) {
      filter.language = language;
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex }
      ];
    }

    const skip = (page - 1) * limit;

    const [packs, total] = await Promise.all([
      KnowledgePack.find(filter)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      KnowledgePack.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      count: packs.length,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      packs
    });
  } catch (error) {
    console.error("Get Knowledge Packs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch Knowledge Packs"
    });
  }
};

// Get one published Knowledge Pack
export const getKnowledgePackById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validation = knowledgePackIdSchema.safeParse(req.params);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Invalid Knowledge Pack ID"
      });
      return;
    }

    const pack = await KnowledgePack.findOne({
      _id: validation.data.id,
      isPublished: true
    }).select("-__v");

    if (!pack) {
      res.status(404).json({
        success: false,
        message: "Knowledge Pack not found"
      });
      return;
    }

    res.status(200).json({
      success: true,
      pack
    });
  } catch (error) {
    console.error("Get Knowledge Pack error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch Knowledge Pack"
    });
  }
};
import { Router } from "express";

import {
createNote,
getNotes,
updateNote,
deleteNote
} from "./note.controller";

import { protect } from "../../middleware/auth.middleware";

const router = Router();

// All note routes require login
router.use(protect);
    
router.post("/", createNote);
router.get("/", getNotes);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

export default router;

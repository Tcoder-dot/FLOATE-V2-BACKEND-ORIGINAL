import { Router } from "express";
import { searchVendorsController } from "../controllers/searchController";

const router = Router();

// GET & POST /api/search
router.get("/api/search", searchVendorsController);
router.post("/api/search", searchVendorsController);

export default router;

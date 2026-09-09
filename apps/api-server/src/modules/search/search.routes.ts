import { Router } from "express";
import { searchController } from "@/modules/search/search.controller";
import { requireAuth, requirePermission } from "@/lib/auth";
import { Permission } from "@/shared/constants/permissions";

const router = Router();
router.use(requireAuth);

router.get(
  "/search",
  requirePermission(Permission.READ_CONTENT),
  searchController.search.bind(searchController),
);

export default router;

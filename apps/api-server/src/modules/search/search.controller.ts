import type { Request, Response, NextFunction } from "express";
import { searchService } from "@/modules/search/search.service";

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = String(req.query["q"] ?? "").trim();
      if (!q) { res.json({ data: { query: "", results: [], total: 0, took: 0 } }); return; }

      const result = await searchService.search({
        q,
        types: req.query["types"]
          ? String(req.query["types"]).split(",") as never
          : undefined,
        page: Number(req.query["page"]) || 1,
        limit: Math.min(Number(req.query["limit"]) || 20, 50),
      });

      res.json({ data: result });
    } catch (err) { next(err); }
  }
}

export const searchController = new SearchController();

import express, { type Express } from "express";
import cors from "cors";
import router from "@/routes";
import { errorMiddleware, notFoundMiddleware } from "@/shared/middleware";
import {
  helmetMiddleware,
  rateLimitMiddleware,
  requestSizeLimit,
  corsOptions,
  securityHeaders,
} from "@/middleware/security";

const app: Express = express();

// Security middleware (must be first)
app.use(helmetMiddleware);
app.use(securityHeaders);

// CORS
app.use(cors(corsOptions));

// Rate limiting
app.use(rateLimitMiddleware);

// Body parsing with size limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Additional request size limit
app.use(requestSizeLimit);

// API routes
app.use("/api", router);

// 404 → must come after all routes
app.use(notFoundMiddleware);

// Global error handler → must be last
app.use(errorMiddleware);

export default app;

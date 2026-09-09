import "reflect-metadata";
import { vi } from "vitest";

(globalThis as typeof globalThis & { jest: typeof vi }).jest = vi;

// Setup file for vitest to mock database for unit tests
process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-key-for-testing-purposes-only";
process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
process.env.JWT_SECRET = "test-secret-key-for-testing-purposes-only";

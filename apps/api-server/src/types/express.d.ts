import type { Logger } from "pino";

declare module "express" {
  interface Request {
    id?: string;
    log?: Logger;
  }
}

declare global {
  namespace Express {
    interface Request {
      webSessionId?: string;
    }
  }
}

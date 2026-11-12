import { randomUUID } from "node:crypto";

export type GlobalUserStatus = "active" | "suspended" | "deleted";

export interface LegacyUserState {
  id: string;
  status: string;
  isActive: boolean;
  isBlocked: boolean;
  deletedAt: Date | null;
}

export class GlobalUser {
  private constructor(
    readonly id: string,
    readonly status: GlobalUserStatus,
  ) {}

  static create(id = randomUUID()): GlobalUser {
    if (!id.trim()) {
      throw new Error("Global user ID must not be empty");
    }

    return new GlobalUser(id, "active");
  }

  static fromLegacy(state: LegacyUserState): GlobalUser {
    if (state.deletedAt) {
      return new GlobalUser(state.id, "deleted");
    }

    const active =
      state.status.trim().toLowerCase() === "active" &&
      state.isActive &&
      !state.isBlocked;
    return new GlobalUser(state.id, active ? "active" : "suspended");
  }

  get canAuthenticate(): boolean {
    return this.status === "active";
  }

  suspend(): GlobalUser {
    if (this.status !== "active") {
      throw new Error("Only an active user can be suspended");
    }

    return new GlobalUser(this.id, "suspended");
  }

  reactivate(): GlobalUser {
    if (this.status !== "suspended") {
      throw new Error("Only a suspended user can be reactivated");
    }

    return new GlobalUser(this.id, "active");
  }

  delete(): GlobalUser {
    if (this.status === "deleted") {
      return this;
    }

    return new GlobalUser(this.id, "deleted");
  }
}

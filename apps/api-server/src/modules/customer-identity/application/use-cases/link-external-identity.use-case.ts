import { ExternalIdentity } from "../../domain/entities/external-identity.entity";
import {
  AccountUnavailableError,
  CurrentAccountProofRequiredError,
  ExternalIdentityAlreadyOwnedError,
  ExternalIdentityConflictError,
} from "../errors/customer-identity.errors";
import type {
  CustomerIdentityUnitOfWork,
  ExternalIdentityProofVerifier,
} from "../ports/customer-identity.unit-of-work";

export class LinkExternalIdentityUseCase<TProof = unknown> {
  constructor(
    private readonly unitOfWork: CustomerIdentityUnitOfWork,
    private readonly proofVerifier: ExternalIdentityProofVerifier<TProof>,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    proof: TProof;
  }): Promise<void> {
    if (!input.userId.trim() || !input.sessionId.trim()) {
      throw new CurrentAccountProofRequiredError();
    }

    const verifiedProof = await this.proofVerifier.verify(input.proof);
    const identity = ExternalIdentity.fromVerifiedProof(
      input.userId,
      verifiedProof,
    );

    await this.unitOfWork.transaction(async (transaction) => {
      const currentUser = await transaction.findById(input.userId);
      if (!currentUser?.user.canAuthenticate) {
        throw new AccountUnavailableError();
      }
      if (
        !(await transaction.hasActiveWebSession(input.userId, input.sessionId))
      ) {
        throw new CurrentAccountProofRequiredError();
      }

      const existing = await transaction.findExternalIdentity(identity);
      if (existing) {
        if (existing.userId === input.userId) {
          if (
            existing.provider === identity.provider &&
            existing.subject === identity.subject &&
            existing.issuer === identity.issuer
          ) {
            return;
          }
          throw new ExternalIdentityConflictError();
        }
        if (existing.userId !== input.userId) {
          throw new ExternalIdentityAlreadyOwnedError();
        }
      }

      if (
        currentUser.externalIdentity &&
        currentUser.externalIdentity.provider === identity.provider
      ) {
        if (
          currentUser.externalIdentity.subject === identity.subject &&
          currentUser.externalIdentity.issuer === identity.issuer
        ) {
          return;
        }
        throw new ExternalIdentityConflictError();
      }

      try {
        await transaction.attachExternalIdentity(identity);
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          throw new ExternalIdentityAlreadyOwnedError();
        }
        throw error;
      }
    });
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "23505" ||
    !("constraint" in error) ||
    typeof error.constraint !== "string"
  ) {
    return false;
  }

  return /users_telegram_id_(key|unique)/i.test(error.constraint);
}

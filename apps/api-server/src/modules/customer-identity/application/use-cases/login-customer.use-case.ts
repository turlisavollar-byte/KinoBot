import { EmailIdentity } from "../../domain/entities/email-identity.entity";
import { PasswordCredential } from "../../domain/entities/password-credential.entity";
import {
  AccountUnavailableError,
  InvalidCredentialsError,
} from "../errors/customer-identity.errors";
import type {
  CustomerIdentityRecord,
  CustomerIdentityUnitOfWork,
  PasswordVerifier,
} from "../ports/customer-identity.unit-of-work";

export class LoginCustomerUseCase {
  constructor(
    private readonly unitOfWork: CustomerIdentityUnitOfWork,
    private readonly passwordVerifier: PasswordVerifier,
  ) {}

  async execute(input: {
    email: string;
    password: string;
  }): Promise<CustomerIdentityRecord> {
    const email = EmailIdentity.normalizeAddress(input.email);
    const record = await this.unitOfWork.findByEmail(email);
    const credential = record?.passwordCredential;
    if (!record || !credential || !record.emailIdentity) {
      throw new InvalidCredentialsError();
    }
    if (!record.user.canAuthenticate) {
      throw new AccountUnavailableError();
    }

    const passwordMatches = await this.passwordVerifier.verify(
      input.password,
      credential.hash,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsError();
    }

    const replacementPasswordHash =
      credential.format === "legacy-sha256"
        ? await this.passwordVerifier.hash(input.password)
        : undefined;
    const updated = await this.unitOfWork.transaction((transaction) =>
      transaction.recordSuccessfulLogin(
        record.user.id,
        credential.hash,
        new Date(),
        replacementPasswordHash,
      ),
    );
    if (!updated) {
      throw new InvalidCredentialsError();
    }

    return replacementPasswordHash
      ? {
          ...record,
          passwordCredential: PasswordCredential.create(
            record.user.id,
            replacementPasswordHash,
          ),
        }
      : record;
  }
}

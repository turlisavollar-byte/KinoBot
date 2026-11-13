import { EmailIdentity } from "../../domain/entities/email-identity.entity";
import { GlobalUser } from "../../domain/entities/global-user.entity";
import { PasswordCredential } from "../../domain/entities/password-credential.entity";
import { EmailAlreadyExistsError } from "../errors/customer-identity.errors";
import type {
  CustomerIdentityRecord,
  CustomerIdentityUnitOfWork,
  PasswordVerifier,
} from "../ports/customer-identity.unit-of-work";

export interface RegisterCustomerInput {
  email: string;
  name: string;
  password: string;
}

export class RegisterCustomerUseCase {
  constructor(
    private readonly unitOfWork: CustomerIdentityUnitOfWork,
    private readonly passwordVerifier: PasswordVerifier,
  ) {}

  async execute(input: RegisterCustomerInput): Promise<CustomerIdentityRecord> {
    const normalizedEmail = EmailIdentity.normalizeAddress(input.email);
    const name = input.name.trim();
    if (!name || name.length > 120) {
      throw new Error("Name must contain between 1 and 120 characters");
    }
    if (input.password.length < 12 || input.password.length > 128) {
      throw new Error("Password must contain between 12 and 128 characters");
    }

    const user = GlobalUser.create();
    const emailIdentity = EmailIdentity.create(
      user.id,
      normalizedEmail,
      "unverified",
    );
    const passwordCredential = PasswordCredential.create(
      user.id,
      await this.passwordVerifier.hash(input.password),
    );
    const record: CustomerIdentityRecord = {
      user,
      displayName: name,
      emailIdentity,
      externalIdentity: null,
      passwordCredential,
    };

    return this.unitOfWork.transaction(async (transaction) => {
      if (await transaction.findByEmail(normalizedEmail)) {
        throw new EmailAlreadyExistsError();
      }

      try {
        return await transaction.createRegisteredCustomer(record);
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          throw new EmailAlreadyExistsError();
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

  return /(?:users_(email|email_case_insensitive)_.*(key|unique|idx)|user_identities_active_provider_subject_uidx)/i.test(
    error.constraint,
  );
}

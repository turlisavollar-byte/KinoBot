export class EmailAlreadyExistsError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailAlreadyExistsError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
    this.name = "InvalidCredentialsError";
  }
}

export class AccountUnavailableError extends Error {
  constructor() {
    super("Account is unavailable");
    this.name = "AccountUnavailableError";
  }
}

export class CurrentAccountProofRequiredError extends Error {
  constructor() {
    super("A current authenticated customer session is required");
    this.name = "CurrentAccountProofRequiredError";
  }
}

export class InvalidExternalIdentityProofError extends Error {
  constructor() {
    super("External identity proof is invalid or expired");
    this.name = "InvalidExternalIdentityProofError";
  }
}

export class ExternalIdentityAlreadyOwnedError extends Error {
  constructor() {
    super("External identity is already linked to an account");
    this.name = "ExternalIdentityAlreadyOwnedError";
  }
}

export class ExternalIdentityConflictError extends Error {
  constructor() {
    super("An identity for this provider is already linked to this account");
    this.name = "ExternalIdentityConflictError";
  }
}

export class UnsupportedExternalIdentityProviderError extends Error {
  constructor(provider: string) {
    super(`External identity provider '${provider}' is not supported`);
    this.name = "UnsupportedExternalIdentityProviderError";
  }
}

export class ExternalIdentityProofConfigurationError extends Error {
  constructor() {
    super("Telegram identity verification is not configured");
    this.name = "ExternalIdentityProofConfigurationError";
  }
}

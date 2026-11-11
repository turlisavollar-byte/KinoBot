import { ValidationError } from "@/shared/errors/AppError";

export type BroadcastRecipientType = "users" | "all_users" | "channels";

export interface BroadcastAudience {
  recipientType: BroadcastRecipientType;
  recipients: string[];
  targetAudience: string;
}

export function resolveBroadcastAudience(
  recipientType: BroadcastRecipientType,
  inputRecipients: string[] = [],
): BroadcastAudience {
  const recipients = [...new Set(inputRecipients.map((id) => id.trim()).filter(Boolean))];

  if (recipientType === "channels") {
    if (recipients.length === 0) {
      throw new ValidationError("At least one Telegram channel is required");
    }
    return {
      recipientType,
      recipients,
      targetAudience: JSON.stringify({ type: "channels", ids: recipients }),
    };
  }

  if (recipientType === "all_users") {
    return { recipientType, recipients: [], targetAudience: "all" };
  }

  if (recipients.length === 0) {
    throw new ValidationError("At least one Telegram user ID is required");
  }

  return {
    recipientType,
    recipients,
    targetAudience: JSON.stringify(recipients),
  };
}

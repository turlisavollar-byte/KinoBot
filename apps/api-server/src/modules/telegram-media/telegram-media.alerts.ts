export interface TelegramAlertSender {
  sendMessage(chatId: string, text: string): Promise<unknown>;
}

export async function sendTelegramMediaFailureAlert(
  sender: TelegramAlertSender,
  destination: string,
  jobId: string,
): Promise<void> {
  const chatId = destination.trim();
  if (!chatId) throw new Error("Telegram media alert destination is not configured");
  await sender.sendMessage(
    chatId,
    `ALERT: Telegram media upload exhausted its retries. Job: ${jobId}`,
  );
}

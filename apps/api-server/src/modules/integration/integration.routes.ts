import { Router } from "express";

const router = Router();

/**
 * Integration / Webhook endpoints
 *
 * Payment providers (Payme, Click, Uzum Bank) send callbacks here.
 * These routes are PUBLIC (no requireAuth) — signed with provider secret.
 *
 * TODO: Implement HMAC signature verification per provider.
 */

// Payme (Uzbekistan payment provider)
router.post("/webhooks/payme", (_req, res) => {
  // TODO: verify Payme Basic Auth header, process transaction
  res.json({ result: null });
});

// Click (Uzbekistan payment provider)
router.post("/webhooks/click", (_req, res) => {
  // TODO: verify Click sign, process prepare/complete
  res.json({ error: 0, error_note: "Success" });
});

// Uzum Bank
router.post("/webhooks/uzum", (_req, res) => {
  // TODO: verify Uzum signature, process payment
  res.json({ code: 0 });
});

// Generic webhook (for future 3rd party integrations)
router.post("/webhooks/:provider", (req, res) => {
  res.status(501).json({
    error: { code: "NOT_IMPLEMENTED", message: `Provider '${req.params["provider"]}' not yet configured` },
  });
});

export default router;

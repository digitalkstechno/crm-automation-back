const express = require("express");
const router = express.Router();
const whatsappController = require("../controller/whatsappWebhook");

// Webhook Verification (GET handshake)
router.get("/webhook", whatsappController.verifyWebhook);

// Webhook Events (POST messages/status updates)
router.post("/webhook", whatsappController.handleWebhook);

module.exports = router;

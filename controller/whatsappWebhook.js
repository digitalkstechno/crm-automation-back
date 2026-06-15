const axios = require("axios");
const Lead = require("../model/lead");
const LeadStatus = require("../model/leadStatus");
const LeadSource = require("../model/leadSources");
const Staff = require("../model/staff");
const Setting = require("../model/setting");
const { incrementCount } = require("../utils/leadCountHelper");

/**
 * GET /v1/api/whatsapp-webhook/webhook
 * Handles the verification handshake from Meta (Facebook/WhatsApp Dev Console)
 */
exports.verifyWebhook = async (req, res) => {
  console.log("🔍 GET verifyWebhook incoming query params:", JSON.stringify(req.query));
  
  const mode = req.query['hub.mode'] || req.query.mode;
  const token = req.query['hub.verify_token'] || req.query.verify_token || req.query.token;
  let challenge = req.query['challange'] || req.query['hub.challenge'] || req.query['challenge'];

  // Handle case where multiple challenge parameters are sent (Express makes it an array)
  if (Array.isArray(challenge)) {
    challenge = challenge[challenge.length - 1];
  }

  // Meta / Gateway verification logic
  if (challenge) {
    // Return the challenge as PLAIN TEXT
    res.set('Content-Type', 'text/plain');
    console.log(`✅ Webhook verified successfully by echoing challenge: ${challenge}`);
    return res.status(200).send(challenge);
  }

  // If it's a general ping with no challenge parameter
  res.set('Content-Type', 'text/plain');
  console.log("ℹ️ Received general Webhook verify ping (GET request).");
  return res.status(200).send("Webhook verification endpoint active!");
};

/**
 * POST /v1/api/whatsapp-webhook/webhook
 * Receives real-time incoming messages and notifications from Meta
 */
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    console.log("📩 Incoming WhatsApp Webhook event body:", JSON.stringify(body, null, 2));

    // 1. Check if it is a standard Meta WhatsApp API webhook payload
    if (body.object === "whatsapp_business_account") {
      if (body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              const value = change.value;

              // Check if we have incoming messages
              if (value && value.messages && value.messages.length > 0) {
                const contacts = value.contacts || [];

                for (const message of value.messages) {
                  // Ignore status update notifications (sent, delivered, read etc.)
                  if (message.type === "text" || message.button || message.interactive) {
                    const fromNumber = message.from; // Sender's phone number

                    // Retrieve sender's profile name if available, fallback to default
                    let profileName = "WhatsApp Lead";
                    if (contacts.length > 0) {
                      const matchedContact = contacts.find(c => c.wa_id === fromNumber);
                      if (matchedContact && matchedContact.profile && matchedContact.profile.name) {
                        profileName = matchedContact.profile.name;
                      }
                    }

                    // Extract the text content from the message
                    let messageText = "";
                    if (message.type === "text" && message.text) {
                      messageText = message.text.body || "";
                    } else if (message.type === "button" && message.button) {
                      messageText = message.button.text || "";
                    } else if (message.type === "interactive") {
                      if (message.interactive.button_reply) {
                        messageText = message.interactive.button_reply.title || "";
                      } else if (message.interactive.list_reply) {
                        messageText = message.interactive.list_reply.title || "";
                      }
                    }

                    console.log(`💬 Meta-style Msg received from ${profileName} (${fromNumber}): "${messageText}"`);

                    // Process message asynchronously so that we respond to Meta with a 200 OK immediately.
                    // Meta has a strict timeout policy for webhook responses.
                    processIncomingMessage(fromNumber, profileName, messageText).catch(err => {
                      console.error("❌ Error in async message processing:", err);
                    });
                  }
                }
              }
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    }

    // 2. Fallback: Check if it's a flat/simplified webhook payload (common in third-party integrations like CRMBot)
    // We look for common sender fields (from, phone, sender, contact) and message text
    const fromNumber = body.from || body.phone || body.sender || body.contact || (body.message && body.message.from);
    if (fromNumber) {
      const profileName = body.name || body.profileName || body.username || (body.contact && body.contact.name) || "WhatsApp Lead";
      let messageText = "";
      if (typeof body.text === "string") messageText = body.text;
      else if (body.text && typeof body.text.body === "string") messageText = body.text.body;
      else if (body.message && typeof body.message.text === "string") messageText = body.message.text;
      else if (body.message && body.message.text && typeof body.message.text.body === "string") messageText = body.message.text.body;
      else messageText = body.body || body.messageText || "";

      console.log(`💬 Third-party Msg received from ${profileName} (${fromNumber}): "${messageText}"`);

      // Process message asynchronously
      processIncomingMessage(fromNumber.toString(), profileName, messageText).catch(err => {
        console.error("❌ Error in async third-party message processing:", err);
      });
      return res.status(200).send("EVENT_RECEIVED");
    }

    console.warn("⚠️ Webhook event format unrecognized.");
    return res.status(200).send("UNRECOGNIZED_FORMAT");
  } catch (error) {
    console.error("❌ Error inside WhatsApp webhook handler:", error);
    return res.status(500).send("INTERNAL_SERVER_ERROR");
  }
};

/**
 * Normalizes text unicode-safely by removing all punctuation and collapsing spaces.
 */
function normalizeText(text) {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

/**
 * Handles database operations and keyword-template matching
 */
async function processIncomingMessage(contactNumber, profileName, messageText) {
  try {
    // 1. Format the contact number to match CRM standards (e.g. ensure 91 prefix for 10-digit Indian numbers)
    let formattedContact = contactNumber.replace(/\D/g, ""); // Keep only digits
    if (formattedContact.length === 10) {
      formattedContact = "91" + formattedContact;
    }

    // 2. Match message content against keywords to determine template trigger FIRST
    const cleanMsgText = messageText.trim().toLowerCase();
    console.log(`🔍 Checking keywords for clean text: "${cleanMsgText}"`);
    
    // Try to get keyword rules from settings database dynamically
    let keywordRules = null;
    const rulesSetting = await Setting.findOne({ key: "whatsapp_keyword_rules" });
    if (rulesSetting && rulesSetting.value) {
      keywordRules = rulesSetting.value;
      console.log(`📂 Loaded ${Object.keys(keywordRules).length} rules from MongoDB settings.`);
    } else {
      console.log("📂 MongoDB 'whatsapp_keyword_rules' setting is empty. Using fallback defaults.");
      // Fallback default keyword-to-template map if settings are not defined in DB
      // Default to language "en" and policy "deterministic" to match user's CRMBot curl
      keywordRules = {
        "hello": { template: "welcome_hello", lang: "en" },
        "hi": { template: "welcome_hello", lang: "en" },
        "hey": { template: "welcome_hello", lang: "en" },
        "price": { template: "price_details", lang: "en" },
        "cost": { template: "price_details", lang: "en" },
        "pricing": { template: "price_details", lang: "en" },
        "interested": { template: "campaign_interest", lang: "en" },
        "join": { template: "campaign_interest", lang: "en" }
      };
    }

    // Check if any keyword matches the message body exactly (normalized)
    let matchedRule = null;
    let matchedKeyword = null;
    const normalizedMsg = normalizeText(messageText);

    for (const keyword of Object.keys(keywordRules)) {
      const cleanKeyword = keyword.trim().toLowerCase();
      const normalizedKeyword = normalizeText(keyword);
      
      const isExactMatch = cleanMsgText === cleanKeyword;
      const isNormalizedMatch = normalizedMsg === normalizedKeyword;

      console.log(`   └─ Testing keyword match for "${keyword}": exact? ${isExactMatch ? "✅" : "❌"} | normalized? ${isNormalizedMatch ? "✅" : "❌"}`);

      if (isExactMatch || isNormalizedMatch) {
        matchedRule = keywordRules[keyword];
        matchedKeyword = keyword;
        break;
      }
    }

    // If no keyword matched, exit immediately without creating or modifying leads
    if (!matchedRule) {
      console.log(`❌ No keyword matched for incoming message: "${messageText}". Skipping lead processing and template sending.`);
      return;
    }

    // 3. Since a keyword matched, check if the lead already exists in our database
    const last10 = formattedContact.slice(-10);
    let existingLead = null;
    if (last10.length === 10) {
      existingLead = await Lead.findOne({
        $or: [
          { contact: formattedContact },
          { contact: last10 },
          { contact: "91" + last10 },
          { contact: new RegExp(last10 + "$") }
        ]
      });
    } else {
      existingLead = await Lead.findOne({ contact: formattedContact });
    }

    if (!existingLead) {
      console.log(`🆕 Creating new Lead for ${profileName} (${formattedContact})...`);

      // Find or create default LeadStatus ("New Lead" or first available)
      let status = await LeadStatus.findOne({ name: { $regex: /New Lead|New|Pending/i } });
      if (!status) status = await LeadStatus.findOne().sort({ order: 1 });
      if (!status) {
        status = await LeadStatus.create({ name: "New Lead", order: 1 });
      }

      // Find or create default LeadSource ("WhatsApp")
      let source = await LeadSource.findOne({ name: { $regex: /^whatsapp$/i } });
      if (!source) {
        const lastSource = await LeadSource.findOne().sort({ order: -1 });
        const nextOrder = lastSource ? (lastSource.order || 0) + 1 : 1;
        source = await LeadSource.create({ name: "WhatsApp", order: nextOrder });
      }

      // Find default active Staff to assign
      let staff = await Staff.findOne({ status: "active" });

      // Build lead object
      const leadData = {
        fullName: profileName,
        contact: formattedContact,
        email: `whatsapp_${formattedContact}@crm-leads.com`,
        companyName: "WhatsApp Inquirer",
        address: "WhatsApp Campaign",
        leadStatus: status._id,
        leadSource: source._id,
        note: `Generated via WhatsApp webhook.\nFirst Message: "${messageText}"`,
        priority: "medium",
        isActive: true
      };

      if (staff) {
        leadData.assignedTo = staff._id;
      }

      // Save to database
      existingLead = await Lead.create(leadData);

      // Increment stats count in helper
      await incrementCount({
        statusId: existingLead.leadStatus,
        sourceId: existingLead.leadSource
      });

      console.log(`✅ Lead successfully saved for ${profileName} (ID: ${existingLead._id})`);
    } else {
      console.log(`ℹ️ Lead already exists for ${profileName} (${formattedContact}). Appending note...`);

      // Update note to log the incoming campaign message history
      const timestamp = new Date().toLocaleString();
      const updatedNote = existingLead.note
        ? `${existingLead.note}\n\n[${timestamp}] Incoming WhatsApp msg: "${messageText}"`
        : `[${timestamp}] Incoming WhatsApp msg: "${messageText}"`;

      await Lead.findByIdAndUpdate(existingLead._id, { note: updatedNote });
    }

    // 4. Send WhatsApp template since keyword matched
    const templateName = matchedRule.template;
    const lang = matchedRule.lang || "en";
    
    // Resolve template parameters dynamically
    const parameters = [];
    if (matchedRule.parameters && Array.isArray(matchedRule.parameters)) {
      matchedRule.parameters.forEach(param => {
        let textVal = param;
        // Replace dynamic placeholders safely using regex
        textVal = textVal.replace(/\{\{leadName\}\}/g, profileName || "Client");
        textVal = textVal.replace(/\{\{contact\}\}/g, formattedContact);
        
        if (textVal.includes("{{orderId}}")) {
          const randomId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
          textVal = textVal.replace(/\{\{orderId\}\}/g, randomId);
        }
        
        parameters.push({ type: "text", text: textVal });
      });
    } else {
      // Fallback default components parameters matching the user's curl (2 text parameters)
      parameters.push({ type: "text", text: profileName || "Client" });
      parameters.push({ type: "text", text: "Campaign Inquiry" });
    }

    console.log(`🎯 Keyword match found! Keyword: "${matchedKeyword}" -> Triggering template: "${templateName}" for ${formattedContact}`);
    await sendWhatsAppTemplate(formattedContact, templateName, lang, parameters);

  } catch (error) {
    console.error("❌ Error processing incoming WhatsApp event:", error);
  }
}

/**
 * Calls CRMBot / Meta WhatsApp Cloud API to send the template message
 */
async function sendWhatsAppTemplate(recipientPhone, templateName, languageCode = "en", parameters = []) {
  try {
    // 1. Fetch credentials from Settings DB if available, fallback to process.env
    let apiBaseUrl = process.env.WHATSAPP_API_BASE_URL || "https://crmapi.crmbot.in/api/meta/v19.0";
    let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN;
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "730141010176205";

    const configSetting = await Setting.findOne({ key: "whatsapp_config" });
    if (configSetting && configSetting.value) {
      if (configSetting.value.apiBaseUrl) apiBaseUrl = configSetting.value.apiBaseUrl;
      if (configSetting.value.accessToken) accessToken = configSetting.value.accessToken;
      if (configSetting.value.phoneNumberId) phoneNumberId = configSetting.value.phoneNumberId;
    }

    // Check if WhatsApp configuration is present and not default placeholders
    const isConfigured = accessToken && 
                         phoneNumberId && 
                         !accessToken.includes("YOUR_") && 
                         !phoneNumberId.includes("YOUR_");

    if (!isConfigured) {
      console.warn("⚠️ WhatsApp API credentials are not yet configured (currently using placeholder strings).");
      console.log(`⚙️ MOCK TRIGGER: Automatically responding to ${recipientPhone} with Template "${templateName}" (${languageCode})`);
      console.log("Mock Parameters:", JSON.stringify(parameters, null, 2));
      return;
    }

    const url = `${apiBaseUrl.replace(/\/$/, "")}/${phoneNumberId}/messages`;
    
    // Construct Authorization Header cleanly
    const authHeader = accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`;

    // Build the template request payload matching the user's exact curl structure
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "template",
      template: {
        language: {
          policy: "deterministic",
          code: languageCode
        },
        name: templateName,
        components: [
          {
            type: "body",
            parameters: parameters
          }
        ]
      }
    };

    console.log(`✉️ Sending template request to CRMBot API: ${url} for ${recipientPhone}...`);

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      }
    });

    if (response.data && response.data.messages && response.data.messages[0]) {
      console.log(`✅ Template "${templateName}" sent successfully! Message ID:`, response.data.messages[0].id);
    } else {
      console.log(`✅ Template "${templateName}" request completed. Response:`, JSON.stringify(response.data));
    }
  } catch (error) {
    console.error("❌ Failed to send WhatsApp template via CRMBot API.");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error("   Response Data:", JSON.stringify(error.response.data));
    } else {
      console.error(`   Error Message: ${error.message}`);
    }
  }
}

/**
 * GET /v1/api/whatsapp-webhook/templates
 * Fetches WhatsApp message templates from Meta / CRMBot API.
 * Falls back to default mock templates if credentials are not configured or request fails.
 */
exports.getTemplates = async (req, res) => {
  try {
    let apiBaseUrl = process.env.WHATSAPP_API_BASE_URL || "https://crmapi.crmbot.in/api/meta/v19.0";
    let accessToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
    let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
    let wabaId = process.env.WHATSAPP_WABA_ID || "";

    const configSetting = await Setting.findOne({ key: "whatsapp_config" });
    if (configSetting && configSetting.value) {
      if (configSetting.value.apiBaseUrl) apiBaseUrl = configSetting.value.apiBaseUrl;
      if (configSetting.value.accessToken) accessToken = configSetting.value.accessToken;
      if (configSetting.value.phoneNumberId) phoneNumberId = configSetting.value.phoneNumberId;
      if (configSetting.value.wabaId) wabaId = configSetting.value.wabaId;
    }

    const fallbackTemplates = [
      {
        name: "welcome_hello",
        language: "en",
        bodyText: "Hello {{1}}! Welcome to our service. How can we help you today?",
        parametersCount: 1
      },
      {
        name: "price_details",
        language: "en",
        bodyText: "Hi {{1}}, here are the pricing details for {{2}}. Let us know if you want to proceed.",
        parametersCount: 2
      },
      {
        name: "campaign_interest",
        language: "en",
        bodyText: "Hello {{1}}! Thank you for showing interest in our campaign: {{2}}. One of our agents will contact you shortly.",
        parametersCount: 2
      }
    ];

    // Check if configured
    const isConfigured = accessToken && 
                         phoneNumberId && 
                         !accessToken.includes("YOUR_") && 
                         !phoneNumberId.includes("YOUR_");

    if (!isConfigured) {
      return res.status(200).json({
        success: true,
        isFallback: true,
        error: "Credentials not configured or placeholder values detected.",
        templates: fallbackTemplates
      });
    }

    const cleanBaseUrl = apiBaseUrl.replace(/\/$/, "");
    const authHeader = accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`;

    // If wabaId is not configured, try fetching it dynamically from Meta Graph API
    if (!wabaId) {
      console.log(`📡 wabaId is not configured. Fetching dynamically for phone number ${phoneNumberId}...`);
      try {
        const phoneRes = await axios.get(`${cleanBaseUrl}/${phoneNumberId}?fields=whatsapp_business_account`, {
          headers: { Authorization: authHeader }
        });
        wabaId = phoneRes.data.whatsapp_business_account_id || 
                 (phoneRes.data.whatsapp_business_account && phoneRes.data.whatsapp_business_account.id);
      } catch (err) {
        console.warn("⚠️ Dynamic WABA ID fetch failed:", err.message);
      }
    }

    if (!wabaId) {
      console.warn("⚠️ WABA ID is missing. Using fallbacks.");
      return res.status(200).json({
        success: true,
        isFallback: true,
        error: "WABA ID is not configured. Since CRMBot's proxy API limits automatic retrieval, please enter your WhatsApp Business Account ID (WABA ID) in the settings panel to fetch templates.",
        templates: fallbackTemplates
      });
    }

    console.log(`📡 Fetching templates for WABA ID ${wabaId}...`);
    const templatesRes = await axios.get(`${cleanBaseUrl}/${wabaId}/message_templates?limit=100`, {
      headers: { Authorization: authHeader }
    });

    const rawTemplates = templatesRes.data.data || [];
    const parsedTemplates = rawTemplates.map(tpl => {
      let bodyText = "";
      let parametersCount = 0;

      if (tpl.components) {
        const bodyComp = tpl.components.find(c => c.type === "BODY");
        if (bodyComp && bodyComp.text) {
          bodyText = bodyComp.text;
          // Count occurrences of {{number}}
          const matches = bodyText.match(/\{\{\d+\}\}/g);
          if (matches) {
            const indexes = matches.map(m => parseInt(m.replace(/[^0-9]/g, ""), 10));
            parametersCount = Math.max(...indexes, 0);
          }
        }
      }

      return {
        name: tpl.name,
        language: tpl.language || "en",
        bodyText: bodyText,
        parametersCount: parametersCount
      };
    });

    return res.status(200).json({
      success: true,
      isFallback: false,
      templates: parsedTemplates.length > 0 ? parsedTemplates : fallbackTemplates
    });

  } catch (error) {
    console.error("❌ Failed to fetch message templates from Meta API:", error.message);
    const fallbackTemplates = [
      {
        name: "welcome_hello",
        language: "en",
        bodyText: "Hello {{1}}! Welcome to our service. How can we help you today?",
        parametersCount: 1
      },
      {
        name: "price_details",
        language: "en",
        bodyText: "Hi {{1}}, here are the pricing details for {{2}}. Let us know if you want to proceed.",
        parametersCount: 2
      },
      {
        name: "campaign_interest",
        language: "en",
        bodyText: "Hello {{1}}! Thank you for showing interest in our campaign: {{2}}. One of our agents will contact you shortly.",
        parametersCount: 2
      }
    ];
    return res.status(200).json({
      success: true,
      isFallback: true,
      error: error.message || "Failed to reach WhatsApp templates API.",
      templates: fallbackTemplates
    });
  }
};

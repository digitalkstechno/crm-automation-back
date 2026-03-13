const axios = require("axios");
const ACCOUNTMASTER = require("../model/accountMaster");

/**
 * Maps Meta lead field data to our AccountMaster schema
 * Matches the fields used in /public-form
 */
const mapMetaFields = (fields) => {
  const mappedData = {
    address: {}
  };

  fields.forEach(field => {
    const name = field.name.toLowerCase();
    const value = field.values[0];

    // Mapping based on common Meta Lead Form field IDs
    if (name.includes("company")) {
      mappedData.companyName = value;
    } else if (name.includes("full_name") || name === "name") {
      mappedData.clientName = value;
    } else if (name.includes("phone") || name === "mobile") {
      // Ensure it has 91 prefix and is 12 digits for backend validation
      let phone = value.replace(/\D/g, "");
      if (phone.length === 10) {
        phone = "91" + phone;
      }
      mappedData.mobile = phone;
    } else if (name === "email") {
      mappedData.email = value;
    } else if (name === "website") {
      mappedData.website = value;
    } else if (name.includes("address")) {
      mappedData.address.line1 = value;
    } else if (name === "city") {
      mappedData.address.cityName = value;
    } else if (name === "state") {
      mappedData.address.stateName = value;
    } else if (name === "country") {
      mappedData.address.countryName = value;
    }
  });

  // Fallback if company name wasn't provided (since it's required in our schema)
  if (!mappedData.companyName) {
    mappedData.companyName = mappedData.clientName || "Facebook Lead";
  }

  return mappedData;
};

// GET /v1/api/meta/webhook - Verification for Meta
exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
      console.log("META_WEBHOOK_VERIFIED ✅");
      return res.status(200).send(challenge);
    } else {
      console.log("META_WEBHOOK_VERIFICATION_FAILED ❌");
      return res.sendStatus(403);
    }
  }
};

// POST /v1/api/meta/webhook - Handling lead notifications
exports.handleWebhook = async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      for (const change of entry.changes) {

        if (change.field === "leadgen") {

          const leadId = change.value.leadgen_id;
          console.log("Received New Facebook Lead ID:", leadId);

          try {

            const response = await axios.get(
              `https://graph.facebook.com/v25.0/${leadId}`,
              {
                params: {
                  access_token: process.env.META_ACCESS_TOKEN
                }
              }
            );

            const metaLead = response.data;

            console.log("Meta Lead Data:", metaLead);

            const accountData = mapMetaFields(metaLead.field_data || []);

            // Add extra meta fields
            accountData.metaLeadId = leadId;
            accountData.source = "facebook";
            accountData.metaRawData = metaLead; // store full response for debugging

            // Temporary fallback values
            if (!accountData.mobile) {
              accountData.mobile = "TEMP_" + Date.now();
            }

            if (!accountData.clientName) {
              accountData.clientName = "Facebook Lead";
            }

            if (!accountData.companyName) {
              accountData.companyName = "Facebook Lead";
            }

            // Avoid duplicate using leadId
            const existingLead = await ACCOUNTMASTER.findOne({
              metaLeadId: leadId
            });

            if (!existingLead) {

              const newAccount = await ACCOUNTMASTER.create(accountData);

              console.log("✅ Meta Lead Saved:", newAccount._id);

            } else {

              console.log("⚠️ Lead already exists:", leadId);

            }

          } catch (error) {

            console.error(
              "❌ Error fetching lead:",
              error.response ? error.response.data : error.message
            );

          }

        }

      }
    }

    return res.status(200).send("EVENT_RECEIVED");
  }

  res.sendStatus(404);
};

// GET /v1/api/meta/ping - Simple test to check if the route is reachable
exports.pingTest = (req, res) => {
  res.status(200).json({
    status: "Success",
    message: "Meta integration route is working correctly!",
    env_check: {
      verify_token_set: !!process.env.META_VERIFY_TOKEN,
      access_token_set: !!process.env.META_ACCESS_TOKEN
    }
  });
};

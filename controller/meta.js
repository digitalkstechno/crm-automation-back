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

          if (!process.env.META_ACCESS_TOKEN) {
            console.error("❌ META_ACCESS_TOKEN is missing in .env! Cannot fetch lead details.");
            return;
          }

          try {
            // Fetch the actual lead data using the Page Access Token
            console.log("Fetching lead details from Meta for ID:", leadId);
            const response = await axios.get(
              `https://graph.facebook.com/v21.0/${leadId}`,
              {
                params: {
                  access_token: process.env.META_ACCESS_TOKEN
                }
              }
            );

            console.log("Meta API Response Data:", JSON.stringify(response.data, null, 2));

            const metaLead = response.data;
            if (!metaLead.field_data) {
              console.log("No field_data found in Meta lead!");
              return;
            }

            const accountData = mapMetaFields(metaLead.field_data);
            console.log("Mapped Account Data for DB:", accountData);

            // Avoid duplicates by checking mobile number
            if (!accountData.mobile) {
              console.log("Skipping record creation: No mobile number found in lead.");
              return;
            }

            const existingAccount = await ACCOUNTMASTER.findOne({
              mobile: accountData.mobile,
              isDeleted: false
            });

            if (!existingAccount) {
              console.log("Creating new Account Master record...");
              const newAccount = await ACCOUNTMASTER.create(accountData);
              console.log("✅ Successfully added Meta Lead to Account Master. ID:", newAccount._id);
            } else {
              console.log("⚠️ Account already exists for mobile:", accountData.mobile, "- skipping creation.");
            }
          } catch (error) {
            console.error("❌ Error processing lead:", error.response ? error.response.data : error.message);
          }
        }
      }
    }
    return res.status(200).send("EVENT_RECEIVED");
  }
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

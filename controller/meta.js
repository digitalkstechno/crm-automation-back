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
            // Fetch the actual lead data using the Page Access Token
            const response = await axios.get(
              `https://graph.facebook.com/v21.0/${leadId}`,
              {
                params: {
                  access_token: process.env.META_ACCESS_TOKEN
                }
              }
            );

            const metaLead = response.data;
            const accountData = mapMetaFields(metaLead.field_data);

            console.log("Processed Lead Data:", accountData);

            // Avoid duplicates by checking mobile number
            const existingAccount = await ACCOUNTMASTER.findOne({
              mobile: accountData.mobile,
              isDeleted: false
            });

            if (!existingAccount) {
              const newAccount = await ACCOUNTMASTER.create(accountData);
              console.log("Successfully added Meta Lead to Account Master:", newAccount._id);
            } else {
              console.log("Account already exists for this mobile number, skipping.");
            }
          } catch (error) {
            console.error("Error fetching lead from Meta API:", error.response ? error.response.data : error.message);
          }
        }
      }
    }
    return res.status(200).send("EVENT_RECEIVED");
  } else {
    return res.sendStatus(404);
  }
};

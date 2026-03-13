# Facebook Lead Ads Integration Setup Guide 🚀

This guide explains how to set up the Meta Developer Console to automatically sync leads from your Facebook Page into the **Account Master** of your CRM.

---

## 1️⃣ Create a Meta Developer App
1. Go to [Meta for Developers](https://developers.facebook.com/).
2. Click **My Apps** > **Create App**.
3. **App Type Selection**: Select **Other**.
4. **App Category**: Select **Business**. (This is the only type that supports "Lead Generation").
5. **App Name**: Give it a name like `CRM_Lead_Sync`.
6. **App Purpose**: Ensure you select your **Business Account** in the dropdown if you have one.

## 2️⃣ Select "Use Cases" (IMPORTANT)
Meta recently updated their dashboard. You might see a "Use Cases" screen:
1. Find **Customize any app with the Graph API** or **Lead Generation**.
2. Click **Set Up** or **Continue**.
3. Ensure the follow permissions are linked to your use case:
   - `leads_retrieval`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_metadata`

## 3️⃣ Add "Webhooks" Product
1. In the App Dashboard left sidebar, click **Add Product**.
2. Find **Webhooks** and click **Set Up**.
3. Select **Page** from the dropdown menu and click **Subscribe to this object**.
4. Enter the Following:
   - **Callback URL**: `https://your-domain.com/v1/api/meta/webhook`
     *(If testing locally, use **ngrok** to get a public https URL)*
   - **Verify Token**: Choose a unique string (e.g., `BrandCRM_2024_Token`).
5. **Update your `.env`**:
   ```env
   META_VERIFY_TOKEN=BrandCRM_2024_Token
   ```
6. Click **Verify and Save**.
7. In the list of fields, find **leadgen** and click **Subscribe**.

## 4️⃣ Access Levels (Development vs Live)
By default, your app is in **Development Mode**.
- In Development Mode, you can ONLY receive leads from users who have a **"Role"** in the app (like you).
- To receive leads from real customers, you must:
  1. Go to **App Settings** > **Basic** and add a **Privacy Policy URL**.
  2. Change the toggle at the top from **Development** to **Live**.
  3. Go to **App Review** > **Permissions and Features** and request **Advanced Access** for:
     - `leads_retrieval`
     - `pages_show_list`
     - `pages_read_engagement`

## 3️⃣ Get a Page Access Token
1. Go to the [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your **App** in the top right.
3. In the **User or Page** dropdown, select the **Facebook Page** you want leads from.
4. Add these 4 permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_ads`
   - `leads_retrieval`
5. Click **Generate Access Token**.
6. **Update your `.env`**:
   ```env
   META_ACCESS_TOKEN=PASTE_YOUR_TOKEN_HERE
   ```
   *(Note: This token expires in 2 months. For a permanent token, use the "System User" token method in Meta Business Suite settings).*

## 4️⃣ Map Your Facebook Lead Form Fields
When you create a **Lead Form** (Instant Form) on your Facebook Page, make sure the **Field IDs** (found in Form Settings > Question IDs) match these exactly:

| Database Field | Facebook Field ID |
| :--- | :--- |
| **Full Name** | `full_name` |
| **Phone Number** | `phone_number` |
| **Email** | `email` |
| **Company Name** | `company_name` |
| **Website** | `website` |
| **City** | `city` |
| **State** | `state` |
| **Country** | `country` |

## 5️⃣ Local Testing (Crucial)
Since Meta cannot send webhooks to `localhost`, follow these steps:
1. Install **ngrok** (`npm install -g ngrok`).
2. Run `ngrok http 5000` (if your server runs on port 5000).
3. Copy the `https://xxxx.ngrok-free.app` URL and use it as your **Callback URL** in Step 2.
4. Use the [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/) to send a "Test Lead".

---

## ✅ Integration Workflow
1. User fills form on Facebook.
2. Meta sends a notification to our `/webhook` endpoint.
3. Our code fetches the full details using the `META_ACCESS_TOKEN`.
4. Our code checks if the mobile number is unique.
5. Lead is saved into the **Account Master**.

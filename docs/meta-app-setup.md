# Meta App Setup — Synapse

You need a **Meta Developer App** before users can connect their Instagram to Synapse.
This walks you through creating the app, getting credentials, configuring the webhook, and going through App Review.

> Total time: ~30 min to get a working app for your own personal Instagram (so you can test).
> App Review for production access: usually 5–10 business days.

---

## 1. Prerequisites

Before you start, make sure you have:

- **A Meta developer account** — sign up at [developers.facebook.com](https://developers.facebook.com)
- **An Instagram Business or Creator account** — convert your IG account to one in the Instagram app: Settings → Account → Switch to Professional Account
- **A Facebook Page** that's **connected to your Instagram Business account** — Meta requires this. In Instagram: Settings → Account → Linked accounts → Facebook → connect to a Page (create one if needed)

---

## 2. Create the App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Pick **Business** as the use case → Next
4. Name your app (e.g. "Synapse Production"), enter your contact email
5. Click **Create app**

You're now on the app dashboard. Copy these from **Settings → Basic**:

- **App ID** → paste into `META_APP_ID` in `.env.local`
- **App Secret** (click "Show") → paste into `META_APP_SECRET`

Choose any long random string (32+ chars) for `META_VERIFY_TOKEN`. Synapse uses it to verify Meta's webhook subscription handshake. Example: `openssl rand -hex 24`.

---

## 3. Add the Instagram product

From the left sidebar of your app dashboard:

1. Click **Add Products** (or the "+" next to Products)
2. Find **Instagram** in the list → click **Set up**
3. Click **API setup with Instagram login**

You'll see three sections — complete all three.

### 3a. Generate access tokens (for testing)

Click **Generate Token** next to your linked IG account, copy the token. You don't paste this anywhere — it's just to verify your account is set up correctly. Synapse will get its own token via OAuth when a user clicks "Connect Instagram" in the settings page.

### 3b. Configure webhooks

1. Scroll to **Step 2 — Configure webhooks**
2. Click **Configure**
3. **Callback URL**: `https://YOUR-APP.vercel.app/api/meta/webhook`
   - For local development with a tunnel (e.g. `ngrok`), use `https://abc123.ngrok.app/api/meta/webhook`
4. **Verify token**: paste the same string you put in `META_VERIFY_TOKEN`
5. Click **Verify and save** — Meta will hit your `GET /api/meta/webhook` endpoint; if your env is correct, it returns the challenge and the verification succeeds
6. **Subscribe to fields**: tick at minimum `messages`, `messaging_postbacks`, `message_reactions`

### 3c. Set up Instagram Business login

1. Scroll to **Step 3 — Configure Instagram business login**
2. **OAuth redirect URIs**: add `https://YOUR-APP.vercel.app/api/meta/oauth/callback` (and your local equivalent)
3. **Deauthorize callback URL**: leave blank for now (or add `https://YOUR-APP.vercel.app/api/meta/deauth`)
4. **Data deletion request URL**: leave blank for now

---

## 4. Add required permissions

From the left sidebar: **App Review → Permissions and Features**.

Search for and request **Advanced Access** for:

| Permission                       | Why                                                |
|----------------------------------|----------------------------------------------------|
| `instagram_basic`                | Read basic IG profile info                         |
| `instagram_manage_messages`      | Read & send DMs (the core feature)                 |
| `pages_messaging`                | Send messages from the linked Page                 |
| `pages_show_list`                | List the user's Pages during connect               |
| `pages_manage_metadata`          | Subscribe a Page to webhooks                       |
| `business_management`            | Use the Business API endpoints                     |

Each will require a justification, screenshots, and a screencast of your app using the permission.

> **Until you pass App Review**, only people listed in **Roles → Roles** (your developer/test/admin accounts) can connect their Instagram. That's enough to test everything — connect *your own* IG account first.

---

## 5. Switch the app to Live mode

Top of the app dashboard, toggle **App Mode** from "Development" → "Live".

Once Live, anyone in your approved permissions list can use Synapse.

---

## 6. Test the connection

1. Make sure `META_APP_ID`, `META_APP_SECRET`, `META_VERIFY_TOKEN` are set in your `.env.local` (or in Vercel + Render env vars)
2. Restart `npm run dev`
3. Go to `/settings`
4. Click **Connect Instagram**
5. You'll be redirected to facebook.com → grant permissions → you'll come back to `/settings?meta_connected=1`
6. Send a DM to your Instagram from another account — within ~2 seconds the Synapse worker should record it in the database. Check the Inbox screen.

---

## Common errors

| Error                            | Likely cause                                                                 |
|----------------------------------|------------------------------------------------------------------------------|
| `state_mismatch`                 | OAuth cookie expired (>10 min) or third-party cookies blocked. Try again.    |
| `no_ig_account`                  | The Facebook Page you selected isn't linked to an Instagram Business account. Convert your IG to Professional and re-link. |
| `Invalid OAuth access token`     | You're in Development mode and the connecting account isn't in your Roles.   |
| Webhook handshake `bad handshake: token` | `META_VERIFY_TOKEN` doesn't match what you typed in the Meta app dashboard. |
| Webhook `signature_valid: false` in DB  | `META_APP_SECRET` is wrong or empty.                                  |
| No webhooks arriving             | Either you're in Dev mode (only test users can trigger webhooks), or your callback URL isn't reachable from the public internet (use ngrok in dev). |

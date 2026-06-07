# Facebook Page integration — Meta App checklist (your part)

This is the **dashboard + App Review** work that only you can do. When it's done, send me
the items in **Part 9** and I'll wire the code to it.

Your app is already created (Business type, Instagram product live). We're now **adding** the
Facebook Page side so Synapse can:
- automate **Facebook Page DMs** (Messenger) and **Facebook post/comment** replies, and
- become the **thread owner** so Instagram DMs stop hitting the "not the thread owner" error.

---

## Constants (copy-paste these exactly)

| Field | Value |
|---|---|
| App ID | `1995466594389070` |
| Webhook callback URL | `https://synapse.nokhaos.com/api/meta/webhook` |
| Webhook verify token | `dac4db217d28599c8cffd4794334a4ca0cb3e19598570b06` |
| **New** FB OAuth redirect URI | `https://synapse.nokhaos.com/api/meta/fb/oauth/callback` |
| Existing IG OAuth redirect URI | `https://synapse.nokhaos.com/api/meta/oauth/callback` |
| Deauthorize callback URL | `https://synapse.nokhaos.com/api/meta/deauth` |
| Data deletion request URL | `https://synapse.nokhaos.com/api/meta/deauth` |

> The FB redirect URI points at a route I haven't written yet — that's fine, whitelist it now
> so it's ready when the code ships. Whitelisting an unused URL does nothing harmful.

App dashboard: <https://developers.facebook.com/apps/1995466594389070/>

---

## Part 1 — App polish (required before App Review will accept a submission)

**Settings → Basic:**
- [ ] **App icon** uploaded (1024×1024 PNG)
- [ ] **Category** set (e.g. "Business and pages")
- [ ] **Privacy Policy URL** → `https://synapse.nokhaos.com/privacy` (must resolve — tell me if this page doesn't exist yet and I'll build it)
- [ ] **Terms of Service URL** → `https://synapse.nokhaos.com/terms`
- [ ] **User data deletion** → choose "Data deletion request URL" and paste the deauth URL above
- [ ] **App Domains** → add `synapse.nokhaos.com`
- [ ] Click **Save changes**

Without these four (icon, privacy, category, data deletion) the review form is blocked.

---

## Part 2 — Add "Facebook Login for Business"

1. Left sidebar → **Add Product** (the "+")
2. Find **Facebook Login for Business** → **Set up**
3. Go to **Facebook Login for Business → Settings**
4. **Valid OAuth Redirect URIs** → add:
   ```
   https://synapse.nokhaos.com/api/meta/fb/oauth/callback
   ```
5. Leave "Client OAuth Login" and "Web OAuth Login" **ON**. Turn **Enforce HTTPS** ON.
6. **Save changes**

---

## Part 3 — Add the Messenger product + connect the Page

1. Left sidebar → **Add Product** → **Messenger** → **Set up**
2. **Messenger → Settings**
3. Under **Connected assets / Add or remove Pages**, click **Connect** and select the Page(s)
   you want Synapse to manage (the Page linked to the Instagram account, e.g. the one behind
   @hustlephill / @nokhaos.grow).
   - This will prompt Business login — approve the Page.
4. You'll now see each Page listed with a **Generate token** button. You don't need to copy the
   token (Synapse fetches its own via OAuth), but generating once confirms the link works.

---

## Part 4 — Webhooks: subscribe the **Page** object

Still useful to set the product-level subscription even though Synapse also subscribes per-Page via API.

1. Left sidebar → **Webhooks** (or **Messenger → Settings → Webhooks**)
2. Object dropdown → **Page** → **Subscribe to this object**
3. Callback URL: `https://synapse.nokhaos.com/api/meta/webhook`
   Verify token: `dac4db217d28599c8cffd4794334a4ca0cb3e19598570b06`
   → **Verify and save** (should succeed instantly — that endpoint is already live)
4. **Subscribe to these fields** on the Page object:
   - [ ] `messages`
   - [ ] `messaging_postbacks`
   - [ ] `messaging_optins`
   - [ ] `message_reactions`
   - [ ] `feed` ← this is how Facebook **comments** arrive
5. Confirm the **Instagram** object is still subscribed to `messages, messaging_postbacks, message_reactions, comments` (it already is — don't change it).

---

## Part 5 — Business Verification (the long pole — start this FIRST)

`pages_messaging`, `business_management`, and friends require your **business to be verified**.
This can take days and gates everything else, so kick it off before anything.

1. <https://business.facebook.com/settings> → **Business Info** → **Security Center** (or **Settings → Business verification**)
2. Submit business details + a verification document (utility bill / business registration / etc.)
3. Status must reach **Verified** before Advanced Access is granted.

---

## Part 6 — App Review: request Advanced Access

**App Review → Permissions and Features.** For each below, click **Request Advanced Access**
(Standard Access is not enough for live, non-role users):

| Permission | Why (use this as the justification seed) |
|---|---|
| `pages_show_list` | List the user's Pages so they can pick which to connect |
| `pages_messaging` | Send & receive DMs on the connected Page on the user's behalf |
| `pages_manage_metadata` | Subscribe the Page to webhooks for real-time messages |
| `pages_read_engagement` | Read Page posts & comments to trigger comment automations |
| `instagram_basic` | Read the IG account linked to the Page |
| `instagram_manage_messages` | Send/receive IG DMs through the Page (thread ownership) |
| `instagram_manage_comments` | Reply to IG comments |
| `business_management` | Access Pages owned via Business Manager |

`public_profile` and `pages_show_list` are usually auto-granted; the messaging ones need the screencast.

---

## Part 7 — Screencast + reviewer notes (the part that gets rejected most)

Meta wants a screen recording showing a **real person** going through the flow. Record this exact path:

1. Open `https://synapse.nokhaos.com`, log in.
2. Go to **Settings**, click **Connect Facebook Page**.
3. Show the Facebook permission dialog, select a Page, grant permissions.
4. Land back on Settings showing the Page **connected**.
5. From a **second** account/phone, send a DM to that Page.
6. Show Synapse's **Inbox** receiving it and the **automated reply** going back out.
7. Post a comment on a Page post; show Synapse replying to the comment.

**Reviewer step-by-step notes** (paste into the submission, one per permission):
> Synapse is an Instagram/Facebook DM automation tool. After the business owner connects their
> Page via Facebook Login, we use `pages_messaging`/`instagram_manage_messages` to send the
> automated replies shown at 0:30 of the screencast, `pages_manage_metadata` to subscribe the
> Page to message webhooks, and `pages_read_engagement`/`*_manage_comments` to trigger and post
> the comment reply shown at 1:10. No data is used outside delivering these automations.

- [ ] Provide a **test user** Meta can use, OR add the reviewer's test account isn't possible —
      instead give working test credentials for `synapse.nokhaos.com` in the notes.
- [ ] Submit. Typical turnaround: **5–10 business days**.

> **Until approved**, the flow works for anyone in **App Roles → Roles** (Admins / Developers /
> Testers). So add your own FB account as a Tester and you can fully test in Dev mode now.

---

## Part 8 — Handover Protocol (make Synapse the OWNER, not secondary)

This is the step that fixes the @hustlephill "not the thread owner" failures. A Page can have
**one Primary Receiver** app. If the old tool is still primary, Synapse stays secondary even
after connecting.

- [ ] In **Meta Business Suite → the Page → Settings → Advanced Messaging** (or
      **Messenger Platform → Handover Protocol**), set the **Primary Receiver** to your
      Synapse app, and either remove the other tool or set it to **Secondary Receiver**.
- [ ] Alternatively, just **remove the competing app's Page access** entirely (you've done this
      for some accounts already). With no other app present, Synapse becomes owner automatically.

I can also set/confirm this via API once the Page is connected — just flag which Pages.

---

## Part 9 — Send me these when done

So I can finish wiring the code, reply with:

1. ✅ / ❌ Facebook Login for Business product added (Part 2)
2. ✅ / ❌ Messenger product added + Page(s) connected (Part 3) — and **which Page name(s)**
3. ✅ / ❌ Page webhook object subscribed to `messages, messaging_postbacks, feed` (Part 4)
4. Business Verification status: **not started / pending / verified** (Part 5)
5. App Review status for the Part 6 permissions: **not submitted / in review / approved**
6. Did you whitelist the FB redirect URI `…/api/meta/fb/oauth/callback`? (Part 2.4)
7. Whether `synapse.nokhaos.com/privacy` and `/terms` exist (if not, I'll build them)

Even before review is approved, once **1–3 + the redirect URI** are done I can ship the code and
we can test the whole thing in **Dev mode** with your own Page.

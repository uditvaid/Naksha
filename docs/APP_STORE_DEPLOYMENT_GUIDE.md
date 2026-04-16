# Naksha — App Store Deployment Guide

Complete step-by-step guide to deploy Naksha to the Apple App Store.

**App Name:** Naksha
**Bundle ID:** `app.nakshatra.vedic`
**ASC App ID:** `6761780245`
**Apple Team ID:** `P7Y9F7LD59`
**Apple ID:** `udit.vaid04@gmail.com`

---

## Step 1: Host Privacy Policy & Terms Pages

The HTML files are ready at `docs/privacy.html` and `docs/terms.html`. You need to make them publicly accessible via a URL.

### Option A: GitHub Pages (Recommended — Free)

1. Log in to GitHub CLI:
   ```bash
   gh auth login --web
   ```
   Follow the browser prompts to authenticate.

2. Create a repo and push:
   ```bash
   cd /Users/uditvaid/Downloads/nakshatra
   git add .
   git commit -m "Prepare for App Store submission"
   gh repo create nakshatra --private --source=. --push
   ```

3. Enable GitHub Pages:
   - Go to `https://github.com/YOUR_USERNAME/nakshatra/settings/pages`
   - Source: **Deploy from a branch**
   - Branch: `main`, Folder: `/docs`
   - Click **Save**

4. Wait 1-2 minutes, then your pages will be live at:
   - Privacy: `https://YOUR_USERNAME.github.io/nakshatra/privacy.html`
   - Terms: `https://YOUR_USERNAME.github.io/nakshatra/terms.html`

### Option B: Vercel (Alternative — Free)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy the docs folder:
   ```bash
   cd /Users/uditvaid/Downloads/nakshatra/docs
   vercel --prod
   ```
   Follow the prompts to log in and deploy. Note the URL it gives you.

### Option C: Custom Domain

If you own `nakshatra.app`:
1. Upload `docs/privacy.html` to your web host as `nakshatra.app/privacy` (or `privacy.html`)
2. Upload `docs/terms.html` as `nakshatra.app/terms` (or `terms.html`)

### After Hosting

Note down your two URLs. You will need them in Step 5.
- Privacy Policy URL: `___________________________`
- Terms of Service URL: `___________________________`

---

## Step 2: Set Up In-App Purchase Products

### 2.1 Open App Store Connect

1. Go to [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with `udit.vaid04@gmail.com`
3. Click **My Apps** > Select **Naksha** (App ID: `6761780245`)

### 2.2 Create a Subscription Group

1. In the left sidebar, click **Monetization** > **Subscriptions**
2. Click the **+** button to create a new **Subscription Group**
3. Group name: `Naksha Premium`
4. Click **Create**

### 2.3 Create the Monthly Subscription

1. Inside the "Naksha Premium" group, click **+** to add a subscription
2. Fill in:
   - **Reference Name:** `Naksha Premium Monthly`
   - **Product ID:** `monthly`
3. Click **Create**
4. On the subscription detail page:
   - **Subscription Duration:** 1 Month
   - **Subscription Prices:** Click **+**, select your base country, set price to **$9.99 USD** (Apple will auto-calculate other currencies)
   - **Localizations:** Click **+**, add English (US):
     - **Display Name:** `Naksha Premium`
     - **Description:** `Unlimited AI Guru, palm reading, numerology, Chinese astrology, Lal Kitab remedies, and compatibility analysis.`
5. Click **Save**

### 2.4 Create the Annual Subscription

1. Back in the "Naksha Premium" group, click **+** again
2. Fill in:
   - **Reference Name:** `Naksha Premium Annual`
   - **Product ID:** `yearly`
3. Click **Create**
4. On the subscription detail page:
   - **Subscription Duration:** 1 Year
   - **Subscription Prices:** Set to **$59.99 USD**
   - **Localizations:** Same display name and description as monthly
5. Click **Save**

### 2.5 Create the Lifetime Purchase

> Note: Apple doesn't have a "lifetime subscription" type. Use a **Non-Consumable In-App Purchase** instead.

1. In the left sidebar, click **Monetization** > **In-App Purchases**
2. Click the **+** button
3. Select **Non-Consumable**
4. Fill in:
   - **Reference Name:** `Naksha Premium Lifetime`
   - **Product ID:** `lifetime`
5. Click **Create**
6. On the detail page:
   - **Price:** Set to **$149.99 USD**
   - **Localizations:** Click **+**, add English (US):
     - **Display Name:** `Naksha Premium — Lifetime`
     - **Description:** `One-time purchase. Unlock all premium features forever.`
7. Click **Save**

### 2.6 Get Your Shared Secret

1. Go to **App Information** (in the left sidebar under General)
2. Scroll to **App-Specific Shared Secret**
3. Click **Manage** > **Generate** (if not already created)
4. Copy the shared secret — you need it for Step 3

Your shared secret: `___________________________`

---

## Step 3: Link RevenueCat to App Store Connect

### 3.1 Log Into RevenueCat

1. Go to [https://app.revenuecat.com](https://app.revenuecat.com)
2. Log in to your account
3. Select the **Naksha** project (or create one if it doesn't exist)

### 3.2 Connect App Store

1. Go to **Project Settings** > **Apps**
2. Click **+ New App** (if not already added)
3. Select **Apple App Store**
4. Fill in:
   - **App name:** `Naksha`
   - **Bundle ID:** `app.nakshatra.vedic`
   - **App-Specific Shared Secret:** Paste the secret from Step 2.6
5. Click **Save**

### 3.3 Verify Your iOS API Key

1. Go to **Project Settings** > **API Keys**
2. Find your iOS **Public API Key**
3. Confirm this matches what you set in EAS secrets:
   ```bash
   eas env:list --environment production
   ```
   Look for `REVENUECAT_IOS_KEY` — it should match the key shown in RevenueCat.

### 3.4 Create Products in RevenueCat

1. Go to **Products** in the left sidebar
2. Click **+ New Product** for each:

| Product ID | Store | Store Product ID |
|-----------|-------|-----------------|
| `monthly` | App Store | `monthly` |
| `yearly` | App Store | `yearly` |
| `lifetime` | App Store | `lifetime` |

3. For each product, enter the **App Store Product ID** (must match exactly what you created in Step 2)

### 3.5 Create an Entitlement

1. Go to **Entitlements** in the left sidebar
2. Click **+ New Entitlement**
3. **Identifier:** `nakshatra_premium`
4. **Description:** `Access to all premium features`
5. Click **Save**
6. Inside the entitlement, click **Attach Products**
7. Select all 3 products: `monthly`, `yearly`, `lifetime`
8. Click **Save**

### 3.6 Create an Offering

1. Go to **Offerings** in the left sidebar
2. Click **+ New Offering**
3. **Identifier:** `default`
4. **Description:** `Main premium offering`
5. Click **Save**
6. Inside the offering, create 3 packages:

| Package | Product |
|---------|---------|
| `$rc_monthly` | `monthly` |
| `$rc_annual` | `yearly` |
| `$rc_lifetime` | `lifetime` |

7. Ensure this offering is marked as **Current** (green badge)

---

## Step 4: Fill In App Privacy Nutrition Labels

### 4.1 Open App Privacy

1. In App Store Connect, go to your app
2. Click **App Privacy** in the left sidebar
3. Click **Get Started** (or **Edit** if already started)

### 4.2 Answer: "Does your app collect data?"

Select: **Yes**

### 4.3 Declare Each Data Type

You need to declare 7 data types. For each one, click **+** and fill in as follows:

---

#### Data Type 1: Name

| Question | Answer |
|----------|--------|
| Category | **Contact Info** |
| Data type | **Name** |
| Is this data linked to the user's identity? | **Yes** |
| Is this data used for tracking? | **No** |
| What purposes do you use this data for? | **App Functionality** |

---

#### Data Type 2: Date of Birth

| Question | Answer |
|----------|--------|
| Category | **Other Data** |
| Data type | **Other Data Types** |
| Specify | `Date of Birth` |
| Is this data linked to the user's identity? | **Yes** |
| Is this data used for tracking? | **No** |
| What purposes do you use this data for? | **App Functionality** |

---

#### Data Type 3: Coarse Location

| Question | Answer |
|----------|--------|
| Category | **Location** |
| Data type | **Coarse Location** |
| Is this data linked to the user's identity? | **Yes** |
| Is this data used for tracking? | **No** |
| What purposes do you use this data for? | **App Functionality** |

> Note: This is the user's birth city — not real-time GPS location.

---

#### Data Type 4: Photos

| Question | Answer |
|----------|--------|
| Category | **Photos or Videos** |
| Data type | **Photos** |
| Is this data linked to the user's identity? | **No** |
| Is this data used for tracking? | **No** |
| What purposes do you use this data for? | **App Functionality** |

> Note: Palm photos are processed temporarily and not stored.

---

#### Data Type 5: Other User Content

| Question | Answer |
|----------|--------|
| Category | **User Content** |
| Data type | **Other User Content** |
| Is this data linked to the user's identity? | **Yes** |
| Is this data used for tracking? | **No** |
| What purposes do you use this data for? | **App Functionality** |

> Note: Covers Guru chat messages and saved readings.

---

#### Data Type 6: Purchase History

| Question | Answer |
|----------|--------|
| Category | **Purchases** |
| Data type | **Purchase History** |
| Is this data linked to the user's identity? | **No** |
| Is this data used for tracking? | **No** |
| What purposes do you use this data for? | **App Functionality** |

> Note: Managed by RevenueCat/App Store for subscription status.

---

#### Data Type 7: Device ID

| Question | Answer |
|----------|--------|
| Category | **Identifiers** |
| Data type | **Device ID** |
| Is this data linked to the user's identity? | **No** |
| Is this data used for tracking? | **No** |
| What purposes do you use this data for? | **App Functionality** |

> Note: Anonymous ID used by RevenueCat for subscription management only.

---

### 4.4 Publish

After declaring all 7 types, click **Publish** to save your privacy labels.

---

## Step 5: Add App Store Listing

### 5.1 Go to the App Store Tab

1. In App Store Connect, select your app
2. Click **App Store** tab in the left sidebar
3. You should be on the version page (e.g., "1.0.0 Prepare for Submission")

### 5.2 Fill In App Information

Go to **General** > **App Information** in the left sidebar:

| Field | Value |
|-------|-------|
| **Name** | `Naksha` |
| **Subtitle** | `Vedic Astrology & AI Guru` |
| **Primary Category** | `Lifestyle` |
| **Secondary Category** | `Entertainment` |
| **Content Rights** | Check: "This app does not contain, show, or access third-party content" |
| **Age Rating** | Click **Edit** and complete the questionnaire (answer No to all — app has no objectionable content). Result should be **4+** |
| **Privacy Policy URL** | Your hosted URL from Step 1 (e.g., `https://YOUR_USERNAME.github.io/nakshatra/privacy.html`) |

### 5.3 Fill In Version Information

Go back to the **App Store** tab > Your version:

**Promotional Text** (can be updated without review):
```
Your complete cosmic blueprint — Vedic astrology, AI Guru, palm reading, numerology & more.
```

**Description** (paste this):
```
Naksha is your personal Vedic astrology companion — an AI-powered cosmic guide rooted in 5,000 years of Jyotish tradition.

YOUR BIRTH CHART, DECODED
Enter your birth details and instantly receive a complete Vedic birth chart with planetary positions, Nakshatras, house placements, and dignities — all calculated using the Lahiri Ayanamsha and Whole Sign house system.

AI JYOTISH GURU
Ask anything about your chart, timing, relationships, career, or spiritual path. Your personal AI Guru draws from classical texts including Brihat Parashara Hora Shastra, Phaladeepika, and Saravali — and speaks in warm, plain English anyone can understand.

DAILY COSMIC READING
Start each day with a personalized reading based on your chart, current planetary transits, and active Dasha period.

PALM READING
Snap a photo of your palm for an AI-powered Hasta Samudrika Shastra analysis — the ancient Indian tradition of reading destiny through your palm lines and mounts.

NUMEROLOGY
Discover your Life Path, Destiny, Soul Urge, Personality, and Birthday numbers through both Pythagorean and Chaldean systems.

CHINESE ASTROLOGY
Explore your Chinese zodiac animal, elemental balance, and BaZi Four Pillars profile with yearly luck cycle analysis.

LAL KITAB REMEDIES
Receive personalized Lal Kitab remedies (upay) — simple, practical everyday actions to harmonize your planetary energies.

COMPATIBILITY
Enter your partner's birth details for a complete Ashtakoota Milan analysis with a 36-point compatibility score.

VIMSHOTTARI DASHA TIMELINE
See your complete planetary period timeline — past, present, and future — with personalized explanations of what each period means for your life.

All readings are AI-generated for spiritual self-inquiry and entertainment purposes only. They do not constitute medical, legal, or financial advice.

PREMIUM FEATURES
- Unlimited AI Guru conversations
- Palm reading analysis
- Full numerology profile
- Chinese astrology reading
- Lal Kitab personalized remedies
- Unlimited compatibility reports
- Daily cosmic alerts
- Advanced Dasha explanations

Free users enjoy: full birth chart, daily reading, 3 Guru conversations per day, and planetary positions.
```

**Keywords** (100 character limit — use all of it):
```
vedic,astrology,horoscope,kundli,birth chart,nakshatra,numerology,palmistry,compatibility,jyotish
```

**Support URL:**
```
mailto:support@nakshatra.app
```
Or a webpage if you have one.

**Marketing URL** (optional):
```
https://nakshatra.app
```

### 5.4 What's New

```
First release of Naksha — your complete cosmic blueprint.
```

### 5.5 App Review Information

**Contact Information:**
| Field | Value |
|-------|-------|
| First Name | `Udit` |
| Last Name | `Vaid` |
| Phone | Your phone number |
| Email | `udit.vaid04@gmail.com` |

**Review Notes** (paste this):
```
Free features available without purchase:
- Full Vedic birth chart generation and visualization
- Daily personalized cosmic reading
- 3 AI Guru conversations per day
- Planetary positions, Nakshatra details, and Dasha timeline
- Explore screen with feature descriptions

Premium features (subscription required):
- Unlimited AI Guru conversations
- Palm reading via camera/photo
- Numerology analysis
- Chinese astrology (BaZi Four Pillars)
- Lal Kitab remedies
- Compatibility (Ashtakoota) analysis

All readings are clearly labeled as "AI-Generated" throughout the app. The app includes a full disclaimer that readings are for spiritual self-inquiry and entertainment only.

No demo account is needed. The app works immediately after entering birth details during the 4-step onboarding flow. To test:
1. Open the app and tap "Begin"
2. Enter any name
3. Select any date of birth
4. Optionally select a birth time (or tap "I don't know my birth time")
5. Enter a city (e.g., "New York" or leave blank for default)
6. Tap "Generate My Chart" — the full chart and home screen will appear

To test premium features, you may use a Sandbox Apple ID configured in App Store Connect > Users and Access > Sandbox Testers.
```

**Sign-In Required:** No (uncheck this — no login needed)

---

## Step 6: Take Screenshots

### Required Sizes

| Device Size | Resolution | Required For |
|-------------|-----------|-------------|
| 6.7" (iPhone 15 Pro Max) | 1290 x 2796 | Required |
| 6.5" (iPhone 14 Plus) | 1284 x 2778 | Required |
| 5.5" (iPhone 8 Plus) | 1242 x 2208 | Optional but recommended |

You need **3-10 screenshots per size**. Both 6.7" and 6.5" are mandatory.

### Recommended Screenshots (6 screens)

Take these in order — they tell a story:

1. **Home screen** — Shows greeting, mandala, daily reading, planetary positions
2. **Birth Chart** — The North Indian chart with Lagna card below it
3. **Guru Chat** — Welcome state with suggested questions, or a sample conversation
4. **Explore** — Feature grid showing all available systems
5. **A Reading** — Any AI reading result (numerology, palm, or compatibility score)
6. **Paywall** — Premium features list with pricing tiers

### How to Take Screenshots

**Option A: From Simulator (if you have a dev build)**
```bash
# Boot the iPhone 15 Pro Max simulator
xcrun simctl boot 7BBA814D-B289-482B-9A8C-6D24E77C26DE

# Start the app
npx expo start --ios

# Take screenshot (after navigating to each screen)
xcrun simctl io booted screenshot ~/Desktop/screenshot_1.png
```

**Option B: From a Real Device (Recommended)**
1. Install the app via TestFlight (after building in Step 7)
2. Navigate to each screen
3. Press **Side Button + Volume Up** simultaneously to screenshot
4. Screenshots are saved to Photos at the correct resolution

**Option C: Use a Design Tool**
- Take any device screenshots and frame them using [screenshots.pro](https://screenshots.pro), [AppMockUp](https://app-mockup.com), or Figma
- Add captions like "Your Complete Vedic Birth Chart" above each screenshot

### Upload Screenshots

1. In App Store Connect > Your version page
2. Scroll to the **Screenshots** section
3. Select each device size tab (6.7", 6.5")
4. Drag and drop your screenshots in order

---

## Step 7: Build the Production IPA

```bash
cd /Users/uditvaid/Downloads/nakshatra
eas build --platform ios --profile production
```

- This takes approximately 15-20 minutes
- EAS handles code signing automatically (managed certificates)
- All 5 API secrets from EAS environment will be injected at build time
- When complete, you'll see a URL to download the `.ipa` file (not needed — EAS Submit handles it)

Wait for the build to complete before proceeding.

**Check build status:**
```bash
eas build:list --platform ios --limit 1
```

---

## Step 8: Submit to App Store Connect

Once the build from Step 7 is complete:

```bash
eas submit --platform ios --profile production
```

- This uploads the build directly to App Store Connect
- When prompted, select the build you just created
- Credentials: It will use the config from `eas.json` (Apple ID, ASC App ID, Team ID)
- If asked for an App-Specific Password:
  1. Go to [https://appleid.apple.com](https://appleid.apple.com)
  2. Sign in > **App-Specific Passwords** > **Generate**
  3. Label it `eas-cli` and copy the generated password
  4. Paste it when prompted

---

## Step 9: Submit for App Review

### 9.1 Select the Build

1. Go to App Store Connect > Your App > **App Store** tab
2. Scroll down to the **Build** section
3. Click **Select a Build** (or the **+** button)
4. Choose the build you just uploaded (it may take a few minutes to process)

### 9.2 Verify Everything

Check that all fields show green checkmarks:
- [ ] App Information (name, category, age rating, privacy policy URL)
- [ ] Pricing and Availability (set to "Available" in your target countries)
- [ ] Version Information (description, keywords, screenshots, what's new)
- [ ] App Review Information (contact info, review notes)
- [ ] App Privacy (all 7 data types declared)
- [ ] Build selected

If anything shows a yellow warning or red error, click it to fix.

### 9.3 Answer Compliance Questions

Click **Add for Review**. You'll be asked:

| Question | Answer |
|----------|--------|
| **Export Compliance:** Does your app use encryption? | **No** (already declared via `ITSAppUsesNonExemptEncryption: false` — app uses standard HTTPS only) |
| **Content Rights:** Does your app contain, display, or access third-party content? | **Yes, I have rights to the content** |
| **Advertising Identifier (IDFA):** Does this app use the Advertising Identifier? | **No** |

### 9.4 Submit

Click **Submit to App Review**.

### 9.5 Wait for Review

- Apple review typically takes **24-48 hours** (can be longer during holidays)
- You'll receive an email when the review is complete
- Check status at: App Store Connect > Your App > **Activity** tab

### If Rejected

1. Read the rejection notes in the **Resolution Center** (App Store Connect)
2. Fix the issues flagged
3. Increment the build number in `app.config.ts`:
   ```
   buildNumber: '5'  // was '4'
   ```
4. Rebuild: `eas build --platform ios --profile production`
5. Resubmit: `eas submit --platform ios --profile production`
6. Select the new build and submit for review again

---

## Quick Reference

```bash
# Build
eas build --platform ios --profile production

# Check build status
eas build:list --platform ios --limit 1

# Submit to App Store Connect
eas submit --platform ios --profile production

# Check EAS secrets
eas env:list --environment production

# Check EAS login
eas whoami
```

---

## Checklist

Use this to track your progress:

- [ ] **Step 1:** Privacy policy & terms hosted at public URLs
- [ ] **Step 2:** 3 IAP products created in App Store Connect (monthly, yearly, lifetime)
- [ ] **Step 3:** RevenueCat connected with shared secret, products, entitlement, and offering
- [ ] **Step 4:** All 7 privacy nutrition labels declared and published
- [ ] **Step 5:** App listing complete (name, description, keywords, review notes)
- [ ] **Step 6:** Screenshots uploaded for 6.7" and 6.5" device sizes
- [ ] **Step 7:** Production build completed via `eas build`
- [ ] **Step 8:** Build uploaded via `eas submit`
- [ ] **Step 9:** Build selected, compliance answered, submitted for review
- [ ] **Done:** App approved and live on the App Store

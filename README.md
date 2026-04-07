# Nakshatra 🔱
### Your Complete Cosmic Blueprint — Vedic Astrology AI App

A full-featured iOS/Android astrology app built with Expo / React Native. Powered by Claude AI for personalized readings across Vedic astrology, numerology, Chinese astrology, palmistry, and Lal Kitab.

---

## Features

| Feature | Free | Premium |
|---|---|---|
| Birth chart (D-1) | ✓ | ✓ |
| Jyotish Guru AI (3/day) | ✓ | Unlimited |
| Daily cosmic reading | ✓ | ✓ |
| Numerology | ✓ | ✓ |
| Basic compatibility | ✓ | ✓ |
| Palm reading (AI) | — | ✓ |
| Chinese BaZi astrology | — | ✓ |
| Lal Kitab remedies | — | ✓ |
| Full Dasha timeline | — | ✓ |
| Saved charts (family) | — | ✓ |
| Daily push notifications | — | ✓ |

---

## Revenue Model

- **Monthly:** $9.99/month
- **Annual:** $59.99/year (~50% savings)
- **Lifetime:** $149.99 one-time

Managed via [RevenueCat](https://revenuecat.com).

---

## Tech Stack

- **Framework:** Expo SDK 52 + React Native 0.76
- **Navigation:** Expo Router (file-based)
- **State:** Zustand
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Subscriptions:** RevenueCat + StoreKit
- **Camera/Image:** expo-camera + expo-image-picker
- **Fonts:** Cinzel, Cormorant Garamond, Crimson Pro (Google Fonts)

---

## Setup

### 1. Prerequisites

```bash
node >= 18
npm >= 9
expo-cli (via npx)
```

### 2. Clone & Install

```bash
git clone <your-repo>
cd nakshatra
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `ANTHROPIC_API_KEY` — get from [console.anthropic.com](https://console.anthropic.com)
- `REVENUECAT_API_KEY_IOS` — get from [app.revenuecat.com](https://app.revenuecat.com)
- `EAS_PROJECT_ID` — get from [expo.dev](https://expo.dev) after `eas init`

Then update `app.json` → `extra` with your actual keys.

### 4. Run in Development

```bash
npx expo start
# Press 'i' for iOS simulator, 'a' for Android
```

---

## Production Build & App Store Submission

### Step 1: Set up EAS

```bash
npm install -g eas-cli
eas login
eas init
```

### Step 2: Configure eas.json

Update `eas.json` with your Apple credentials:
- `appleId` — your Apple Developer email
- `ascAppId` — App Store Connect app ID
- `appleTeamId` — your team ID

### Step 3: Build for iOS

```bash
eas build --platform ios --profile production
```

This triggers a cloud build. Takes ~15-25 minutes.

### Step 4: Submit to App Store

```bash
eas submit --platform ios --profile production
```

Or manually upload the `.ipa` via Transporter app.

### Step 5: App Store Connect Setup

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create a new app: **Nakshatra — Vedic Astrology AI**
3. Fill metadata:
   - **Category:** Lifestyle / Health & Fitness
   - **Age Rating:** 4+
   - **Privacy Policy URL:** Required (host at nakshatra.app/privacy)
4. Set up In-App Purchases in App Store Connect → match `SUBSCRIPTION_PRODUCTS` identifiers
5. Submit for review

---

## RevenueCat Setup

1. Create project at [app.revenuecat.com](https://app.revenuecat.com)
2. Add iOS app → paste bundle ID: `com.nakshatra.app`
3. Create Offerings:
   - Add products matching `nakshatra_premium_monthly`, `nakshatra_premium_annual`, `nakshatra_premium_lifetime`
4. Configure entitlements: `nakshatra_premium`
5. Copy API key → `.env`

---

## Jyotish API (for production-grade chart accuracy)

The current implementation uses simplified astronomical calculations. For production accuracy, integrate one of:

- **Prokerala API** — `api.prokerala.com/v2/astrology` (recommended)
- **Astro-Seek API**
- **Swiss Ephemeris** (self-hosted Node.js server)

Replace `generateDemoChart()` in `app/onboarding/index.tsx` with a real API call.

---

## App Store Listing Copy

**Name:** Nakshatra — Vedic Astrology AI

**Subtitle:** Jyotish Guru · Chart · Remedies

**Description:**
Nakshatra is your complete cosmic blueprint — a deeply personalized astrology experience powered by AI and grounded in 5,000 years of Vedic wisdom.

**What makes Nakshatra different:**
Your AI Jyotish Guru knows YOUR birth chart. Every reading, every answer is specific to your planetary positions, Nakshatra placements, and Dasha periods — not generic sun sign content.

**Features:**
• Vedic birth chart (Jyotish) with Nakshatra, Dasha timeline, and Yoga identification
• AI Guru chat — ask anything, get chart-specific answers
• Vedic palmistry via AI photo analysis (palm reading)
• Numerology — Life Path, Destiny, Soul Urge, Personality numbers
• Chinese astrology — BaZi Four Pillars, animal zodiac, elemental analysis
• Lal Kitab remedies (upay) — simple, powerful planetary remedies
• Compatibility & synastry — Ashtakoot matching + AI analysis
• Daily personalized cosmic readings

**Keywords:** vedic astrology, jyotish, birth chart, horoscope, numerology, palm reading, lal kitab, nakshatra, dasha, kundali

---

## File Structure

```
nakshatra/
├── app/
│   ├── _layout.tsx          # Root layout + font loading
│   ├── index.tsx            # Entry point (routes to onboarding or tabs)
│   ├── paywall.tsx          # Subscription screen
│   ├── onboarding/
│   │   └── index.tsx        # 5-step birth data onboarding
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigator
│   │   ├── index.tsx        # Home — daily reading + planets
│   │   ├── chart.tsx        # Vedic chart + Dasha + Yogas
│   │   ├── guru.tsx         # AI Guru chat
│   │   ├── explore.tsx      # Features hub
│   │   └── profile.tsx      # Settings + subscription
│   └── features/
│       ├── palm.tsx         # Palm reading (camera + AI)
│       ├── numerology.tsx   # Numerology calculator
│       ├── chinese.tsx      # Chinese astrology
│       ├── lalkitab.tsx     # Lal Kitab remedies
│       └── compatibility.tsx # Synastry & matching
├── src/
│   ├── constants/
│   │   ├── theme.ts         # Colors, fonts, spacing
│   │   └── astrology.ts     # Nakshatra, planet, zodiac data
│   ├── services/
│   │   ├── claude.ts        # All Claude API calls
│   │   └── revenuecat.ts    # Subscription management
│   ├── store/
│   │   └── userStore.ts     # Zustand global state
│   └── utils/
│       └── vedic.ts         # Astrology calculations
├── app.json                 # Expo config
├── eas.json                 # EAS build config
├── babel.config.js          # Babel + module resolver
├── tsconfig.json
└── .env.example
```

---

## Next Iterations

- [ ] Real ephemeris API integration (Prokerala)
- [ ] Push notifications (daily cosmic alert)
- [ ] D-9 Navamsha chart
- [ ] Transit tracking (current planetary positions)
- [ ] Learning library (Nakshatra encyclopedia, Yoga descriptions)
- [ ] Muhurta calculator (auspicious timing)
- [ ] Annual chart (Varshaphal)
- [ ] Android optimizations

---

*Built with ॐ for cosmic explorers.*

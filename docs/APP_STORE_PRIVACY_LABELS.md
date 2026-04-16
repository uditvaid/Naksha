# App Store Privacy Nutrition Labels — Naksha

Use this reference when filling out the **App Privacy** section in App Store Connect.
Go to: App Store Connect > Your App > App Privacy > Get Started.

---

## Step 1: Does your app collect data?

**Yes** — The app collects the data types listed below.

---

## Step 2: Data Types to Declare

### 1. Contact Info — Name

| Field | Value |
|-------|-------|
| **Data type** | Name |
| **Is this linked to the user's identity?** | Yes |
| **Is this used for tracking?** | No |
| **Purpose** | App Functionality |
| **Details** | User's full name entered during onboarding. Used to personalize birth chart and AI readings. Stored on-device only. |

### 2. Other Data — Date of Birth

| Field | Value |
|-------|-------|
| **Data type** | Other Data Types (specify: "Date of Birth") |
| **Is this linked to the user's identity?** | Yes |
| **Is this used for tracking?** | No |
| **Purpose** | App Functionality |
| **Details** | Date and time of birth used to calculate Vedic birth chart, planetary positions, Dasha periods, and numerology. Stored on-device only. |

### 3. Location — Coarse Location

| Field | Value |
|-------|-------|
| **Data type** | Coarse Location |
| **Is this linked to the user's identity?** | Yes |
| **Is this used for tracking?** | No |
| **Purpose** | App Functionality |
| **Details** | Place of birth (city/country) geocoded to latitude/longitude for birth chart calculation. Not real-time location — only the historical birth location entered by the user. Stored on-device only. |

### 4. Photos or Videos

| Field | Value |
|-------|-------|
| **Data type** | Photos |
| **Is this linked to the user's identity?** | No |
| **Is this used for tracking?** | No |
| **Purpose** | App Functionality |
| **Details** | Palm photograph captured or selected for AI palmistry analysis. Image is processed in memory and sent to Anthropic's Claude API for analysis. Not stored persistently on our servers or on-device after the reading. |

### 5. User Content — Other User Content

| Field | Value |
|-------|-------|
| **Data type** | Other User Content |
| **Is this linked to the user's identity?** | Yes |
| **Is this used for tracking?** | No |
| **Purpose** | App Functionality |
| **Details** | Questions and messages sent to the AI Guru, plus AI-generated readings. Up to 50 messages and 50 readings stored on-device. Messages sent to Anthropic Claude API for response generation. |

### 6. Purchases — Purchase History

| Field | Value |
|-------|-------|
| **Data type** | Purchase History |
| **Is this linked to the user's identity?** | No |
| **Is this used for tracking?** | No |
| **Purpose** | App Functionality |
| **Details** | Subscription status (monthly/annual/lifetime) managed by RevenueCat via the App Store. Used to determine premium feature access. We do not collect payment method or billing details. |

### 7. Identifiers — Device ID

| Field | Value |
|-------|-------|
| **Data type** | Device ID |
| **Is this linked to the user's identity?** | No |
| **Is this used for tracking?** | No |
| **Purpose** | App Functionality |
| **Details** | Anonymous device identifier used by RevenueCat for subscription management. We do not use this for advertising or analytics. |

---

## Step 3: Third-Party SDKs Data Collection

These third-party SDKs are included in the app. Their data collection is accounted for above:

| SDK | Data Collected | Purpose |
|-----|---------------|---------|
| **RevenueCat** (react-native-purchases) | Device ID, Purchase History | Subscription management |
| **Expo Notifications** | Push token | Notification delivery |
| **Expo Image Picker** | Photos (temporary) | Palm reading capture |

---

## Step 4: Data NOT Collected

Confirm "No" for all of the following:

- Health & Fitness data: **No**
- Financial Info (payment info, credit score): **No** (App Store handles payments)
- Sensitive Info: **No**
- Contacts / Address Book: **No**
- Browsing History: **No**
- Search History: **No**
- Diagnostics (crash data, performance): **No**
- Emails or Text Messages: **No**
- Audio Data: **No**
- Gameplay Content: **No**
- Advertising Data: **No**
- Precise Location: **No** (only coarse/city-level for birth place)

---

## Step 5: Privacy Policy URL

Enter this URL in the "Privacy Policy URL" field:

```
https://nakshatra.app/privacy
```

Host the file at `docs/privacy.html` from this repository at that URL.

---

## Step 6: Tracking Declaration

| Question | Answer |
|----------|--------|
| Does your app use data for tracking? | **No** |
| Does your app use any tracking domains? | **No** |
| Does your app use App Tracking Transparency? | **No** (not needed) |

---

## Notes

- **No account system**: The app does not require user accounts. All data is stored locally on-device.
- **No analytics**: No analytics SDKs (Firebase, Mixpanel, Amplitude, etc.) are included.
- **No advertising**: No ad SDKs are included. No data is shared with advertisers.
- **No cross-app tracking**: RevenueCat's device ID is used solely for subscription management, not cross-app tracking.
- **All API calls use HTTPS**: Data in transit is encrypted.

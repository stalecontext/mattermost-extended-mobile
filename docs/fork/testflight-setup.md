# TestFlight Setup Guide for Mattermost Fork

## What You Need to Provide

| Item | What It Is | Where to Get It |
|------|-----------|-----------------|
| Apple Team ID | Identifies your developer account | Apple Developer Portal |
| Bundle Identifier | Unique app ID (you choose it) | You create it |
| App Name | Name shown on home screen | You choose it |
| Certificate Repo | Private Git repo for signing certs | GitHub/GitLab |

---

## 1. Apple Team ID

Your 10-character identifier for your Apple Developer account.

**How to find it:**
1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign in with your Apple ID
3. Click **Account** in the top menu
4. Look in the **Membership details** section
5. Find **Team ID** (looks like: `ABC123XYZ9`)

---

## 2. Bundle Identifier

A unique reverse-domain string that identifies your app globally. **You choose this yourself** - it just needs to be unique across all apps on the App Store.

**Format:** `com.yourname.appname` or `com.yourdomain.appname`

**Examples:**
- `com.bensmith.mattermost`
- `com.bensmith.mattermost-extended`
- `io.github.bensmith.mattermost`

**Rules:**
- Must be unique (not used by any other app)
- Use only lowercase letters, numbers, hyphens, and periods
- Must start with a reverse domain you control (or your name)
- Cannot be changed after your first TestFlight upload

**You do NOT need to register this anywhere yet** - the setup process will register it in the Apple Developer Portal.

---

## 3. App Name

The name displayed under the app icon on the home screen.

**Examples:**
- `Mattermost`
- `Mattermost Extended`
- `MM Extended`

**Rules:**
- Maximum 30 characters
- Can be different from your bundle identifier
- Can be changed later

---

## 4. Certificate Repository (for Fastlane Match)

A **private** Git repository to store encrypted signing certificates and provisioning profiles. This allows you to share signing credentials across machines securely.

**How to create it:**

### GitHub:
1. Go to [github.com/new](https://github.com/new)
2. Name it something like `ios-certificates` or `fastlane-certs`
3. Select **Private**
4. Click **Create repository**
5. Copy the SSH URL: `git@github.com:yourusername/ios-certificates.git`

### GitLab:
1. Go to [gitlab.com/projects/new](https://gitlab.com/projects/new)
2. Create a blank project, set visibility to **Private**
3. Copy the SSH URL

**Important:** This repo should remain **empty** - Fastlane Match will populate it automatically.

---

## 5. App Store Connect API Key (Optional but Recommended)

Allows automated uploads without entering your Apple ID password.

**How to create it:**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click **Users and Access** → **Integrations** tab → **App Store Connect API**
3. Click the **+** button to generate a new key
4. Name: `Fastlane` (or anything descriptive)
5. Access: **App Manager** (minimum needed for TestFlight)
6. Click **Generate**
7. **Download the .p8 file immediately** (you can only download it once!)
8. Note down the **Key ID** and **Issuer ID** shown on the page

---

## Summary: What to Provide

Once you have everything ready:

```
Team ID: YOUR_TEAM_ID
Bundle ID: com.yourname.mattermost
App Name: Your App Name
Cert Repo: git@github.com:yourname/ios-certificates.git

# Optional (for automation)
API Key ID: XXXXXXXXXX
API Issuer ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Keep the .p8 file safe - you'll need it during setup but should not share its contents.

---

## FAQ

### Don't have a domain?
Use `com.yourname.appname` - it doesn't need to be a real domain you own.

### Building on multiple machines?
The certificate repo lets you share signing credentials across machines securely.

### Is the certificate repo secure?
Yes - Fastlane Match encrypts everything with a password you choose during setup.

### Can I change the bundle ID later?
No - once you upload to TestFlight, the bundle ID is permanent. Choose carefully.

### Can I change the app name later?
Yes - the display name can be changed in future updates.

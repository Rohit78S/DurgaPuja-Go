# Project Overview
Track Durga Puja pandals with this web app. It connects to Google Maps for navigation and offers Google login for data persistence. Please review the terms and conditions on the site before using or installing it.

## Architecture & Directory Structure

```text
rebuild-web-app/
├── public/                    # Static files directly served to the client
│   ├── index.html             # Main entry point for the application interface
│   ├── login.html             # Google authentication and login landing page
│   ├── 404.html               # Custom fallback page for missing routes
│   ├── manifest.json          # Web App Manifest for PWA installation
│   ├── _redirects             # Redirect and routing rules (e.g., Netlify hosting)
│   ├── google0f07789f81cbad4f.html # Google Search Console domain verification file
│   ├── css/
│   │   ├── style.css          # Main layout and UI styling
│   │   ├── notification-styles.css # UI styles for toasted notifications and alerts
│   │   └── update-styles.css  # Styles for application update prompts
│   └── assets/                # Static media including logos, images, and icons
│
├── src/                       # Core Application JavaScript Logic
│   ├── script.js              # Primary application logic, state management, and DOM handling
│   ├── service-worker.js      # Service Worker handling offline caching and background sync
│   ├── modules/               # Feature-specific client-side modules
│   │   ├── crowd-checkin.js   # Live crowd density check-ins and user updates
│   │   ├── notification-system.js # Notification dispatcher and display logic
│   │   ├── push-notifications.js  # Web Push subscription management
│   │   ├── smart-recommendations.js # Intelligent route and pandal suggestion engine
│   │   ├── update-manager.js  # Version detection and client auto-update Handler
│   │   ├── version-check.json # Build version metadata file
│   │   └── version-config.js  # Runtime application version variables
│   │
│   └── group/                 # Group Pandal Hopping Module
│       ├── group-bridge.js    # Data bridge connecting group state with main UI
│       ├── group-crypto.js    # Encryption utilities for secure shared group codes
│       └── group-service.js   # API interface for group session creation and syncing
│
├── server/                    # Backend & Data Synchronization Scripts
│   └── backend.js             # Firebase Firestore synchronization module
│
├── firebase/                  # Firebase Configuration & Database Governance
│   ├── firebase.json          # Firebase project configuration and deployment settings
│   ├── firestore.indexes.json # Custom database indexing definitions
│   └── firestore.rules        # Firestore database access and security rules
│
├── .env                       # Environment variables configuration
├── .gitignore                 # Files and folders ignored by Git version control
├── package.json               # Project metadata and dependencies
├── package-lock.json          # Dependency lockfile
└── README.md                  # Comprehensive project documentation
```

# Features
Interactive Map & Navigation: Direct integration with Google Maps for turn-by-turn routing between pandals.

Secure Authentication: Google OAuth integration ensuring user data and preferences persist across sessions.

Real-Time Pandal Tracking: Capability to bookmark pandals, track visited locations, earn badges, and locate nearby food stalls.

Live Crowd Updates: Crowd check-in system to monitor and share real-time density levels at major pandal sites.

Smart Recommendations: Automated suggestions for optimal hopping routes based on proximity and user preferences.

Progressive Web App: Includes service worker integration for offline capabilities and installation on mobile devices.

# Tech Stack
Frontend: HTML5, CSS3, Vanilla JavaScript (ES6 Modules)

Database & Authentication: Firebase Firestore & Google OAuth

Hosting & Deployment: Netlify / Firebase Hosting

# Getting Started
1.Clone the repository:
git clone [https://github.com/Rohit78S/Durga-PujaGo.git](https://github.com/Rohit78S/Durga-PujaGo.git)

2.Navigate to the project directory:
cd Durga-PujaGo/rebuild-web-app

3.Configure Environment Variables:
Create a .env file in the root directory based on .env.example and supply your Firebase credentials and API keys.

4.Local Development:
Serve the public directory using a local HTTP web server (such as Live Server in VS Code or npx serve public).

# License
This project is open-source software licensed under the Apache-2.0 License.

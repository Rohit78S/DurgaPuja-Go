// version-config.js - Version Configuration File

const APP_CONFIG = {
    VERSION: '8.3.0-beta',
    BUILD_DATE: '2026-06-03',
    UPDATE_CHECK_URL: './version-check.json', // Fixed: Use local path for testing

    FEATURES: [
        'We’ve upgraded our notification system to keep you better informed during Durga Puja.',
       'Get timely reminders for Puja dates, daily highlights, and special events.',
       'Receive real-time weather alerts so you can plan ahead.',
       'Crowd updates and safety tips will now reach you instantly.',
       'Location-based notifications help you discover nearby pandals.',
       'Fun alerts like step counts, badges, and memory prompts keep the experience engaging.',
       'Added Terms of Service and Privacy Policy links to the app footer.'
    ],
    CRITICAL_UPDATE: false, // Set to true for mandatory updates
    MIN_SUPPORTED_VERSION: '1.0.0'

};

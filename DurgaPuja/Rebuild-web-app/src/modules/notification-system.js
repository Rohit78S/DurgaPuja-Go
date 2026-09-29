// notification-system.js - Professional Push Notification System for Durga Puja App

class NotificationSystem {
    constructor() {
        this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        this.permission = Notification.permission;
        this.subscriptionKey = 'puja-notifications-subscription';
        this.settingsKey = 'puja-notification-settings';
        
        // Default notification settings
        this.settings = this.loadSettings();
        
        this.initializeSystem();
    }

    loadSettings() {
        const defaultSettings = {
            updates: true,
            pujaReminders: true,
            gpsTracking: true,
            generalAlerts: false,
            soundEnabled: true,
            vibrationEnabled: true
        };
        
        const saved = localStorage.getItem(this.settingsKey);
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    }

    async initializeSystem() {
        if (!this.isSupported) {
            console.warn('Push notifications not supported');
            return;
        }

        // Initialize service worker registration
        await this.registerServiceWorker();
        
        // Check existing permission
        this.permission = Notification.permission;
        
        console.log('Notification system initialized');
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                this.swRegistration = registration;
                console.log('Service Worker registered for notifications');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    // Request notification permission with professional UI
    async requestPermission() {
        if (!this.isSupported) {
            return false;
        }

        if (this.permission === 'granted') {
            return true;
        }

        // Show custom permission dialog first
        const userConsent = await this.showPermissionDialog();
        if (!userConsent) {
            return false;
        }

        // Request browser permission
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                await this.subscribeToNotifications();
                this.showPermissionSuccessMessage();
                return true;
            } else {
                this.showPermissionDeniedMessage();
                return false;
            }
        } catch (error) {
            console.error('Permission request failed:', error);
            return false;
        }
    }

    showPermissionDialog() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'notification-permission-modal';
            modal.innerHTML = `
                <div class="permission-modal-content">
                    <div class="permission-header">
                        <div class="permission-icon">🔔</div>
                        <h3>Stay Updated with Durga Puja 2025</h3>
                    </div>
                    
                    <div class="permission-body">
                        <p>Get timely notifications about:</p>
                        <ul class="permission-benefits">
                            <li>📅 Important Puja dates and timings</li>
                            <li>🔄 App updates with new features</li>
                            <li>📍 GPS tracking reminders</li>
                            <li>⚡ Emergency alerts during festivals</li>
                        </ul>
                        
                        <div class="permission-note">
                            <small>You can change these settings anytime in the app menu.</small>
                        </div>
                    </div>
                    
                    <div class="permission-actions">
                        <button class="btn-allow" onclick="resolvePermission(true)">
                            Allow Notifications
                        </button>
                        <button class="btn-deny" onclick="resolvePermission(false)">
                            Not Now
                        </button>
                    </div>
                </div>
            `;

            // Add to DOM
            document.body.appendChild(modal);
            
            // Global resolve function
            window.resolvePermission = (allowed) => {
                modal.remove();
                delete window.resolvePermission;
                resolve(allowed);
            };

            // Show modal with animation
            setTimeout(() => modal.classList.add('show'), 100);
        });
    }

    showPermissionSuccessMessage() {
        this.showToast('🎉 Notifications enabled! You\'ll receive important updates about Durga Puja 2025.', 'success', 5000);
    }

    showPermissionDeniedMessage() {
        this.showToast('📵 Notifications disabled. You can enable them later from your browser settings.', 'info', 5000);
    }

    async subscribeToNotifications() {
        if (!this.swRegistration) {
            console.error('Service worker not registered');
            return;
        }

        try {
            // Check if already subscribed
            const existingSubscription = await this.swRegistration.pushManager.getSubscription();
            if (existingSubscription) {
                console.log('Already subscribed to notifications');
                return;
            }

            // Subscribe to push notifications
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.getVapidPublicKey())
            });

            // Store subscription
            localStorage.setItem(this.subscriptionKey, JSON.stringify(subscription));
            
            console.log('Subscribed to push notifications');
        } catch (error) {
            console.error('Failed to subscribe to notifications:', error);
        }
    }

    // VAPID public key (you'll need to generate this for production)
    getVapidPublicKey() {
        return 'BCF8Q_9X-GYpQbTlI4_rHPW6FKW4T-r5Q2QjVv7aT4dQqyJZj9WJ8QHVo5zNjMKGO-Lz7LzGQs8YNVsB7N5KqLo';
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Send different types of notifications
    async sendUpdateNotification(updateInfo) {
        if (!this.settings.updates || this.permission !== 'granted') {
            return;
        }

        const notification = {
            title: '🚀 Durga Puja App Updated',
            body: `New version ${updateInfo.version} is available with exciting features!`,
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-96x96.png',
            data: {
                type: 'update',
                url: '/',
                version: updateInfo.version
            },
            actions: [
                {
                    action: 'update',
                    title: 'Update Now'
                },
                {
                    action: 'dismiss',
                    title: 'Later'
                }
            ],
            tag: 'app-update',
            renotify: true,
            requireInteraction: true
        };

        await this.showNotification(notification);
    }

    async sendPujaDateNotification(dateInfo) {
        if (!this.settings.pujaReminders || this.permission !== 'granted') {
            return;
        }

        const notification = {
            title: `🎭 ${dateInfo.name} - ${dateInfo.date}`,
            body: `Don't miss ${dateInfo.name}! Plan your pandal visits and enjoy the festivities.`,
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-96x96.png',
            data: {
                type: 'puja-date',
                url: '/?section=pandals',
                date: dateInfo.date,
                event: dateInfo.name
            },
            actions: [
                {
                    action: 'open',
                    title: 'View Pandals'
                },
                {
                    action: 'remind_later',
                    title: 'Remind Later'
                }
            ],
            tag: `puja-${dateInfo.name.toLowerCase()}`,
            requireInteraction: true,
            timestamp: Date.now()
        };

        await this.showNotification(notification);
    }

    async sendGPSTrackingNotification() {
        if (!this.settings.gpsTracking || this.permission !== 'granted') {
            return;
        }

        const notification = {
            title: '📍 GPS Tracking Active',
            body: 'Your pandal route is being tracked. What\'s your plan for today\'s puja hopping?',
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-96x96.png',
            data: {
                type: 'gps-tracking',
                url: '/?section=map'
            },
            actions: [
                {
                    action: 'view_route',
                    title: 'View Route'
                },
                {
                    action: 'stop_tracking',
                    title: 'Stop Tracking'
                }
            ],
            tag: 'gps-active',
            silent: false
        };

        await this.showNotification(notification);
    }

    async sendEmergencyAlert(alertInfo) {
        // Emergency alerts bypass user settings
        if (this.permission !== 'granted') {
            return;
        }

        const notification = {
            title: '🚨 Emergency Alert',
            body: alertInfo.message,
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-96x96.png',
            data: {
                type: 'emergency',
                url: '/?section=emergency',
                alertId: alertInfo.id
            },
            actions: [
                {
                    action: 'view_details',
                    title: 'View Details'
                }
            ],
            tag: `emergency-${alertInfo.id}`,
            requireInteraction: true,
            silent: false,
            vibrate: [200, 100, 200, 100, 200]
        };

        await this.showNotification(notification);
    }

    async showNotification(options) {
        if (!this.swRegistration) {
            // Fallback to browser notification
            new Notification(options.title, {
                body: options.body,
                icon: options.icon,
                badge: options.badge,
                tag: options.tag,
                data: options.data,
                silent: !this.settings.soundEnabled,
                vibrate: this.settings.vibrationEnabled ? options.vibrate : undefined
            });
            return;
        }

        try {
            await this.swRegistration.showNotification(options.title, options);
        } catch (error) {
            console.error('Failed to show notification:', error);
        }
    }

    // Scheduled notifications for Puja dates
    schedulePujaNotifications() {
        const pujaEvents = [
            { name: 'Mahalaya', date: '2025-09-21', daysBefore: 1 },
            { name: 'Sasthi', date: '2025-09-28', daysBefore: 1 },
            { name: 'Saptami', date: '2025-09-29', daysBefore: 0 },
            { name: 'Astami', date: '2025-09-30', daysBefore: 0 },
            { name: 'Navami', date: '2025-10-01', daysBefore: 0 },
            { name: 'Dashami', date: '2025-10-02', daysBefore: 1 }
        ];

        pujaEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const notificationDate = new Date(eventDate);
            notificationDate.setDate(eventDate.getDate() - event.daysBefore);
            notificationDate.setHours(9, 0, 0, 0); // 9 AM notification

            const now = new Date();
            const timeUntilNotification = notificationDate.getTime() - now.getTime();

            if (timeUntilNotification > 0) {
                setTimeout(() => {
                    this.sendPujaDateNotification({
                        name: event.name,
                        date: eventDate.toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })
                    });
                }, timeUntilNotification);
                
                console.log(`Scheduled ${event.name} notification for ${notificationDate.toLocaleString()}`);
            }
        });
    }

    // GPS tracking notification (one-time per session)
    scheduleGPSTrackingNotification() {
        const gpsNotificationShown = sessionStorage.getItem('gps-notification-shown');
        
        if (!gpsNotificationShown && this.settings.gpsTracking) {
            // Show GPS notification 2 minutes after app starts
            setTimeout(() => {
                this.sendGPSTrackingNotification();
                sessionStorage.setItem('gps-notification-shown', 'true');
            }, 2 * 60 * 1000); // 2 minutes
        }
    }

    // Settings management
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        
        if (newSettings.pujaReminders) {
            this.schedulePujaNotifications();
        }
        
        if (newSettings.gpsTracking) {
            this.scheduleGPSTrackingNotification();
        }
    }

    // Show notification settings modal
    showNotificationSettings() {
        const modal = document.createElement('div');
        modal.className = 'notification-settings-modal';
        modal.innerHTML = `
            <div class="settings-modal-content">
                <div class="settings-header">
                    <h3>🔔 Notification Settings</h3>
                    <button class="settings-close" onclick="this.closest('.notification-settings-modal').remove()">×</button>
                </div>
                
                <div class="settings-body">
                    <div class="settings-section">
                        <h4>Notification Types</h4>
                        
                        <div class="settings-item">
                            <label class="settings-toggle">
                                <input type="checkbox" ${this.settings.updates ? 'checked' : ''} 
                                       onchange="notificationSystem.updateSettings({updates: this.checked})">
                                <span class="toggle-slider"></span>
                                App Updates
                            </label>
                            <small>Get notified when new app versions are available</small>
                        </div>
                        
                        <div class="settings-item">
                            <label class="settings-toggle">
                                <input type="checkbox" ${this.settings.pujaReminders ? 'checked' : ''} 
                                       onchange="notificationSystem.updateSettings({pujaReminders: this.checked})">
                                <span class="toggle-slider"></span>
                                Puja Date Reminders
                            </label>
                            <small>Reminders for important Durga Puja dates</small>
                        </div>
                        
                        <div class="settings-item">
                            <label class="settings-toggle">
                                <input type="checkbox" ${this.settings.gpsTracking ? 'checked' : ''} 
                                       onchange="notificationSystem.updateSettings({gpsTracking: this.checked})">
                                <span class="toggle-slider"></span>
                                GPS Tracking Alerts
                            </label>
                            <small>Notifications when GPS tracking is active</small>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h4>Notification Behavior</h4>
                        
                        <div class="settings-item">
                            <label class="settings-toggle">
                                <input type="checkbox" ${this.settings.soundEnabled ? 'checked' : ''} 
                                       onchange="notificationSystem.updateSettings({soundEnabled: this.checked})">
                                <span class="toggle-slider"></span>
                                Sound
                            </label>
                        </div>
                        
                        <div class="settings-item">
                            <label class="settings-toggle">
                                <input type="checkbox" ${this.settings.vibrationEnabled ? 'checked' : ''} 
                                       onchange="notificationSystem.updateSettings({vibrationEnabled: this.checked})">
                                <span class="toggle-slider"></span>
                                Vibration
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-actions">
                        <button class="btn-test-notification" onclick="notificationSystem.testNotification()">
                            Test Notification
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 100);
    }

    // Test notification
    async testNotification() {
        await this.showNotification({
            title: '🎭 Test Notification',
            body: 'This is a test notification for your Durga Puja app!',
            icon: '/android-chrome-192x192.png',
            badge: '/android-chrome-96x96.png',
            tag: 'test-notification',
            data: { type: 'test' }
        });

        this.showToast('Test notification sent!', 'success');
    }

    // Utility function for toast messages
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `notification-toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Initialize on app start
    async initialize() {
        if (!this.isSupported) {
            console.warn('Notifications not supported on this device');
            return;
        }

        // Schedule Puja notifications
        this.schedulePujaNotifications();
        
        // Schedule GPS notification
        this.scheduleGPSTrackingNotification();
        
        // Request permission if not already granted
        if (this.permission === 'default') {
            // Show request after 30 seconds of app usage
            setTimeout(() => {
                this.requestPermission();
            }, 30000);
        }
    }
}

// Initialize notification system
let notificationSystem;

document.addEventListener('DOMContentLoaded', () => {
    notificationSystem = new NotificationSystem();
    notificationSystem.initialize();
    
    // Make globally available
    window.notificationSystem = notificationSystem;
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationSystem;
}

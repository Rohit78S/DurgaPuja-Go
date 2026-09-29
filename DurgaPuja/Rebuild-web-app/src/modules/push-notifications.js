// push-notifications.js - Advanced Push Notification Service for Durga Puja App

class PushNotificationService {
    constructor() {
        this.subscriptionsKey = 'puja-push-subscriptions';
        this.messageQueue = [];
        this.isProcessing = false;
        this.retryAttempts = 3;
        this.retryDelay = 5000;
        
        this.initializeService();
    }

    async initializeService() {
        // Load saved subscriptions
        this.subscriptions = this.loadSubscriptions();
        
        // Setup message handlers
        this.setupMessageHandlers();
        
        console.log('Push Notification Service initialized');
    }

    loadSubscriptions() {
        try {
            const stored = localStorage.getItem(this.subscriptionsKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load subscriptions:', error);
            return [];
        }
    }

    saveSubscriptions() {
        try {
            localStorage.setItem(this.subscriptionsKey, JSON.stringify(this.subscriptions));
        } catch (error) {
            console.error('Failed to save subscriptions:', error);
        }
    }

    setupMessageHandlers() {
        // Handle messages from main thread
        if (typeof window !== 'undefined') {
            window.addEventListener('message', this.handleMessage.bind(this));
        }
        
        // Handle service worker messages
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        }
    }

    handleMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'SCHEDULE_NOTIFICATION':
                this.scheduleNotification(data);
                break;
            case 'CANCEL_NOTIFICATION':
                this.cancelNotification(data.id);
                break;
            case 'SEND_IMMEDIATE':
                this.sendImmediateNotification(data);
                break;
        }
    }

    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;
        
        if (type === 'NOTIFICATION_CLICKED') {
            this.handleNotificationClick(data);
        }
    }

    // Create notification templates for different scenarios
    createNotificationTemplate(type, data) {
        const templates = {
            update: {
                title: 'Durga Puja App Updated',
                body: `New version ${data.version} available with exciting features!`,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-96x96.png',
                tag: 'app-update',
                actions: [
                    { action: 'update', title: 'Update Now' },
                    { action: 'dismiss', title: 'Later' }
                ],
                data: { type: 'update', url: '/', ...data },
                requireInteraction: true
            },
            
            puja_reminder: {
                title: `${data.event} - ${data.date}`,
                body: `Don't miss ${data.event}! Perfect time for pandal hopping.`,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-96x96.png',
                tag: `puja-${data.event.toLowerCase()}`,
                actions: [
                    { action: 'view_pandals', title: 'View Pandals' },
                    { action: 'set_reminder', title: 'Remind Later' }
                ],
                data: { type: 'puja_reminder', url: '/?section=pandals', ...data },
                requireInteraction: true,
                timestamp: Date.now()
            },
            
            gps_active: {
                title: 'GPS Tracking Active',
                body: 'Your pandal route is being tracked. Enjoying the puja hopping?',
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-96x96.png',
                tag: 'gps-tracking',
                actions: [
                    { action: 'view_route', title: 'View Route' },
                    { action: 'stop_tracking', title: 'Stop' }
                ],
                data: { type: 'gps_tracking', url: '/?section=map', ...data },
                silent: false
            },
            
            pandal_nearby: {
                title: 'Pandal Nearby!',
                body: `${data.pandalName} is just ${data.distance}m away. Want to visit?`,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-96x96.png',
                tag: `nearby-${data.pandalId}`,
                actions: [
                    { action: 'navigate', title: 'Navigate' },
                    { action: 'bookmark', title: 'Bookmark' }
                ],
                data: { type: 'pandal_nearby', pandalId: data.pandalId, ...data },
                silent: true
            },
            
            weather_alert: {
                title: 'Weather Alert',
                body: `${data.condition} expected. Plan your pandal visits accordingly.`,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-96x96.png',
                tag: 'weather-alert',
                actions: [
                    { action: 'view_weather', title: 'View Forecast' }
                ],
                data: { type: 'weather_alert', url: '/?weather=true', ...data }
            },
            
            milestone: {
                title: 'Achievement Unlocked!',
                body: `You've visited ${data.count} pandals! You earned the "${data.badge}" badge.`,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-96x96.png',
                tag: `achievement-${data.badge}`,
                actions: [
                    { action: 'view_badges', title: 'View Badges' }
                ],
                data: { type: 'achievement', url: '/?section=badges', ...data },
                vibrate: [200, 100, 200]
            },
            
            emergency: {
                title: 'Emergency Alert',
                body: data.message,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-96x96.png',
                tag: `emergency-${data.id}`,
                actions: [
                    { action: 'view_details', title: 'Details' }
                ],
                data: { type: 'emergency', url: '/?section=emergency', ...data },
                requireInteraction: true,
                vibrate: [200, 100, 200, 100, 200],
                silent: false
            }
        };

        return templates[type] || null;
    }

    // Schedule a notification for a specific time
    scheduleNotification(notificationData) {
        const { type, scheduledTime, data } = notificationData;
        const template = this.createNotificationTemplate(type, data);
        
        if (!template) {
            console.error('Unknown notification type:', type);
            return;
        }

        const now = Date.now();
        const delay = scheduledTime - now;
        
        if (delay <= 0) {
            // Send immediately if time has passed
            this.sendImmediateNotification({ type, data });
            return;
        }

        // Schedule for future
        const timeoutId = setTimeout(() => {
            this.sendImmediateNotification({ type, data });
        }, delay);

        // Store for potential cancellation
        const scheduledNotification = {
            id: `${type}-${Date.now()}`,
            type,
            data,
            scheduledTime,
            timeoutId,
            template
        };

        this.messageQueue.push(scheduledNotification);
        
        console.log(`Notification scheduled for ${new Date(scheduledTime).toLocaleString()}`);
    }

    // Cancel a scheduled notification
    cancelNotification(notificationId) {
        const index = this.messageQueue.findIndex(item => item.id === notificationId);
        
        if (index !== -1) {
            const notification = this.messageQueue[index];
            if (notification.timeoutId) {
                clearTimeout(notification.timeoutId);
            }
            this.messageQueue.splice(index, 1);
            console.log('Notification cancelled:', notificationId);
        }
    }

    // Send notification immediately
    async sendImmediateNotification(notificationData) {
        const { type, data } = notificationData;
        const template = this.createNotificationTemplate(type, data);
        
        if (!template) {
            console.error('Unknown notification type:', type);
            return;
        }

        try {
            await this.sendNotification(template);
        } catch (error) {
            console.error('Failed to send notification:', error);
            this.queueForRetry(notificationData);
        }
    }

    // Send notification through service worker
    async sendNotification(notificationOptions) {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker not supported');
        }

        const registration = await navigator.serviceWorker.ready;
        
        if (!registration) {
            throw new Error('Service Worker not registered');
        }

        // Check notification permission
        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return;
        }

        // Send through service worker for background capability
        await registration.showNotification(notificationOptions.title, {
            body: notificationOptions.body,
            icon: notificationOptions.icon,
            badge: notificationOptions.badge,
            tag: notificationOptions.tag,
            data: notificationOptions.data,
            actions: notificationOptions.actions,
            requireInteraction: notificationOptions.requireInteraction,
            silent: notificationOptions.silent,
            vibrate: notificationOptions.vibrate,
            timestamp: notificationOptions.timestamp || Date.now()
        });

        console.log('Notification sent:', notificationOptions.title);
    }

    // Queue failed notification for retry
    queueForRetry(notificationData) {
        const retryItem = {
            ...notificationData,
            retryCount: (notificationData.retryCount || 0) + 1,
            nextRetry: Date.now() + this.retryDelay
        };

        if (retryItem.retryCount <= this.retryAttempts) {
            setTimeout(() => {
                this.sendImmediateNotification(retryItem);
            }, this.retryDelay);
            
            console.log(`Notification queued for retry ${retryItem.retryCount}/${this.retryAttempts}`);
        } else {
            console.error('Notification failed after all retry attempts');
        }
    }

    // Handle notification click events
    handleNotificationClick(eventData) {
        const { action, data } = eventData;
        
        switch (action) {
            case 'update':
                this.handleUpdateAction(data);
                break;
            case 'view_pandals':
            case 'view_route':
            case 'view_weather':
            case 'view_badges':
                this.handleNavigationAction(data);
                break;
            case 'navigate':
                this.handleNavigationToPandal(data);
                break;
            case 'bookmark':
                this.handleBookmarkPandal(data);
                break;
            case 'stop_tracking':
                this.handleStopTracking();
                break;
            case 'set_reminder':
                this.handleSetReminder(data);
                break;
            default:
                this.handleDefaultAction(data);
        }
    }

    handleUpdateAction(data) {
        // Focus window and trigger update
        this.focusApp();
        this.postMessage({ type: 'TRIGGER_UPDATE', data });
    }

    handleNavigationAction(data) {
        this.focusApp();
        if (data.url) {
            window.location.href = data.url;
        }
    }

    handleNavigationToPandal(data) {
        this.focusApp();
        this.postMessage({ 
            type: 'NAVIGATE_TO_PANDAL', 
            data: { pandalId: data.pandalId }
        });
    }

    handleBookmarkPandal(data) {
        this.postMessage({ 
            type: 'BOOKMARK_PANDAL', 
            data: { pandalId: data.pandalId }
        });
    }

    handleStopTracking() {
        this.postMessage({ type: 'STOP_GPS_TRACKING' });
    }

    handleSetReminder(data) {
        const reminderTime = Date.now() + (30 * 60 * 1000); // 30 minutes
        this.scheduleNotification({
            type: 'puja_reminder',
            scheduledTime: reminderTime,
            data: data
        });
    }

    handleDefaultAction(data) {
        this.focusApp();
        if (data.url) {
            window.location.href = data.url;
        }
    }

    // Focus or open the app
    async focusApp() {
        if ('serviceWorker' in navigator) {
            const clients = await self.clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            });

            // Focus existing window if available
            for (const client of clients) {
                if (client.url.includes(location.origin)) {
                    return client.focus();
                }
            }

            // Open new window if no existing window
            return self.clients.openWindow('/');
        }
    }

    // Post message to main thread
    postMessage(message) {
        if (typeof window !== 'undefined' && window.postMessage) {
            window.postMessage(message, '*');
        }
    }

    // Predefined notification schedules
    scheduleAllPujaNotifications() {
        const pujaEvents = [
            {
                name: 'Mahalaya',
                date: '2025-09-21',
                notificationTime: '2025-09-20T09:00:00.000Z' // 1 day before at 9 AM
            },
            {
                name: 'Sasthi',
                date: '2025-09-28',
                notificationTime: '2025-09-27T20:00:00.000Z' // Evening before
            },
            {
                name: 'Saptami',
                date: '2025-09-29',
                notificationTime: '2025-09-29T08:00:00.000Z' // Morning of
            },
            {
                name: 'Astami',
                date: '2025-09-30',
                notificationTime: '2025-09-30T08:00:00.000Z' // Morning of
            },
            {
                name: 'Navami',
                date: '2025-10-01',
                notificationTime: '2025-10-01T08:00:00.000Z' // Morning of
            },
            {
                name: 'Dashami',
                date: '2025-10-02',
                notificationTime: '2025-10-02T07:00:00.000Z' // Early morning
            }
        ];

        pujaEvents.forEach(event => {
            const scheduledTime = new Date(event.notificationTime).getTime();
            
            this.scheduleNotification({
                type: 'puja_reminder',
                scheduledTime: scheduledTime,
                data: {
                    event: event.name,
                    date: new Date(event.date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                    })
                }
            });
        });

        console.log('All Puja notifications scheduled');
    }

    // GPS tracking notification (one-time per session)
    scheduleGPSNotification() {
        const sessionKey = 'gps-notification-session';
        const sessionShown = sessionStorage.getItem(sessionKey);
        
        if (!sessionShown) {
            // Schedule GPS notification for 2 minutes after app start
            const gpsTime = Date.now() + (2 * 60 * 1000);
            
            this.scheduleNotification({
                type: 'gps_active',
                scheduledTime: gpsTime,
                data: {
                    message: 'GPS tracking can help you navigate between pandals efficiently.'
                }
            });
            
            sessionStorage.setItem(sessionKey, 'true');
            console.log('GPS notification scheduled');
        }
    }

    // Weather-based notifications
    scheduleWeatherNotifications(weatherData) {
        if (weatherData.alerts && weatherData.alerts.length > 0) {
            weatherData.alerts.forEach(alert => {
                this.scheduleNotification({
                    type: 'weather_alert',
                    scheduledTime: Date.now() + 1000, // Immediate
                    data: {
                        condition: alert.event,
                        description: alert.description
                    }
                });
            });
        }
    }

    // Achievement notifications
    sendAchievementNotification(achievement) {
        this.sendImmediateNotification({
            type: 'milestone',
            data: {
                badge: achievement.name,
                count: achievement.count,
                points: achievement.points
            }
        });
    }

    // Cleanup expired notifications
    cleanupExpiredNotifications() {
        const now = Date.now();
        this.messageQueue = this.messageQueue.filter(item => {
            if (item.scheduledTime < now - (24 * 60 * 60 * 1000)) { // 24 hours old
                if (item.timeoutId) {
                    clearTimeout(item.timeoutId);
                }
                return false;
            }
            return true;
        });
    }

    // Get notification statistics
    getNotificationStats() {
        return {
            scheduled: this.messageQueue.length,
            subscriptions: this.subscriptions.length,
            permission: Notification.permission,
            supported: 'Notification' in window
        };
    }
}

// Initialize push notification service
let pushNotificationService;

if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        pushNotificationService = new PushNotificationService();
        window.pushNotificationService = pushNotificationService;
    });
}

// Export for service worker
if (typeof self !== 'undefined' && typeof module !== 'undefined') {
    module.exports = PushNotificationService;
}

// Export for ES modules
export default PushNotificationService;

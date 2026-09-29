// version-config.js - Version Configuration File
const APP_CONFIG = {
    VERSION: '8.2.0-beta',
    BUILD_DATE: '2025-09-21',
    UPDATE_CHECK_URL: './version-check.json', // Fixed: Use local path for testing
    FEATURES: [
       ' We’ve upgraded our notification system to keep you better informed during Durga Puja.',
       ' Get timely reminders for Puja dates, daily highlights, and special events.',
       ' Receive real-time weather alerts so you can plan ahead.',
       ' Crowd updates and safety tips will now reach you instantly.',
       ' Location-based notifications help you discover nearby pandals.',
       ' Fun alerts like step counts, badges, and memory prompts keep the experience engaging.',
       ' Added Terms of Service and Privacy Policy links to the app footer.'
    ],
    CRITICAL_UPDATE: false, // Set to true for mandatory updates
    MIN_SUPPORTED_VERSION: '1.0.0'
};

// update-manager.js - Main Update Management System
class UpdateManager {
    constructor() {
        this.currentVersion = APP_CONFIG.VERSION;
        this.updateCheckInterval = 30 * 60 * 1000; // Check every 30 minutes
        this.lastUpdateCheck = localStorage.getItem('lastUpdateCheck') || Date.now();
        this.updateDismissed = localStorage.getItem('updateDismissed') || '';
        this.isOnline = navigator.onLine;
        
        this.initializeUpdateSystem();
    }

    initializeUpdateSystem() {
        // Check for updates on app load
        this.checkForUpdates();
        
        // Set up periodic update checks
        this.startPeriodicChecks();
        
        // Listen for online/offline events
        this.setupNetworkListeners();
        
        // Check for service worker updates
        this.setupServiceWorkerUpdates();
    }

    async checkForUpdates() {
        if (!this.isOnline) {
            console.log('Offline - skipping update check');
            return;
        }

        const now = Date.now();
        const timeSinceLastCheck = now - parseInt(this.lastUpdateCheck);
        
        // Don't check too frequently unless it's the first load
        if (timeSinceLastCheck < this.updateCheckInterval && this.lastUpdateCheck !== 0) {
            return;
        }

        try {
            console.log('Checking for app updates...');
            const response = await fetch(APP_CONFIG.UPDATE_CHECK_URL + `?v=${Date.now()}`, {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const serverConfig = await response.json();
            localStorage.setItem('lastUpdateCheck', now.toString());

            this.processUpdateInfo(serverConfig);

        } catch (error) {
            console.error('Update check failed:', error);
            // Use fallback update check method
            this.fallbackUpdateCheck();
        }
    }

    processUpdateInfo(serverConfig) {
        const serverVersion = serverConfig.VERSION;
        const currentVersion = this.currentVersion;

        if (this.isNewerVersion(serverVersion, currentVersion)) {
            console.log(`Update available: ${currentVersion} -> ${serverVersion}`);
            
            // Don't show if user already dismissed this version
            if (this.updateDismissed === serverVersion) {
                return;
            }

            this.showUpdateNotification(serverConfig);
        } else {
            console.log('App is up to date');
            this.hideUpdateNotification();
        }
    }

    isNewerVersion(serverVersion, currentVersion) {
        // Fixed: Handle beta versions properly
        const parseVersion = (version) => {
            const cleanVersion = version.replace(/-beta|-alpha|-rc\d*/, '');
            return cleanVersion.split('.').map(num => parseInt(num, 10));
        };

        const server = parseVersion(serverVersion);
        const current = parseVersion(currentVersion);

        for (let i = 0; i < Math.max(server.length, current.length); i++) {
            const s = server[i] || 0;
            const c = current[i] || 0;
            
            if (s > c) return true;
            if (s < c) return false;
        }
        
        return false;
    }

    showUpdateNotification(updateInfo) {
        // Remove existing update notification
        this.hideUpdateNotification();

        const updateContainer = document.createElement('div');
        updateContainer.id = 'updateNotification';
        updateContainer.className = 'update-notification';
        
        const isCritical = updateInfo.CRITICAL_UPDATE;
        const features = updateInfo.FEATURES || [];

        updateContainer.innerHTML = `
            <div class="update-content">
                <div class="update-header">
                    <div class="update-icon">
                        <i class="fas fa-download"></i>
                    </div>
                    <div class="update-info">
                        <h3>
                            ${isCritical ? ' Critical Update Available' : ' New Update Available'}
                        </h3>
                        <p>Version ${updateInfo.VERSION} is ready to install</p>
                    </div>
                    ${!isCritical ? `
                        <button class="update-dismiss" onclick="updateManager.dismissUpdate('${updateInfo.VERSION}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </div>
                
                <div class="update-features">
                    <h4>What's New:</h4>
                    <ul>
                        ${features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="update-actions">
                    <button class="btn-update-now" onclick="updateManager.applyUpdate()">
                        <i class="fas fa-rocket"></i>
                        Update Now
                    </button>
                    ${!isCritical ? `
                        <button class="btn-update-later" onclick="updateManager.updateLater()">
                            Update Later
                        </button>
                    ` : ''}
                </div>
                
                <div class="update-progress" id="updateProgress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <p class="progress-text" id="progressText">Preparing update...</p>
                </div>
            </div>
        `;

        document.body.appendChild(updateContainer);
        
        // Show with animation
        setTimeout(() => {
            updateContainer.classList.add('show');
        }, 100);

        // Auto-show for critical updates
        if (isCritical) {
            this.showCriticalUpdateModal(updateInfo);
        }
    }

    showCriticalUpdateModal(updateInfo) {
        const modal = document.createElement('div');
        modal.className = 'update-modal critical-update';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="critical-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Critical Update Required</h2>
                </div>
                <div class="critical-body">
                    <p>This update contains important security fixes and improvements.</p>
                    <p><strong>Version ${updateInfo.VERSION}</strong> must be installed to continue using the app.</p>
                </div>
                <div class="critical-actions">
                    <button class="btn-update-critical" onclick="updateManager.applyUpdate()">
                        <i class="fas fa-shield-alt"></i>
                        Install Update Now
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    hideUpdateNotification() {
        const existing = document.getElementById('updateNotification');
        if (existing) {
            existing.classList.add('hide');
            setTimeout(() => existing.remove(), 300);
        }
    }

    dismissUpdate(version) {
        localStorage.setItem('updateDismissed', version);
        this.hideUpdateNotification();
        this.showToast('Update dismissed. You can check for updates later in Settings.', 'info');
    }

    updateLater() {
        this.hideUpdateNotification();
        this.showToast('We\'ll remind you about this update later.', 'info');
    }

    async applyUpdate() {
        const progressContainer = document.getElementById('updateProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        try {
            // Step 1: Clear old caches
            this.updateProgress(10, 'Clearing old data...', progressFill, progressText);
            await this.clearAppCaches();

            // Step 2: Download new version
            this.updateProgress(30, 'Downloading update...', progressFill, progressText);
            await this.downloadUpdate();

            // Step 3: Update service worker
            this.updateProgress(60, 'Installing update...', progressFill, progressText);
            await this.updateServiceWorker();

            // Step 4: Update local version
            this.updateProgress(80, 'Finalizing...', progressFill, progressText);
            await this.updateLocalVersion();

            // Step 5: Complete
            this.updateProgress(100, 'Update complete!', progressFill, progressText);

            // Show success and reload
            setTimeout(() => {
                this.showUpdateSuccessModal();
            }, 1000);

        } catch (error) {
            console.error('Update failed:', error);
            this.showUpdateErrorModal(error);
        }
    }

    updateProgress(percentage, message, progressFill, progressText) {
        if (progressFill) progressFill.style.width = percentage + '%';
        if (progressText) progressText.textContent = message;
    }

    async clearAppCaches() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }
    }

    async downloadUpdate() {
        // Simulate download process
        return new Promise(resolve => {
            setTimeout(resolve, 2000);
        });
    }

    async updateServiceWorker() {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                await registration.update();
            }
        }
    }

    async updateLocalVersion() {
        // Clear dismissed updates
        localStorage.removeItem('updateDismissed');
        
        // Update last check time
        localStorage.setItem('lastUpdateCheck', Date.now().toString());
        
        return new Promise(resolve => {
            setTimeout(resolve, 1000);
        });
    }

    showUpdateSuccessModal() {
        const modal = document.createElement('div');
        modal.className = 'update-modal success-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="success-header">
                    <i class="fas fa-check-circle"></i>
                    <h2>Update Successful!</h2>
                </div>
                <div class="success-body">
                    <p>Your Durga Puja Guide has been updated successfully.</p>
                    <p>The app will reload to apply all changes.</p>
                </div>
                <div class="success-actions">
                    <button class="btn-reload" onclick="updateManager.reloadApp()">
                        <i class="fas fa-redo"></i>
                        Reload App
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-reload after 5 seconds
        setTimeout(() => {
            this.reloadApp();
        }, 5000);
    }

    showUpdateErrorModal(error) {
        const modal = document.createElement('div');
        modal.className = 'update-modal error-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="error-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Update Failed</h2>
                </div>
                <div class="error-body">
                    <p>The update could not be completed.</p>
                    <p>Please check your internet connection and try again.</p>
                    <small>Error: ${error.message}</small>
                </div>
                <div class="error-actions">
                    <button class="btn-retry" onclick="updateManager.applyUpdate()">
                        <i class="fas fa-redo"></i>
                        Try Again
                    </button>
                    <button class="btn-dismiss" onclick="this.closest('.update-modal').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    reloadApp() {
        window.location.reload(true);
    }

    fallbackUpdateCheck() {
        const buildDate = new Date(APP_CONFIG.BUILD_DATE);
        const daysSinceBuild = (Date.now() - buildDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceBuild > 7) {
            this.showGenericUpdateReminder();
        }
    }

    showGenericUpdateReminder() {
        if (this.updateDismissed === 'generic-reminder') return;

        this.showToast(
            'Hey! Check if a newer version of the app is available for the best Durga Puja experience! 🎭',
            'info',
            8000
        );
    }

    startPeriodicChecks() {
        setInterval(() => {
            if (this.isOnline) {
                this.checkForUpdates();
            }
        }, this.updateCheckInterval);
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Back online - checking for updates');
            this.checkForUpdates();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Gone offline - pausing update checks');
        });
    }

    setupServiceWorkerUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service Worker updated');
                this.showToast('App has been updated in the background!', 'success');
            });

            navigator.serviceWorker.ready.then(registration => {
                registration.addEventListener('updatefound', () => {
                    console.log('New Service Worker found');
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showServiceWorkerUpdateNotification();
                        }
                    });
                });
            });
        }
    }

    showServiceWorkerUpdateNotification() {
        this.showToast(
            'New version ready! Click here to update.',
            'info',
            0, // Don't auto-hide
            () => this.applyUpdate()
        );
    }

    showToast(message, type = 'info', duration = 5000, onClick = null) {
        const toast = document.createElement('div');
        toast.className = `update-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
                <span>${message}</span>
                <button class="toast-close" onclick="this.closest('.update-toast').remove()">×</button>
            </div>
        `;

        if (onClick) {
            toast.style.cursor = 'pointer';
            toast.onclick = onClick;
        }

        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('hide');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    }

    // Manual update check (called from settings or menu)
    manualUpdateCheck() {
        this.lastUpdateCheck = 0; // Force immediate check
        this.showToast('Checking for updates...', 'info');
        this.checkForUpdates();
    }

    // Get current app info - FIXED: Handle 0 timestamp properly
    getAppInfo() {
        return {
            version: this.currentVersion,
            buildDate: APP_CONFIG.BUILD_DATE,
            lastUpdateCheck: this.lastUpdateCheck === 0 || this.lastUpdateCheck === '0' ? 'Never' : new Date(parseInt(this.lastUpdateCheck)).toLocaleString(),
            isOnline: this.isOnline
        };
    }
}

// Initialize update manager when DOM is loaded
let updateManager;
document.addEventListener('DOMContentLoaded', () => {
    updateManager = new UpdateManager();
    
    // Make it globally available
    window.updateManager = updateManager;
});

// Add manual update check to existing menu
function addUpdateCheckToMenu() {
    const menuHTML = `
        <div class="menu-item" onclick="updateManager.manualUpdateCheck(); closeSideMenu();">
            <i class="fas fa-sync-alt"></i>
            <span data-en="Check for Updates" data-bn="আপডেট চেক করুন">Check for Updates</span>
        </div>
        <div class="menu-item" onclick="showAppInfo(); closeSideMenu();">
            <i class="fas fa-info-circle"></i>
            <span data-en="App Info" data-bn="অ্যাপ তথ্য">App Info</span>
        </div>
    `;
    
    // Add to existing side menu
    const sideMenu = document.getElementById('sideMenu');
    if (sideMenu) {
        sideMenu.insertAdjacentHTML('beforeend', menuHTML);
    }
}

// Show app information
function showAppInfo() {
    const appInfo = updateManager.getAppInfo();
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
            <h2>App Information</h2>
            <div style="line-height: 1.8;">
                <p><strong>Version:</strong> ${appInfo.version}</p>
                <p><strong>Build Date:</strong> ${appInfo.buildDate}</p>
                <p><strong>Last Update Check:</strong> ${appInfo.lastUpdateCheck}</p>
                <p><strong>Connection:</strong> ${appInfo.isOnline ? 'Online ' : 'Offline '}</p>
            </div>
            <div style="margin-top: 2rem;">
                <button class="btn" onclick="updateManager.manualUpdateCheck()">
                    <i class="fas fa-sync-alt"></i>
                    Check for Updates
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Add update check to existing global functions
window.showAppInfo = showAppInfo;
window.addUpdateCheckToMenu = addUpdateCheckToMenu;

// Call this after your existing initialization
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(addUpdateCheckToMenu, 1000);
});

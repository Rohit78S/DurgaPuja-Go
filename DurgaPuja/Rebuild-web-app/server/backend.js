/**
 * backend.js — Durga Puja Guide · Firebase Firestore Backend v3
 * ==============================================================
 * Listens to 'appstate-saved' custom event fired by script.js save()
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey:            "YOUR_FIREBASE_API_KEY",
    authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
    projectId:         "YOUR_PROJECT_ID",
    storageBucket:     "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId:             "YOUR_APP_ID",
    measurementId:     "YOUR_MEASURMENT_ID"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const Backend = {
    currentUserId: null,
    syncInProgress: false,
    pendingSave: false,

    getUserId() {
        try {
            const raw = localStorage.getItem('userData') || sessionStorage.getItem('userData');
            if (!raw) return null;
            const user = JSON.parse(raw);
            const uid = user.sub || user.id || user.email;
            if (!uid) return null;
            return 'u_' + uid.replace(/[\/\\.#$\[\]\s]/g, '_').slice(0, 100);
        } catch { return null; }
    },

    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true' ||
            sessionStorage.getItem('isLoggedIn') === 'true';
    },

    async saveState(stateObj) {
        const userId = this.currentUserId || this.getUserId();
        if (!userId) return;

        if (this.syncInProgress) { this.pendingSave = true; return; }
        this.syncInProgress = true;

        try {
            let meta = { lastSeen: serverTimestamp() };
            try {
                const raw = localStorage.getItem('userData') || sessionStorage.getItem('userData');
                if (raw) {
                    const u = JSON.parse(raw);
                    meta.name  = u.name  || u.given_name || '';
                    meta.email = u.email || '';
                }
            } catch { /* ignore */ }

            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
                bookmarks: stateObj.bookmarked || [],
                visited:   stateObj.visited   || [],
                points:    stateObj.points    || 0,
                badges:    stateObj.badges    || [],
                routes:    stateObj.routes    || [],
                meta
            }, { merge: true });

            console.log(`[Backend] Saved — ${(stateObj.bookmarked||[]).length} bookmarks, ${(stateObj.visited||[]).length} visited`);
        } catch (err) {
            console.warn('[Backend] Save error:', err);
        } finally {
            this.syncInProgress = false;
            if (this.pendingSave) {
                this.pendingSave = false;
                const s = window.__appState;
                if (s) this.saveState(s);
            }
        }
    },

    async loadUserData(userId) {
        userId = userId || this.getUserId();
        if (!userId) return;
        this.currentUserId = userId;

        try {
            const userRef = doc(db, 'users', userId);
            const snap = await getDoc(userRef);

            if (!snap.exists()) {
                console.log('[Backend] New user — will save on first bookmark');
                return;
            }

            const data = snap.data();

            // Write to localStorage — script.js reads from there on init
            if (Array.isArray(data.bookmarks) && data.bookmarks.length > 0)
                localStorage.setItem('bookmarkedPandals', JSON.stringify(data.bookmarks));
            if (Array.isArray(data.visited) && data.visited.length > 0)
                localStorage.setItem('visitedPandals', JSON.stringify(data.visited));
            if (typeof data.points === 'number' && data.points > 0)
                localStorage.setItem('userPoints', String(data.points));
            if (Array.isArray(data.badges) && data.badges.length > 0)
                localStorage.setItem('userBadges', JSON.stringify(data.badges));
            if (Array.isArray(data.routes) && data.routes.length > 0)
                localStorage.setItem('userRoutes', JSON.stringify(data.routes));

            // Also update live state if available
            const s = window.__appState;
            if (s) {
                if (Array.isArray(data.bookmarks)) s.bookmarked = data.bookmarks;
                if (Array.isArray(data.visited))   s.visited   = data.visited;
                if (typeof data.points === 'number') s.points  = data.points;
                if (Array.isArray(data.badges))    s.badges    = data.badges;
                if (Array.isArray(data.routes))    s.routes    = data.routes;

                if (typeof generatePandalCards === 'function') generatePandalCards();
                if (typeof updateProgress === 'function') updateProgress();
            }

            console.log(`[Backend] Loaded — ${(data.bookmarks||[]).length} bookmarks, ${(data.visited||[]).length} visited`);
        } catch (err) {
            console.warn('[Backend] Load error:', err);
        }
    },

    patchLogout() {
        const self = this;
        const interval = setInterval(() => {
            if (typeof window.handleLogout === 'function') {
                clearInterval(interval);
                const orig = window.handleLogout;
                window.handleLogout = async function (...args) {
                    const s = window.__appState;
                    if (s) await self.saveState(s);
                    self.currentUserId = null;
                    orig.apply(this, args);
                };
                console.log('[Backend] handleLogout patched ✓');
            }
        }, 200);
    },

    watchLoginState() {
        const self = this;
        let wasLoggedIn = this.isLoggedIn();
        setInterval(async () => {
            const now = self.isLoggedIn();
            if (!wasLoggedIn && now) {
                wasLoggedIn = true;
                const uid = self.getUserId();
                if (uid) {
                    self.currentUserId = uid;
                    console.log('[Backend] Login detected — loading from Firestore');
                    // Wait a moment for page to settle
                    setTimeout(() => self.loadUserData(uid), 1000);
                }
            } else if (wasLoggedIn && !now) {
                wasLoggedIn = false;
                self.currentUserId = null;
            }
        }, 500);
    },

    init() {
        console.log('[Backend] Firebase Firestore backend v3 starting...');

        // Listen for every appState.save() call
        window.addEventListener('appstate-saved', (e) => {
            if (this.isLoggedIn()) {
                this.saveState(e.detail);
            }
        });

        this.patchLogout();
        this.watchLoginState();

        // If already logged in on page load
        if (this.isLoggedIn()) {
            const uid = this.getUserId();
            if (uid) {
                this.currentUserId = uid;
                // Load after page settles
                setTimeout(() => this.loadUserData(uid), 1500);
            }
        }

        console.log('[Backend] Ready Logged in:', this.isLoggedIn());
    }
};

window.PujaBackend = Backend;
Backend.init();

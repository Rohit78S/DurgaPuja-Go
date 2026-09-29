/**
 * crowd-checkin.js — Live Crowd Check-in System
 * Inline card popup, 20s auto-dismiss, smart background prompts
 */

var CrowdCheckin = {
    projectId: 'durgapujaweb-9c4e0',
    apiKey: 'AIzaSyAv0gd2oJegFl_t2HnIvm0WsOm0b9NaBtw',
    liveData: {},
    pollInterval: null,
    promptInterval: null,
    lastActivity: Date.now(),
    promptShown: false,

    getUserName: function() {
        try {
            var raw = localStorage.getItem('userData') || sessionStorage.getItem('userData');
            if (!raw) return 'Visitor';
            var u = JSON.parse(raw);
            return u.given_name || u.name || 'Visitor';
        } catch(e) { return 'Visitor'; }
    },

    getUserId: function() {
        try {
            var raw = localStorage.getItem('userData') || sessionStorage.getItem('userData');
            if (!raw) return null;
            var u = JSON.parse(raw);
            var uid = u.sub || u.id || u.email;
            return uid ? uid.replace(/[^a-zA-Z0-9]/g,'_').slice(0,40) : null;
        } catch(e) { return null; }
    },

    // ── Firestore ─────────────────────────────────────────────────────────────
    toVal: function(v) {
        if (v === null || v === undefined) return {nullValue:null};
        if (typeof v === 'boolean') return {booleanValue:v};
        if (typeof v === 'number') return Number.isInteger(v) ? {integerValue:String(v)} : {doubleValue:v};
        if (typeof v === 'string') return {stringValue:v};
        if (typeof v === 'object') {
            var f={}, self=this;
            Object.keys(v).forEach(function(k){ f[k]=self.toVal(v[k]); });
            return {mapValue:{fields:f}};
        }
        return {stringValue:String(v)};
    },
    fromVal: function(v) {
        if (!v) return null;
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue);
        if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.nullValue !== undefined) return null;
        if (v.mapValue) return this.fromDoc(v.mapValue);
        return null;
    },
    fromDoc: function(doc) {
        if (!doc||!doc.fields) return {};
        var r={}, self=this;
        Object.keys(doc.fields).forEach(function(k){ r[k]=self.fromVal(doc.fields[k]); });
        return r;
    },
    toDoc: function(data) {
        var f={}, self=this;
        Object.keys(data).forEach(function(k){ f[k]=self.toVal(data[k]); });
        return {fields:f};
    },
    fsSet: async function(path, data) {
        try {
            var keys = Object.keys(data);
            var mask = '&' + keys.map(function(k){ return 'updateMask.fieldPaths='+k; }).join('&');
            var url = 'https://firestore.googleapis.com/v1/projects/'+this.projectId+'/databases/(default)/documents/'+path+'?key='+this.apiKey+mask;
            var r = await fetch(url, {method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(this.toDoc(data))});
            return r.ok;
        } catch(e) { return false; }
    },
    fsList: async function(path) {
        try {
            var r = await fetch('https://firestore.googleapis.com/v1/projects/'+this.projectId+'/databases/(default)/documents/'+path+'?key='+this.apiKey+'&pageSize=100');
            if (!r.ok) return [];
            var data = await r.json();
            var self = this;
            return (data.documents||[]).map(function(d){
                var obj = self.fromDoc(d);
                obj._id = d.name.split('/').pop();
                return obj;
            });
        } catch(e) { return []; }
    },

    // ── Check In ──────────────────────────────────────────────────────────────
    checkIn: async function(pandalId, pandalName, level) {
        var uid = this.getUserId();
        if (!uid) { alert('Please log in to check in'); return; }
        var checkin = {
            pandalId: pandalId,
            pandalName: pandalName,
            level: level,
            userName: this.getUserName(),
            userId: uid,
            timestamp: Date.now(),
            expiresAt: Date.now() + (2 * 60 * 60 * 1000)
        };
        var ok = await this.fsSet('crowd/'+pandalId+'/checkins/'+uid, checkin);
        if (ok) {
            this.lastActivity = Date.now();
            this.showCheckinToast(pandalName, level);
            await this.loadCrowdForPandal(pandalId);
            this.updateCardUI(pandalId);
        }
    },

    // ── Load crowd data ───────────────────────────────────────────────────────
    loadAllCrowd: async function() {
        var cards = document.querySelectorAll('.pandal-card[data-id]');
        var ids = [];
        cards.forEach(function(c){ if (c.dataset.id) ids.push(c.dataset.id); });
        var self = this;
        var now = Date.now();
        await Promise.all(ids.map(function(id){ return self.loadCrowdForPandal(id, now); }));
        this.updateAllCards();
    },

    loadCrowdForPandal: async function(pandalId, now) {
        now = now || Date.now();
        var checkins = await this.fsList('crowd/'+pandalId+'/checkins');
        var active = checkins.filter(function(c){ return c.expiresAt && c.expiresAt > now; });
        if (!active.length) { this.liveData[pandalId] = null; return; }
        var counts = {low:0, medium:0, high:0};
        active.forEach(function(c){ if (counts[c.level]!==undefined) counts[c.level]++; });
        var level = Object.keys(counts).reduce(function(a,b){ return counts[a]>=counts[b]?a:b; });
        this.liveData[pandalId] = {
            level: level,
            count: active.length,
            lastUpdated: Math.max.apply(null, active.map(function(c){ return c.timestamp||0; }))
        };
    },

    updateAllCards: function() {
        var self = this;
        document.querySelectorAll('.pandal-card[data-id]').forEach(function(card){
            self.updateCardUI(card.dataset.id, card);
        });
    },

    updateCardUI: function(pandalId, card) {
        card = card || document.querySelector('.pandal-card[data-id="'+pandalId+'"]');
        if (!card) return;
        var data = this.liveData[pandalId];
        var indicator = card.querySelector('.crowd-indicator');
        if (indicator && data) {
            var emoji = data.level==='high'?'🔴':data.level==='medium'?'🟡':'🟢';
            var label = data.level.charAt(0).toUpperCase()+data.level.slice(1);
            indicator.className = 'crowd-indicator crowd-'+data.level+' crowd-live';
            indicator.innerHTML = emoji+' '+label+'<br><small>'+data.count+' report'+(data.count>1?'s':'')+' · '+this.timeAgo(data.lastUpdated)+'</small>';
        }
        // Add report button if not there
        if (!card.querySelector('.checkin-btn')) {
            var btnContainer = card.querySelector('div[style*="margin-top"]') || card.lastElementChild;
            if (btnContainer) {
                var pName = card.querySelector('.pandal-name') ? card.querySelector('.pandal-name').textContent : pandalId;
                var btn = document.createElement('button');
                btn.className = 'btn checkin-btn';
                btn.setAttribute('data-pandal-id', pandalId);
                btn.setAttribute('data-pandal-name', pName);
                btn.innerHTML = '<i class="fas fa-users"></i> <span>Report Crowd</span>';
                var self = this;
                btn.onclick = function(e) {
                    e.stopPropagation();
                    self.showInlinePopup(pandalId, pName, card);
                };
                btnContainer.appendChild(btn);
            }
        }
    },

    timeAgo: function(ts) {
        if (!ts) return '';
        var mins = Math.floor((Date.now()-ts)/60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins+'m ago';
        return Math.floor(mins/60)+'h ago';
    },

    // ── Inline Card Popup (THE NEW FEATURE) ──────────────────────────────────
    showInlinePopup: function(pandalId, pandalName, card, isPrompt) {
        // Remove any existing popups
        document.querySelectorAll('.crowd-inline-popup').forEach(function(p){ p.remove(); });
        clearTimeout(window._crowdPopupTimer);

        this.lastActivity = Date.now();

        var data = this.liveData[pandalId];
        var currentHtml = data ?
            '<div class="crowd-popup-current">Current: '+
            (data.level==='high'?'🔴 High':data.level==='medium'?'🟡 Medium':'🟢 Low')+
            ' · '+data.count+' report'+(data.count>1?'s':'')+
            '</div>' : '';

        var promptMsg = isPrompt ?
            '<div class="crowd-popup-prompt">👋 You\'ve been here a while! How\'s the crowd at '+pandalName+'?</div>' : '';

        var popup = document.createElement('div');
        popup.className = 'crowd-inline-popup';
        popup.setAttribute('data-pandal', pandalId);

        var self = this;

        popup.innerHTML =
            '<div class="crowd-popup-inner">' +
            '<div class="crowd-popup-header">' +
            '<span class="crowd-popup-title">📍 '+( isPrompt ? 'Quick check — how\'s it?' : 'Report Crowd')+'</span>' +
            '<button class="crowd-popup-cancel" title="Cancel">✕</button>' +
            '</div>' +
            promptMsg +
            currentHtml +
            '<div class="crowd-popup-timer"><div class="crowd-popup-timer-bar"></div></div>' +
            '<div class="crowd-popup-options">' +
            '<button class="crowd-popup-opt opt-low" data-level="low">🟢<br><small>Low</small></button>' +
            '<button class="crowd-popup-opt opt-medium" data-level="medium">🟡<br><small>Medium</small></button>' +
            '<button class="crowd-popup-opt opt-high" data-level="high">🔴<br><small>High</small></button>' +
            '</div>' +
            '<div class="crowd-popup-hint">Auto-closes in <span class="crowd-countdown">20</span>s</div>' +
            '</div>';

        // Position popup inside the card
        card.style.position = 'relative';
        card.appendChild(popup);

        // Trigger animation
        requestAnimationFrame(function(){
            popup.classList.add('crowd-popup-show');
        });

        // Cancel button
        popup.querySelector('.crowd-popup-cancel').onclick = function(e) {
            e.stopPropagation();
            self.closePopup(popup);
        };

        // Option buttons
        popup.querySelectorAll('.crowd-popup-opt').forEach(function(btn) {
            btn.onclick = function(e) {
                e.stopPropagation();
                var level = btn.getAttribute('data-level');
                self.checkIn(pandalId, pandalName, level);
                self.closePopup(popup);
            };
        });

        // Countdown timer
        var secs = 20;
        var countdown = popup.querySelector('.crowd-countdown');
        var timerBar = popup.querySelector('.crowd-popup-timer-bar');
        timerBar.style.transition = 'width 20s linear';
        requestAnimationFrame(function(){
            timerBar.style.width = '0%';
        });

        var countInterval = setInterval(function(){
            secs--;
            if (countdown) countdown.textContent = secs;
            if (secs <= 0) {
                clearInterval(countInterval);
                self.closePopup(popup);
            }
        }, 1000);

        popup._countInterval = countInterval;

        // Auto-close after 20s
        window._crowdPopupTimer = setTimeout(function(){
            self.closePopup(popup);
        }, 20000);
    },

    closePopup: function(popup) {
        if (!popup) return;
        clearInterval(popup._countInterval);
        popup.classList.remove('crowd-popup-show');
        popup.classList.add('crowd-popup-hide');
        setTimeout(function(){ if (popup.parentNode) popup.remove(); }, 300);
    },

    // ── Smart Background Prompt ───────────────────────────────────────────────
    // After 20-30 min of inactivity, ask user about crowd
    startSmartPrompt: function() {
        var self = this;
        var PROMPT_DELAY = (20 + Math.floor(Math.random() * 10)) * 60 * 1000; // 20-30 min

        // Track user activity
        ['click','scroll','touchstart','keydown'].forEach(function(evt){
            document.addEventListener(evt, function(){
                self.lastActivity = Date.now();
                self.promptShown = false; // reset so we can prompt again later
            }, {passive: true});
        });

        this.promptInterval = setInterval(function(){
            if (self.promptShown) return;
            var idle = Date.now() - self.lastActivity;
            if (idle < PROMPT_DELAY) return;

            // Find a recently visited pandal to ask about
            var visitedIds = [];
            if (window.__appState && window.__appState.visited) {
                visitedIds = window.__appState.visited;
            }

            // Pick a visible pandal card to prompt about
            var cards = document.querySelectorAll('.pandal-card[data-id]');
            var target = null;
            var targetId = null;
            var targetName = null;

            // Prefer a visited pandal
            if (visitedIds.length) {
                var vid = visitedIds[visitedIds.length - 1];
                var vc = document.querySelector('.pandal-card[data-id="'+vid+'"]');
                if (vc) { target = vc; targetId = vid; }
            }
            // Otherwise pick random visible card
            if (!target && cards.length) {
                var idx = Math.floor(Math.random() * cards.length);
                target = cards[idx];
                targetId = target.dataset.id;
            }

            if (!target || !targetId) return;
            targetName = target.querySelector('.pandal-name') ? target.querySelector('.pandal-name').textContent : targetId;

            self.promptShown = true;
            self.lastActivity = Date.now(); // reset timer

            // Scroll card into view and show prompt
            target.scrollIntoView({behavior:'smooth', block:'center'});
            setTimeout(function(){
                self.showInlinePopup(targetId, targetName, target, true);
            }, 600);

        }, 60000); // check every minute
    },

    showCheckinToast: function(pandalName, level) {
        var emoji = level==='high'?'🔴':level==='medium'?'🟡':'🟢';
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#28a745;color:white;padding:12px 24px;border-radius:25px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.3);max-width:90vw;text-align:center;transition:opacity 0.3s';
        toast.textContent = '✅ Reported '+emoji+' at '+pandalName+' — thanks!';
        document.body.appendChild(toast);
        setTimeout(function(){ toast.style.opacity='0'; setTimeout(function(){ toast.remove(); },300); }, 3000);
    },

    startPolling: function() {
        var self = this;
        this.loadAllCrowd();
        this.pollInterval = setInterval(function(){ self.loadAllCrowd(); }, 60000);
    },

    init: function() {
        var self = this;
        function tryInit() {
            var cards = document.querySelectorAll('.pandal-card[data-id]');
            if (cards.length > 0) {
                self.startPolling();
                self.startSmartPrompt();
                console.log('[CrowdCheckin] Ready for', cards.length, 'pandals');
            } else {
                setTimeout(tryInit, 1000);
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function(){ setTimeout(tryInit, 1500); });
        } else {
            setTimeout(tryInit, 1500);
        }
    }
};

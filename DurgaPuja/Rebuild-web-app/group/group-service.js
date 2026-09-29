var GroupService = {
    currentGroup: null,
    currentGroupId: null,
    currentUserId: null,
    currentUserName: null,
    pollInterval: null,
    chatPollInterval: null,
    locationWatchId: null,
    projectId: 'durgapujaweb-9c4e0',
    apiKey: 'AIzaSyAv0gd2oJegFl_t2HnIvm0WsOm0b9NaBtw',

    getUserId: function() {
        try {
            var raw = localStorage.getItem('userData') || sessionStorage.getItem('userData');
            if (!raw) return null;
            var u = JSON.parse(raw);
            var uid = u.sub || u.id || u.email;
            return uid ? 'u_' + uid.replace(/[\/\\.#$\[\]\s]/g,'_').slice(0,80) : null;
        } catch(e) { return null; }
    },

    getUserName: function() {
        try {
            var raw = localStorage.getItem('userData') || sessionStorage.getItem('userData');
            if (!raw) return 'Friend';
            var u = JSON.parse(raw);
            return u.given_name || u.name || (u.email ? u.email.split('@')[0] : 'Friend');
        } catch(e) { return 'Friend'; }
    },

    generateCode: function() {
        var c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        var r = '';
        for (var i = 0; i < 6; i++) r += c[Math.floor(Math.random() * c.length)];
        return r;
    },

    // ── Firestore REST Helpers ────────────────────────────────────────────────
    toVal: function(v) {
        if (v === null || v === undefined) return { nullValue: null };
        if (typeof v === 'boolean') return { booleanValue: v };
        if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
        if (typeof v === 'string') return { stringValue: v };
        if (Array.isArray(v)) return { arrayValue: { values: v.map(this.toVal.bind(this)) } };
        if (typeof v === 'object') {
            var f = {}, self = this;
            Object.keys(v).forEach(function(k) { if (v.hasOwnProperty(k)) f[k] = self.toVal(v[k]); });
            return { mapValue: { fields: f } };
        }
        return { stringValue: String(v) };
    },

    fromVal: function(v) {
        if (!v) return null;
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue);
        if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.nullValue !== undefined) return null;
        if (v.arrayValue) return (v.arrayValue.values || []).map(this.fromVal.bind(this));
        if (v.mapValue) return this.fromDoc(v.mapValue);
        return null;
    },

    fromDoc: function(doc) {
        if (!doc || !doc.fields) return {};
        var r = {}, self = this;
        Object.keys(doc.fields).forEach(function(k) { r[k] = self.fromVal(doc.fields[k]); });
        return r;
    },

    toDoc: function(data) {
        var f = {}, self = this;
        Object.keys(data).forEach(function(k) { f[k] = self.toVal(data[k]); });
        return { fields: f };
    },

    fsGet: async function(path) {
        try {
            var url = 'https://firestore.googleapis.com/v1/projects/' + this.projectId +
                '/databases/(default)/documents/' + path + '?key=' + this.apiKey;
            var r = await fetch(url);
            if (!r.ok) return null;
            return this.fromDoc(await r.json());
        } catch(e) { return null; }
    },

    fsSet: async function(path, data) {
        try {
            var keys = Object.keys(data);
            var mask = '&' + keys.map(function(k) { return 'updateMask.fieldPaths=' + k; }).join('&');
            var url = 'https://firestore.googleapis.com/v1/projects/' + this.projectId +
                '/databases/(default)/documents/' + path + '?key=' + this.apiKey + mask;
            var r = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.toDoc(data))
            });
            return r.ok;
        } catch(e) { console.warn('[Groups] fsSet error:', e); return false; }
    },

    // Add a document to a subcollection (for chat messages)
    fsAdd: async function(collectionPath, data) {
        try {
            var url = 'https://firestore.googleapis.com/v1/projects/' + this.projectId +
                '/databases/(default)/documents/' + collectionPath + '?key=' + this.apiKey;
            var r = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.toDoc(data))
            });
            return r.ok;
        } catch(e) { console.warn('[Groups] fsAdd error:', e); return false; }
    },

    // List a subcollection (for chat messages)
    fsList: async function(path) {
        try {
            var url = 'https://firestore.googleapis.com/v1/projects/' + this.projectId +
                '/databases/(default)/documents/' + path + '?key=' + this.apiKey + '&pageSize=50';
            var r = await fetch(url);
            if (!r.ok) return [];
            var data = await r.json();
            return (data.documents || []).map(this.fromDoc.bind(this));
        } catch(e) { return []; }
    },

    fsQuery: async function(col, field, value) {
        try {
            var url = 'https://firestore.googleapis.com/v1/projects/' + this.projectId +
                '/databases/(default)/documents:runQuery?key=' + this.apiKey;
            var body = {
                structuredQuery: {
                    from: [{ collectionId: col }],
                    where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } }
                }
            };
            var r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!r.ok) return [];
            var res = await r.json();
            var self = this;
            return res.filter(function(x) { return x.document; })
                .map(function(x) { return { id: x.document.name.split('/').pop(), data: self.fromDoc(x.document) }; });
        } catch(e) { return []; }
    },

    // ── Group CRUD ────────────────────────────────────────────────────────────
    createGroup: async function(name) {
        this.currentUserId = this.getUserId();
        this.currentUserName = this.getUserName();
        if (!this.currentUserId) throw new Error('Please log in first');
        var code = this.generateCode();
        var gid = 'grp_' + code;
        var mn = {}; mn[this.currentUserId] = this.currentUserName;
        var data = {
            name: name || this.currentUserName + "'s Puja Group",
            inviteCode: code,
            createdBy: this.currentUserId,
            members: [this.currentUserId],
            memberNames: mn,
            bookmarks: [],
            visited: [],
            locations: {}
        };
        var ok = await this.fsSet('groups/' + gid, data);
        if (!ok) throw new Error('Failed to create group');
        this.currentGroupId = gid;
        this.currentGroup = data;
        localStorage.setItem('activeGroupId', gid);
        this.showActiveGroup(data);
        this.startPolling(gid);
        this.startChatPolling(gid);
        return { groupId: gid, code: code };
    },

    joinByCode: async function(code) {
        this.currentUserId = this.getUserId();
        this.currentUserName = this.getUserName();
        if (!this.currentUserId) throw new Error('Please log in first');
        code = code.toUpperCase().trim();
        var results = await this.fsQuery('groups', 'inviteCode', code);
        if (!results.length) return false;
        var gid = results[0].id;
        var data = results[0].data;
        var members = data.members || [];
        if (members.indexOf(this.currentUserId) < 0) members.push(this.currentUserId);
        var mn = data.memberNames || {};
        mn[this.currentUserId] = this.currentUserName;
        data.members = members;
        data.memberNames = mn;
        await this.fsSet('groups/' + gid, data);
        this.currentGroupId = gid;
        this.currentGroup = data;
        localStorage.setItem('activeGroupId', gid);
        this.showActiveGroup(data);
        this.startPolling(gid);
        this.startChatPolling(gid);
        return true;
    },

    // ── UI Updates ────────────────────────────────────────────────────────────
    showActiveGroup: function(g) {
        var setup = document.getElementById('group-setup');
        var active = document.getElementById('group-active');
        if (setup) setup.style.display = 'none';
        if (active) { active.style.display = 'block'; active.classList.remove('hidden'); }
        var el = document.getElementById('group-name-display');
        if (el) el.textContent = g.name || 'My Group';
        el = document.getElementById('group-code-display');
        if (el) el.textContent = g.inviteCode || '------';
        var ml = document.getElementById('group-members-list');
        if (ml && g.memberNames) {
            ml.innerHTML = Object.values(g.memberNames).map(function(n) {
                return '<div class="member-chip"><span class="member-chip-avatar">' + n.charAt(0).toUpperCase() + '</span><span>' + n + '</span></div>';
            }).join('');
        }
        var st = document.getElementById('group-stats');
        if (st) {
            st.innerHTML =
                '<div class="group-stat"> <strong>' + (g.bookmarks || []).length + '</strong> bookmarks</div>' +
                '<div class="group-stat"> <strong>' + (g.visited || []).length + '</strong> visited</div>' +
                '<div class="group-stat"> <strong>' + (g.members || []).length + '</strong> members</div>';
        }
        this.updateLocationDisplay(g.locations || {});
        this.refreshPandalCards(g);
    },

    startPolling: function(gid) {
        var self = this;
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(async function() {
            var data = await self.fsGet('groups/' + gid);
            if (data) {
                self.currentGroup = data;
                self.showActiveGroup(data);
            }
        }, 8000);
    },

    // ── Location ──────────────────────────────────────────────────────────────
    updateLocationDisplay: function(locs) {
        var c = document.getElementById('group-member-locations');
        if (!c) return;
        var myId = this.currentUserId;
        var myLoc = locs[myId];
        var friends = [];
        var self = this;
        Object.keys(locs).forEach(function(uid) {
            if (uid !== myId) friends.push({ uid: uid, loc: locs[uid] });
        });
        if (!friends.length) {
            c.innerHTML = '<p class="group-no-location">No friends sharing location right now</p>';
            return;
        }
        c.innerHTML = friends.map(function(f) {
            var loc = f.loc;
            var age = Date.now() - loc.updatedAt;
            var live = age < 120000;
            var dist = (myLoc && myLoc.lat) ? '<div class="member-distance">📍 ' + self.calcDist(myLoc.lat, myLoc.lng, loc.lat, loc.lng) + ' from you</div>' : '';
            var mapsUrl = 'https://www.google.com/maps?q=' + loc.lat + ',' + loc.lng;
            return '<div class="member-location-card ' + (live ? 'active' : 'stale') + '" onclick="window.open(\'' + mapsUrl + '\',\'_blank\')" style="cursor:pointer">' +
                '<div class="member-avatar">' + loc.name.charAt(0).toUpperCase() + '</div>' +
                '<div class="member-info"><strong>' + loc.name + '</strong>' +
                '<span class="member-status">' + (live ? 'Live' : ' ' + Math.floor(age / 60000) + 'm ago') + '</span>' +
                dist + '</div><div style="margin-left:auto;font-size:1.2rem">🗺️</div></div>';
        }).join('');
    },

    calcDist: function(lat1, lng1, lat2, lng2) {
        var R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
        var km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return km < 1 ? Math.round(km * 1000) + 'm' : km.toFixed(1) + 'km';
    },

    startSharingLocation: function() {
        var self = this;
        if (!navigator.geolocation || !this.currentGroupId) return;
        this.locationWatchId = navigator.geolocation.watchPosition(function(pos) {
            var locs = (self.currentGroup && self.currentGroup.locations) || {};
            locs[self.currentUserId] = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: self.currentUserName, updatedAt: Date.now() };
            if (self.currentGroup) self.currentGroup.locations = locs;
            var data = Object.assign({}, self.currentGroup);
            data.locations = locs;
            self.fsSet('groups/' + self.currentGroupId, data);
        }, null, { enableHighAccuracy: true, maximumAge: 15000 });
    },

    stopSharingLocation: function() {
        if (this.locationWatchId) navigator.geolocation.clearWatch(this.locationWatchId);
        this.locationWatchId = null;
    },

    // ── Pandal Card Badges ────────────────────────────────────────────────────
    refreshPandalCards: function(g) {
        if (!g) return;
        var bm = g.bookmarks || [];
        var vi = g.visited || [];
        document.querySelectorAll('.pandal-card').forEach(function(card) {
            var id = card.dataset.pandalId || card.dataset.id;
            if (!id) return;
            card.querySelectorAll('.group-badge').forEach(function(b) { b.remove(); });
            var ref = card.querySelector('.pandal-name') || card.querySelector('h3') || card.firstElementChild;
            if (!ref) return;
            if (bm.indexOf(id) >= 0) {
                var b = document.createElement('div'); b.className = 'group-badge group-bookmark-badge'; b.textContent = 'Group bookmarked';
                ref.parentNode.insertBefore(b, ref);
            }
            if (vi.indexOf(id) >= 0) {
                var v = document.createElement('div'); v.className = 'group-badge group-visited-badge'; v.textContent = 'Group visited';
                ref.parentNode.insertBefore(v, ref);
            }
        });
    },

    // ── Leave Group ───────────────────────────────────────────────────────────
    leaveGroup: async function() {
        if (!this.currentGroupId || !this.currentGroup) return;
        this.stopSharingLocation();
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this.chatPollInterval) clearInterval(this.chatPollInterval);
        var data = Object.assign({}, this.currentGroup);
        var self = this;
        data.members = (data.members || []).filter(function(m) { return m !== self.currentUserId; });
        await this.fsSet('groups/' + this.currentGroupId, data);
        localStorage.removeItem('activeGroupId');
        this.currentGroup = null;
        this.currentGroupId = null;
        var setup = document.getElementById('group-setup');
        var active = document.getElementById('group-active');
        if (setup) setup.style.display = '';
        if (active) active.style.display = 'none';
    },

    // ── E2E Chat ──────────────────────────────────────────────────────────────
    setupE2E: async function() {
        if (!this.currentUserId) return;
        try {
            var result = await GroupCrypto.init(this.currentUserId);
            var existing = await this.fsGet('users/' + this.currentUserId);
            if (!existing || existing.publicKey !== result.publicKeyB64) {
                await this.fsSet('users/' + this.currentUserId, { publicKey: result.publicKeyB64 });
                console.log('[E2E] Public key uploaded');
            }
            if (result.isNew) {
                this.showE2ESetup();
            } else if (existing && existing.wrappedPrivKey && !GroupCrypto.isUnlocked()) {
                this.showE2EUnlock();
            }
        } catch(e) { console.warn('[E2E] Setup error:', e); }
    },

    showE2ESetup: function() {
        var box = document.getElementById('group-chat-messages');
        if (!box) return;
        box.innerHTML =
            '<div class="chat-e2e-setup">' +
            '<div style="font-size:2rem"></div>' +
            '<strong>Secure your chat</strong>' +
            '<p>Set a password to protect your messages on new devices.</p>' +
            '<input type="password" id="e2e-password-input" placeholder="Choose a strong password" class="chat-input" style="margin:0.6rem 0;border-radius:10px;width:100%">' +
            '<button onclick="saveE2EPassword()" class="chat-send-btn" style="width:100%;border-radius:10px">Secure my chat</button>' +
            '<button onclick="skipE2ESetup()" style="background:none;border:none;color:var(--text-secondary);font-size:0.8rem;cursor:pointer;margin-top:0.5rem">Skip for now</button>' +
            '</div>';
    },

    showE2EUnlock: function() {
        var box = document.getElementById('group-chat-messages');
        if (!box) return;
        box.innerHTML =
            '<div class="chat-e2e-setup">' +
            '<div style="font-size:2rem"></div>' +
            '<strong>Unlock your messages</strong>' +
            '<p>Enter your chat password to read messages.</p>' +
            '<input type="password" id="e2e-unlock-input" placeholder="Enter your password" class="chat-input" style="margin:0.6rem 0;border-radius:10px;width:100%">' +
            '<button onclick="unlockE2EChat()" class="chat-send-btn" style="width:100%;border-radius:10px">Unlock</button>' +
            '</div>';
    },

    sendMessage: async function(text) {
        if (!this.currentGroupId || !text.trim()) return;
        if (typeof GroupCrypto === 'undefined' || !GroupCrypto.isUnlocked()) {
            alert('Please unlock your encrypted chat first');
            return;
        }
        var members = (this.currentGroup && this.currentGroup.members) || [];
        var ciphertexts = {};
        for (var i = 0; i < members.length; i++) {
            var uid = members[i];
            try {
                var userData = await this.fsGet('users/' + uid);
                if (userData && userData.publicKey) {
                    ciphertexts[uid] = await GroupCrypto.encryptForRecipient(text, userData.publicKey);
                }
            } catch(e) { console.warn('[E2E] Encrypt error for', uid, e); }
        }
        if (!Object.keys(ciphertexts).length) {
            alert('Could not encrypt — no public keys found');
            return;
        }
        var msg = {
            uid: this.currentUserId,
            name: this.currentUserName,
            ciphertexts: ciphertexts,
            time: Date.now(),
            encrypted: true
        };
        await this.fsAdd('groups/' + this.currentGroupId + '/messages', msg);
        this.loadAndRenderChat();
    },

    loadAndRenderChat: async function() {
        if (!this.currentGroupId) return;
        var msgs = await this.fsList('groups/' + this.currentGroupId + '/messages');
        msgs.sort(function(a, b) { return (a.time || 0) - (b.time || 0); });
        this.renderChat(msgs);
    },

    renderChat: async function(msgs) {
        var box = document.getElementById('group-chat-messages');
        if (!box) return;
        if (typeof GroupCrypto === 'undefined' || !GroupCrypto.isUnlocked()) {
            this.showE2EUnlock();
            return;
        }
        if (!msgs || !msgs.length) {
            box.innerHTML = '<div class="chat-empty"> End-to-end encrypted<br>No messages yet. Say hello! </div>';
            return;
        }
        var myId = this.currentUserId;
        var rendered = [];
        for (var i = 0; i < msgs.length; i++) {
            var m = msgs[i];
            var isMe = m.uid === myId;
            var time = m.time ? new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
            var displayText = '';
            if (m.encrypted && m.ciphertexts) {
                var cipher = m.ciphertexts[myId];
                if (cipher) {
                    try { displayText = await GroupCrypto.decryptMessage(cipher); }
                    catch(e) { displayText = ' [Cannot decrypt]'; }
                } else { displayText = ' [Not for you]'; }
            } else {
                displayText = m.text || '';
            }
            rendered.push(
                '<div class="chat-msg ' + (isMe ? 'chat-msg-me' : 'chat-msg-them') + '">' +
                (!isMe ? '<div class="chat-sender">' + escapeHtml(m.name) + '</div>' : '') +
                '<div class="chat-bubble">' + escapeHtml(displayText) + '</div>' +
                '<div class="chat-time"> ' + time + '</div>' +
                '</div>'
            );
        }
        box.innerHTML = rendered.join('');
        box.scrollTop = box.scrollHeight;
    },

    startChatPolling: function(gid) {
        var self = this;
        if (this.chatPollInterval) clearInterval(this.chatPollInterval);
        this.loadAndRenderChat();
        this.chatPollInterval = setInterval(function() { self.loadAndRenderChat(); }, 5000);
    },

    // ── Init ──────────────────────────────────────────────────────────────────
    init: async function() {
        this.currentUserId = this.getUserId();
        this.currentUserName = this.getUserName();
        if (!this.currentUserId) { console.log('[Groups] Not logged in'); return; }
        var gid = localStorage.getItem('activeGroupId');
        if (gid) {
            var data = await this.fsGet('groups/' + gid);
            if (data) {
                this.currentGroupId = gid;
                this.currentGroup = data;
                this.showActiveGroup(data);
                this.startPolling(gid);
                this.startChatPolling(gid);
                console.log('[Groups] Restored group:', data.name);
            }
        }
        console.log('[Groups] Ready for', this.currentUserName);
        if (typeof GroupCrypto !== 'undefined') this.setupE2E().catch(console.warn);
    }
};

// ── Global button functions ───────────────────────────────────────────────────
function escapeHtml(t) {
    if (!t) return '';
    return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function createPujaGroup() {
    GroupService.currentUserId = GroupService.getUserId();
    GroupService.currentUserName = GroupService.getUserName();
    if (!GroupService.currentUserId) { alert('Please log in first'); return; }
    var name = ((document.getElementById('new-group-name') || {}).value || '').trim();
    if (!name) name = GroupService.currentUserName + "'s Puja Group";
    var btn = document.getElementById('create-group-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
    GroupService.createGroup(name).then(function(r) {
        alert('Group created! \nInvite code: ' + r.code + '\n\nShare this with friends!');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Create Group'; }
    }).catch(function(e) {
        alert('Error: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Create Group'; }
    });
}

function joinPujaGroup() {
    GroupService.currentUserId = GroupService.getUserId();
    GroupService.currentUserName = GroupService.getUserName();
    if (!GroupService.currentUserId) { alert('Please log in first'); return; }
    var code = ((document.getElementById('join-code-input') || {}).value || '').trim().toUpperCase();
    if (!code || code.length < 6) { alert('Enter a valid 6-character code'); return; }
    var btn = document.getElementById('join-group-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Joining...'; }
    GroupService.joinByCode(code).then(function(ok) {
        if (ok) alert('Joined group! ');
        else alert('Invalid code — check with your friend');
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Group'; }
    }).catch(function(e) {
        alert('Error: ' + e.message);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Group'; }
    });
}

function copyGroupCode() {
    var el = document.getElementById('group-code-display');
    if (el) navigator.clipboard.writeText(el.textContent).then(function() { alert('Code copied! 📋'); });
}

function shareGroupInvite() {
    var code = ((document.getElementById('group-code-display') || {}).textContent || '');
    var name = ((document.getElementById('group-name-display') || {}).textContent || 'Puja Group');
    var text = 'Join my Durga Puja group "' + name + '"!\nCode: ' + code + '\nApp: https://durgapujaweb-9c4e0.web.app';
    if (navigator.share) navigator.share({ title: 'Join my Puja Group', text: text });
    else navigator.clipboard.writeText(text).then(function() { alert('Invite copied!'); });
}

function toggleLocationSharing() {
    var t = document.getElementById('location-share-toggle');
    if (t && t.checked) { GroupService.startSharingLocation(); alert(' Sharing location with group'); }
    else GroupService.stopSharingLocation();
}

function leavePujaGroup() {
    if (!confirm('Leave this group?')) return;
    GroupService.leaveGroup();
}

async function sendGroupMessage() {
    var input = document.getElementById('group-chat-input');
    if (!input || !input.value.trim()) return;
    var text = input.value.trim();
    input.value = '';
    await GroupService.sendMessage(text);
}

function handleChatKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); }
}

async function saveE2EPassword() {
    var input = document.getElementById('e2e-password-input');
    if (!input || !input.value.trim()) { alert('Enter a password'); return; }
    var pw = input.value.trim();
    if (pw.length < 6) { alert('Password must be at least 6 characters'); return; }
    try {
        await GroupCrypto.savePrivateKeyToCloud(GroupService.currentUserId, pw, GroupService.fsSet.bind(GroupService));
        alert('Chat secured! Remember this password for new devices.');
        var box = document.getElementById('group-chat-messages');
        if (box) box.innerHTML = '<div class="chat-empty"> End-to-end encrypted<br>No messages yet. Say hello! </div>';
    } catch(e) { alert('Error: ' + e.message); }
}

function skipE2ESetup() {
    var box = document.getElementById('group-chat-messages');
    if (box) box.innerHTML = '<div class="chat-empty"> End-to-end encrypted<br>No messages yet. Say hello! </div>';
}

async function unlockE2EChat() {
    var input = document.getElementById('e2e-unlock-input');
    if (!input || !input.value.trim()) { alert('Enter your password'); return; }
    try {
        var userData = await GroupService.fsGet('users/' + GroupService.currentUserId);
        if (!userData || !userData.wrappedPrivKey) { alert('No saved key found. Set up encryption again.'); return; }
        await GroupCrypto.restoreFromCloud(userData.wrappedPrivKey, input.value.trim(), GroupService.currentUserId);
        alert('Chat unlocked! ');
        GroupService.loadAndRenderChat();
    } catch(e) { alert('Wrong password. Try again.'); }
}

// ── Bookmark sync hook ────────────────────────────────────────────────────────
(function() {
    function installHook() {
        if (window.__appState && window.__appState.save) {
            var orig = window.__appState.save.bind(window.__appState);
            window.__appState.save = function() {
                orig();
                if (GroupService.currentGroupId && GroupService.currentGroup) {
                    var bm = window.__appState.bookmarked || [];
                    var vi = window.__appState.visited || [];
                    var gbm = GroupService.currentGroup.bookmarks || [];
                    var gvi = GroupService.currentGroup.visited || [];
                    bm.forEach(function(id) { if (gbm.indexOf(id) < 0) gbm.push(id); });
                    vi.forEach(function(id) { if (gvi.indexOf(id) < 0) gvi.push(id); });
                    GroupService.currentGroup.bookmarks = gbm;
                    GroupService.currentGroup.visited = gvi;
                    var data = Object.assign({}, GroupService.currentGroup);
                    GroupService.fsSet('groups/' + GroupService.currentGroupId, data)
                        .then(function() { GroupService.refreshPandalCards(GroupService.currentGroup); });
                }
            };
            console.log('[Groups] Bookmark hook installed');
        } else { setTimeout(installHook, 500); }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(installHook, 1500); });
    } else { setTimeout(installHook, 1500); }
})();

// ── Auto-init ─────────────────────────────────────────────────────────────────
(function() {
    function tryInit() {
        if (localStorage.getItem('isLoggedIn') === 'true') GroupService.init();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(tryInit, 800); });
    } else { setTimeout(tryInit, 800); }
})();

/**
 * group-crypto.js — E2E Encrypted Group Chat
 * ============================================
 * Uses Web Crypto API (RSA-OAEP 2048 + AES-GCM for key wrapping)
 * - Each user has an RSA key pair
 * - Public key stored in Firestore
 * - Private key wrapped with password-derived AES key, stored in Firestore
 * - Each message encrypted separately for each recipient
 * - Firestore never sees plaintext
 */

var GroupCrypto = {

    // ── Key Storage ───────────────────────────────────────────────────────────
    _privateKey: null,  // CryptoKey in memory (session only)
    _publicKey: null,

    // ── Generate RSA-OAEP Key Pair ────────────────────────────────────────────
    generateKeyPair: async function() {
        var pair = await crypto.subtle.generateKey(
            { name: 'RSA-OAEP', modulusLength: 2048,
                publicExponent: new Uint8Array([1,0,1]),
                hash: 'SHA-256' },
            true, ['encrypt', 'decrypt']
        );
        this._privateKey = pair.privateKey;
        this._publicKey  = pair.publicKey;
        return pair;
    },

    // ── Export public key to base64 string (for Firestore) ───────────────────
    exportPublicKey: async function(key) {
        key = key || this._publicKey;
        var buf = await crypto.subtle.exportKey('spki', key);
        return btoa(String.fromCharCode(...new Uint8Array(buf)));
    },

    // ── Import public key from base64 string ─────────────────────────────────
    importPublicKey: async function(b64) {
        var buf = Uint8Array.from(atob(b64), function(c){ return c.charCodeAt(0); });
        return await crypto.subtle.importKey(
            'spki', buf,
            { name: 'RSA-OAEP', hash: 'SHA-256' },
            true, ['encrypt']
        );
    },

    // ── Derive AES key from password (for wrapping private key) ──────────────
    deriveKeyFromPassword: async function(password, salt) {
        var enc = new TextEncoder();
        var baseKey = await crypto.subtle.importKey(
            'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
        );
        return await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false, ['wrapKey', 'unwrapKey']
        );
    },

    // ── Wrap private key with password → base64 (store in Firestore) ─────────
    wrapPrivateKey: async function(privateKey, password) {
        privateKey = privateKey || this._privateKey;
        var salt = crypto.getRandomValues(new Uint8Array(16));
        var iv   = crypto.getRandomValues(new Uint8Array(12));
        var aesKey = await this.deriveKeyFromPassword(password, salt);
        var wrapped = await crypto.subtle.wrapKey('pkcs8', privateKey, aesKey, { name:'AES-GCM', iv:iv });
        // Pack: salt(16) + iv(12) + wrapped
        var combined = new Uint8Array(16 + 12 + wrapped.byteLength);
        combined.set(salt, 0);
        combined.set(iv, 16);
        combined.set(new Uint8Array(wrapped), 28);
        return btoa(String.fromCharCode(...combined));
    },

    // ── Unwrap private key with password ─────────────────────────────────────
    unwrapPrivateKey: async function(b64, password) {
        var combined = Uint8Array.from(atob(b64), function(c){ return c.charCodeAt(0); });
        var salt    = combined.slice(0, 16);
        var iv      = combined.slice(16, 28);
        var wrapped = combined.slice(28);
        var aesKey  = await this.deriveKeyFromPassword(password, salt);
        var privateKey = await crypto.subtle.unwrapKey(
            'pkcs8', wrapped, aesKey, { name:'AES-GCM', iv:iv },
            { name:'RSA-OAEP', hash:'SHA-256' },
            true, ['decrypt']
        );
        this._privateKey = privateKey;
        return privateKey;
    },

    // ── Encrypt text with a recipient's public key ───────────────────────────
    encryptForRecipient: async function(text, recipientPublicKeyB64) {
        var pubKey = await this.importPublicKey(recipientPublicKeyB64);
        var enc    = new TextEncoder();
        // RSA-OAEP can only encrypt small data; we use a hybrid approach:
        // Generate random AES key, encrypt text with AES, encrypt AES key with RSA
        var aesKey = await crypto.subtle.generateKey({ name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);
        var iv     = crypto.getRandomValues(new Uint8Array(12));
        var encText = await crypto.subtle.encrypt({ name:'AES-GCM', iv:iv }, aesKey, enc.encode(text));
        // Wrap AES key with RSA public key
        var rawAes  = await crypto.subtle.exportKey('raw', aesKey);
        var encAes  = await crypto.subtle.encrypt({ name:'RSA-OAEP' }, pubKey, rawAes);
        // Pack: iv(12) + encAes_len(2) + encAes + encText
        var encAesArr  = new Uint8Array(encAes);
        var encTextArr = new Uint8Array(encText);
        var buf = new Uint8Array(12 + 2 + encAesArr.length + encTextArr.length);
        buf.set(iv, 0);
        buf[12] = encAesArr.length >> 8;
        buf[13] = encAesArr.length & 0xff;
        buf.set(encAesArr, 14);
        buf.set(encTextArr, 14 + encAesArr.length);
        return btoa(String.fromCharCode(...buf));
    },

    // ── Decrypt text with our private key ────────────────────────────────────
    decryptMessage: async function(b64) {
        if (!this._privateKey) throw new Error('No private key — unlock with password first');
        var buf      = Uint8Array.from(atob(b64), function(c){ return c.charCodeAt(0); });
        var iv       = buf.slice(0, 12);
        var aesLen   = (buf[12] << 8) | buf[13];
        var encAes   = buf.slice(14, 14 + aesLen);
        var encText  = buf.slice(14 + aesLen);
        // Decrypt AES key with RSA private key
        var rawAes   = await crypto.subtle.decrypt({ name:'RSA-OAEP' }, this._privateKey, encAes);
        var aesKey   = await crypto.subtle.importKey('raw', rawAes, { name:'AES-GCM' }, false, ['decrypt']);
        // Decrypt text with AES
        var dec      = await crypto.subtle.decrypt({ name:'AES-GCM', iv:iv }, aesKey, encText);
        return new TextDecoder().decode(dec);
    },

    // ── Check if private key is loaded ───────────────────────────────────────
    isUnlocked: function() { return this._privateKey !== null; },

    // ── Init: generate or restore key pair ───────────────────────────────────
    // Returns { isNew: bool, publicKeyB64: string }
    init: async function(uid) {
        // Check if we have a private key in localStorage (session cache)
        var cached = sessionStorage.getItem('e2e_privkey_' + uid);
        var pubB64 = localStorage.getItem('e2e_pubkey_' + uid);

        if (cached && pubB64) {
            // Restore from session (no password needed within same session)
            try {
                var buf = Uint8Array.from(atob(cached), function(c){ return c.charCodeAt(0); });
                this._privateKey = await crypto.subtle.importKey(
                    'pkcs8', buf, { name:'RSA-OAEP', hash:'SHA-256' }, true, ['decrypt']
                );
                this._publicKey = await this.importPublicKey(pubB64);
                // Re-export public key to get encrypt capability
                this._publicKey = await crypto.subtle.importKey(
                    'spki',
                    Uint8Array.from(atob(pubB64), function(c){ return c.charCodeAt(0); }),
                    { name:'RSA-OAEP', hash:'SHA-256' }, true, ['encrypt']
                );
                console.log('[E2E] Key pair restored from session');
                return { isNew: false, publicKeyB64: pubB64 };
            } catch(e) { console.warn('[E2E] Session restore failed:', e); }
        }

        // Generate new key pair
        var pair = await this.generateKeyPair();
        pubB64   = await this.exportPublicKey(pair.publicKey);
        localStorage.setItem('e2e_pubkey_' + uid, pubB64);

        // Cache private key in session (raw pkcs8 — only in memory for this session)
        var privRaw = await crypto.subtle.exportKey('pkcs8', pair.privateKey);
        sessionStorage.setItem('e2e_privkey_' + uid, btoa(String.fromCharCode(...new Uint8Array(privRaw))));

        console.log('[E2E] New key pair generated');
        return { isNew: true, publicKeyB64: pubB64 };
    },

    // ── Save private key to Firestore (password-wrapped) ─────────────────────
    savePrivateKeyToCloud: async function(uid, password, fsSet, projectId, apiKey) {
        var wrapped = await this.wrapPrivateKey(this._privateKey, password);
        var pubB64  = localStorage.getItem('e2e_pubkey_' + uid);
        await fsSet('users/' + uid, { wrappedPrivKey: wrapped, publicKey: pubB64 });
        console.log('[E2E] Private key saved to cloud (password-wrapped)');
    },

    // ── Restore private key from Firestore using password ────────────────────
    restoreFromCloud: async function(wrappedB64, password, uid) {
        var privKey = await this.unwrapPrivateKey(wrappedB64, password);
        // Cache in session
        var privRaw = await crypto.subtle.exportKey('pkcs8', privKey);
        sessionStorage.setItem('e2e_privkey_' + uid, btoa(String.fromCharCode(...new Uint8Array(privRaw))));
        console.log('[E2E] Private key restored from cloud');
        return privKey;
    }
};

window.GroupCrypto = GroupCrypto;

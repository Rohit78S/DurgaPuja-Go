// smart-recommendations.js
// Smart Pandal Recommendation Engine

(function() {
    'use strict';

    // ─── Configuration ────────────────────────────────────────────────────────
    const CONFIG = {
        MAX_RECOMMENDATIONS: 5,
        NEARBY_RADIUS_KM: 3,
        FAR_THRESHOLD_KM: 8,
        PANEL_ID: 'smartRecommendPanel',
        STORAGE_KEY: 'smartRecommendDismissed',
        STORAGE_SNOOZE_KEY: 'smartRecommendSnooze',
    };

    // ─── State ────────────────────────────────────────────────────────────────
    let _userLocation = null;
    let _pandalData = null;
    let _appState = null;
    let _currentLanguage = 'en';
    let _panelVisible = false;

    // ─── Bootstrap ────────────────────────────────────────────────────────────
    function bootstrap() {
        const MAX_TRIES = 30;
        let tries = 0;

        const interval = setInterval(function() {
            tries++;

            const dataExists = typeof window.pandalData !== 'undefined' || typeof pandalData !== 'undefined';
            const stateExists = typeof window.appState !== 'undefined' || typeof appState !== 'undefined';

            if (dataExists && document.getElementById('pandalGrid')) {
                clearInterval(interval);
                init(stateExists);
            } else if (tries >= MAX_TRIES) {
                clearInterval(interval);
                console.warn('[SmartRec] Main app data objects not found – aborting bootstrap.');
            }
        }, 300);
    }

    function init(stateExists) {
        _pandalData = typeof window.pandalData !== 'undefined' ? window.pandalData : (typeof pandalData !== 'undefined' ? pandalData : null);

        if (stateExists) {
            _appState = typeof window.appState !== 'undefined' ? window.appState : (typeof appState !== 'undefined' ? appState : {});
        } else {
            _appState = {};
        }

        _currentLanguage = window.currentLanguage || 'en';

        injectStyles();
        buildPanel();
        hookIntoApp();

        if (window.userLocation) {
            _userLocation = window.userLocation;
            refreshRecommendations();
        }

        console.log('[SmartRec] Engine initialized safely with ' + (_pandalData ? _pandalData.length : 0) + ' pandals.');
    }

    // ─── Hook into the main app ───────────────────────────────────────────────
    function hookIntoApp() {
        let _storedLoc = window.userLocation || null;
        try {
            Object.defineProperty(window, 'userLocation', {
                get: function() { return _storedLoc; },
                set: function(val) {
                    _storedLoc = val;
                    if (val) {
                        _userLocation = val;
                        refreshRecommendations();
                    }
                },
                configurable: true
            });
        } catch(e) {
            setInterval(function() {
                if (window.userLocation && JSON.stringify(window.userLocation) !== JSON.stringify(_userLocation)) {
                    _userLocation = window.userLocation;
                    refreshRecommendations();
                }
            }, 1500);
        }

        patchFunction('toggleBookmark', function(orig, pandalId) {
            const result = orig(pandalId);
            setTimeout(refreshRecommendations, 400);
            return result;
        });

        patchFunction('markVisited', function(orig, pandalId) {
            const result = orig(pandalId);
            setTimeout(refreshRecommendations, 400);
            return result;
        });

        patchFunction('toggleLanguage', function(orig) {
            const result = orig.apply(this, arguments);
            _currentLanguage = window.currentLanguage || 'en';
            refreshRecommendations();
            return result;
        });

        setTimeout(function() {
            const routeContainer = document.querySelector('#pandals .route-container');
            if (routeContainer && !document.getElementById('showRecommendBtn')) {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.id = 'showRecommendBtn';
                btn.innerHTML = '<i class="fas fa-magic"></i> <span>Smart Recommendations</span>';
                btn.onclick = togglePanel;
                btn.style.marginTop = '0.5rem';
                routeContainer.appendChild(btn);
            }
        }, 800);
    }

    function patchFunction(name, wrapper) {
        const original = window[name];
        if (typeof original === 'function') {
            window[name] = function() {
                return wrapper(original.bind(this), ...arguments);
            };
        }
    }

    // ─── Core scoring algorithm ───────────────────────────────────────────────
    function scoreAndRank(pandals, userLoc) {
        if (!pandals || !Array.isArray(pandals)) return [];

        const visited = (_appState && _appState.visited)
            ? _appState.visited.map(function(id) { return String(id); })
            : [];
        const bookmarked = (_appState && _appState.bookmarked)
            ? _appState.bookmarked.map(function(id) { return String(id); })
            : [];

        return pandals
            .filter(function(p) {
                if (!p || !p.id) return false;
                return !visited.includes(String(p.id));
            })
            .map(function(p) {
                let score = 100;
                let distanceKm = null;
                let distanceLabel = '';
                let distanceWarning = '';

                const pLat = parseFloat(p.lat);
                const pLng = parseFloat(p.lng);

                if (userLoc && !isNaN(pLat) && !isNaN(pLng)) {
                    distanceKm = haversine(userLoc.lat, userLoc.lng, pLat, pLng);
                    distanceLabel = formatDistance(distanceKm);

                    if (distanceKm <= 1) {
                        score += 60;
                    } else if (distanceKm <= CONFIG.NEARBY_RADIUS_KM) {
                        score += 40 - Math.floor(distanceKm * 8);
                    } else if (distanceKm <= CONFIG.FAR_THRESHOLD_KM) {
                        score += 15 - Math.floor(distanceKm * 1.5);
                    } else {
                        score -= Math.floor(distanceKm * 2);
                        distanceWarning = _currentLanguage === 'bn'
                            ? distanceLabel + ' দূরে – কাছের পণ্ডেল বিবেচনা করুন'
                            : distanceLabel + ' away – consider a closer pandal first';
                    }
                }

                if (bookmarked.includes(String(p.id))) score += 30;
                if (p.accessible) score += 10;
                if (p.crowd === 'low') score += 5;
                if (p.crowd === 'high') score -= 5;
                if (p.type === 'heritage') score += 8;

                return {
                    pandal: p,
                    score: score,
                    distanceKm: distanceKm,
                    distanceLabel: distanceLabel,
                    distanceWarning: distanceWarning,
                    isBookmarked: bookmarked.includes(String(p.id)),
                    isNearby: distanceKm !== null && distanceKm <= CONFIG.NEARBY_RADIUS_KM,
                    isFar: distanceKm !== null && distanceKm > CONFIG.FAR_THRESHOLD_KM
                };
            })
            .sort(function(a, b) { return b.score - a.score; })
            .slice(0, CONFIG.MAX_RECOMMENDATIONS);
    }

    // ─── Distance helpers ─────────────────────────────────────────────────────
    function haversine(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatDistance(km) {
        if (km < 1) return Math.round(km * 1000) + ' m';
        return km.toFixed(1) + ' km';
    }

    // ─── Panel UI ─────────────────────────────────────────────────────────────
    function buildPanel() {
        const old = document.getElementById(CONFIG.PANEL_ID);
        if (old) old.remove();

        const panel = document.createElement('div');
        panel.id = CONFIG.PANEL_ID;
        panel.className = 'srec-panel';
        panel.innerHTML = [
            '<div class="srec-header">',
            '  <div class="srec-title-row">',
            '    <i class="fas fa-magic srec-icon"></i>',
            '    <span class="srec-title" data-en="Smart Recommendations" data-bn="স্মার্ট সুপারিশ">Smart Recommendations</span>',
            '    <span class="srec-badge" id="srecBadge">0</span>',
            '  </div>',
            '  <div class="srec-subtitle" id="srecSubtitle" data-en="Enable GPS for personalised suggestions" data-bn="ব্যক্তিগতকৃত পরামর্শের জন্য GPS চালু করুন">Enable GPS for personalised suggestions</div>',
            '  <div class="srec-actions-row">',
            '    <button class="srec-gps-btn" id="srecGpsBtn" onclick="window.smartRec.requestLocation()">',
            '      <i class="fas fa-crosshairs"></i>',
            '      <span data-en="Use My Location" data-bn="আমার অবস্থান ব্যবহার করুন">Use My Location</span>',
            '    </button>',
            '    <button class="srec-close-btn" onclick="window.smartRec.hidePanel()" title="Close">',
            '      <i class="fas fa-times"></i>',
            '    </button>',
            '  </div>',
            '</div>',
            '<div class="srec-list" id="srecList">',
            '  <div class="srec-empty" id="srecEmpty">',
            '    <i class="fas fa-map-marker-alt"></i>',
            '    <p data-en="Share your location to see nearby pandals ranked by distance." data-bn="কাছাকাছি পণ্ডেলগুলি দূরত্ব অনুযায়ী দেখতে আপনার অবস্থান শেয়ার করুন।">Share your location to see nearby pandals ranked by distance.</p>',
            '  </div>',
            '</div>',
            '<div class="srec-footer" id="srecFooter" style="display:none">',
            '  <button class="srec-view-all" onclick="window.smartRec.viewAllFiltered()">',
            '    <i class="fas fa-list"></i>',
            '    <span data-en="View All by Distance" data-bn="দূরত্ব অনুযায়ী সব দেখুন">View All by Distance</span>',
            '  </button>',
            '  <button class="srec-view-map" onclick="window.smartRec.openMapView()">',
            '    <i class="fas fa-map"></i>',
            '    <span data-en="Open in Map" data-bn="মানচিত্রে খুলুন">Open in Map</span>',
            '  </button>',
            '</div>',
        ].join('\n');

        const pandalGrid = document.getElementById('pandalGrid');
        if (pandalGrid) {
            pandalGrid.parentNode.insertBefore(panel, pandalGrid);
        } else {
            document.body.appendChild(panel);
        }

        panel.style.display = 'none';
    }

    function togglePanel() {
        if (_panelVisible) {
            hidePanel();
        } else {
            showPanel();
        }
    }

    function showPanel() {
        const panel = document.getElementById(CONFIG.PANEL_ID);
        if (!panel) return;
        panel.style.display = 'block';
        panel.classList.add('srec-slide-in');
        _panelVisible = true;

        if (!_pandalData) {
            _pandalData = typeof window.pandalData !== 'undefined' ? window.pandalData : (typeof pandalData !== 'undefined' ? pandalData : null);
        }
        if (!_appState || Object.keys(_appState).length === 0) {
            _appState = typeof window.appState !== 'undefined' ? window.appState : (typeof appState !== 'undefined' ? appState : {});
        }
        if (window.userLocation) _userLocation = window.userLocation;

        refreshRecommendations();

        const btn = document.getElementById('showRecommendBtn');
        if (btn) btn.innerHTML = '<i class="fas fa-times"></i> <span>Hide Recommendations</span>';
    }

    function hidePanel() {
        const panel = document.getElementById(CONFIG.PANEL_ID);
        if (!panel) return;
        panel.style.display = 'none';
        _panelVisible = false;

        const btn = document.getElementById('showRecommendBtn');
        if (btn) btn.innerHTML = '<i class="fas fa-magic"></i> <span>Smart Recommendations</span>';
    }

    function refreshRecommendations() {
        if (!_panelVisible) return;

        const ranked = scoreAndRank(_pandalData, _userLocation);

        renderList(ranked);
        updateSubtitle(ranked);
        updateBadge(ranked.length);

        const footer = document.getElementById('srecFooter');
        if (footer) footer.style.display = ranked.length > 0 ? 'flex' : 'none';

        const gpsBtn = document.getElementById('srecGpsBtn');
        if (gpsBtn) gpsBtn.style.display = _userLocation ? 'none' : 'flex';
    }

    function renderList(ranked) {
        const list = document.getElementById('srecList');
        if (!list) return;

        if (ranked.length === 0) {
            list.innerHTML = '';
            list.appendChild(buildEmptyState());
            return;
        }

        const visited = (_appState && _appState.visited) ? _appState.visited.map(String) : [];
        const bookmarked = (_appState && _appState.bookmarked) ? _appState.bookmarked.map(String) : [];

        const items = ranked.map(function(r, idx) {
            const p = r.pandal;
            const name = _currentLanguage === 'bn' ? p.nameBn || p.name : p.name;
            const area = _currentLanguage === 'bn' ? p.areaBn || p.area : p.area;
            const theme = _currentLanguage === 'bn' ? p.themeBn || p.theme : p.theme;

            let badge = '';
            if (idx === 0 && r.isNearby) {
                badge = '<span class="srec-tag srec-tag--nearest">' + (_currentLanguage === 'bn' ? 'সবচেয়ে কাছে' : 'Nearest') + '</span>';
            } else if (r.isBookmarked) {
                badge = '<span class="srec-tag srec-tag--bookmark">' + (_currentLanguage === 'bn' ? 'বুকমার্ক' : 'Bookmarked') + '</span>';
            } else if (p.type === 'heritage') {
                badge = '<span class="srec-tag srec-tag--heritage">' + (_currentLanguage === 'bn' ? 'ঐতিহ্য' : 'Heritage') + '</span>';
            }

            const distHtml = r.distanceLabel
                ? '<span class="srec-dist ' + (r.isFar ? 'srec-dist--far' : r.isNearby ? 'srec-dist--near' : '') + '">' +
                '<i class="fas fa-' + (r.isNearby ? 'walking' : r.isFar ? 'car' : 'subway') + '"></i> ' +
                r.distanceLabel + '</span>'
                : '';

            const warningHtml = r.distanceWarning
                ? '<div class="srec-warning"><i class="fas fa-info-circle"></i> ' + r.distanceWarning + '</div>'
                : '';

            const crowdColor = { low: 'srec-crowd--low', medium: 'srec-crowd--med', high: 'srec-crowd--high' }[p.crowd] || '';
            const crowdLabel = { low: _currentLanguage === 'bn' ? 'কম ভিড়' : 'Low crowd',
                medium: _currentLanguage === 'bn' ? 'মাঝারি' : 'Moderate',
                high: _currentLanguage === 'bn' ? 'বেশি ভিড়' : 'Crowded' }[p.crowd] || p.crowd;

            return [
                '<div class="srec-item" data-id="' + p.id + '">',
                '  <div class="srec-rank">' + (idx + 1) + '</div>',
                '  <div class="srec-info">',
                '    <div class="srec-name-row">',
                '      <span class="srec-name">' + name + '</span>',
                '      ' + badge,
                '    </div>',
                '    <div class="srec-meta">',
                '      <span class="srec-area"><i class="fas fa-map-marker-alt"></i> ' + area + '</span>',
                '      <span class="srec-crowd ' + crowdColor + '"><i class="fas fa-users"></i> ' + crowdLabel + '</span>',
                '      ' + distHtml,
                '    </div>',
                '    <div class="srec-theme">' + theme + '</div>',
                '    ' + warningHtml,
                '    <div class="srec-btns">',
                '      <button class="srec-btn srec-btn--dir" onclick="window.smartRec.navigate(' + p.lat + ',' + p.lng + ',\'' + escapeSQ(name) + '\')" title="Get directions">',
                '        <i class="fas fa-directions"></i> ' + (_currentLanguage === 'bn' ? 'দিকনির্দেশ' : 'Directions'),
                '      </button>',
                '      <button class="srec-btn srec-btn--gmap" onclick="window.smartRec.openInGoogleMaps(' + p.lat + ',' + p.lng + ',\'' + escapeSQ(name) + '\')" title="Open in Google Maps">',
                '        <i class="fab fa-google"></i> ' + (_currentLanguage === 'bn' ? 'গুগল ম্যাপ' : 'Google Maps'),
                '      </button>',
                '      <button class="srec-btn ' + (bookmarked.includes(String(p.id)) ? 'srec-btn--bm-active' : 'srec-btn--bm') + '" onclick="window.smartRec.bookmark(\'' + p.id + '\')" title="Bookmark">',
                '        <i class="fas fa-heart"></i>',
                '      </button>',
                '      <button class="srec-btn ' + (visited.includes(String(p.id)) ? 'srec-btn--vis-active' : 'srec-btn--vis') + '" onclick="window.smartRec.markVisited(\'' + p.id + '\')" title="Mark visited">',
                '        <i class="fas fa-check"></i>',
                '      </button>',
                '    </div>',
                '  </div>',
                '</div>',
            ].join('\n');
        });

        list.innerHTML = items.join('\n');
    }

    function buildEmptyState() {
        const div = document.createElement('div');
        div.className = 'srec-empty';
        div.innerHTML = [
            '<i class="fas fa-check-circle" style="color:#28a745"></i>',
            '<p>' + (_currentLanguage === 'bn'
                ? 'দুর্দান্ত! সব পণ্ডেল পরিদর্শন করা হয়েছে বা কোনো পণ্ডেল পাওয়া যায়নি।'
                : 'Great! All pandals visited or none match your current filters.') + '</p>',
        ].join('');
        return div;
    }

    function updateSubtitle(ranked) {
        const el = document.getElementById('srecSubtitle');
        if (!el) return;
        if (!_userLocation) {
            el.textContent = _currentLanguage === 'bn'
                ? 'ব্যক্তিগতকৃত পরামর্শের জন্য GPS চালু করুন'
                : 'Enable GPS for personalised suggestions';
            return;
        }
        if (ranked.length === 0) {
            el.textContent = _currentLanguage === 'bn'
                ? 'কোনো পণ্ডেল পাওয়া যায়নি'
                : 'No pandals found';
            return;
        }
        const nearest = ranked[0];
        if (nearest.distanceLabel) {
            el.textContent = _currentLanguage === 'bn'
                ? 'আপনার কাছে ' + nearest.distanceLabel + ' দূরে শুরু হচ্ছে'
                : 'Closest is ' + nearest.distanceLabel + ' from you · ' + ranked.length + ' suggestions';
        } else {
            el.textContent = _currentLanguage === 'bn'
                ? ranked.length + 'টি সুপারিশ'
                : ranked.length + ' suggestions for you';
        }
    }

    function updateBadge(count) {
        const badge = document.getElementById('srecBadge');
        if (badge) badge.textContent = count;
    }

    // ─── Public API (exposed to main app via window.smartRec) ─────────────────
    function requestLocation() {
        if (!navigator.geolocation) {
            showToastSafe('Geolocation not supported', 'error');
            return;
        }
        showToastSafe(_currentLanguage === 'bn' ? 'অবস্থান খোঁজা হচ্ছে...' : 'Finding your location...', 'info');
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                window.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                showToastSafe(_currentLanguage === 'bn' ? 'অবস্থান পাওয়া গেছে!' : 'Location found!', 'success');
            },
            function() {
                showToastSafe(_currentLanguage === 'bn' ? 'অবস্থান পাওয়া যায়নি' : 'Location unavailable', 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    function navigate(lat, lng, name) {
        if (typeof window.openGoogleMaps === 'function') {
            window.openGoogleMaps(lat, lng, name);
        } else {
            openInGoogleMaps(lat, lng, name);
        }
    }

    function openInGoogleMaps(lat, lng, name) {
        let url;
        if (_userLocation) {
            url = 'https://www.google.com/maps/dir/?api=1' +
                '&origin=' + _userLocation.lat + ',' + _userLocation.lng +
                '&destination=' + lat + ',' + lng +
                '&travelmode=walking';
        } else {
            url = 'https://www.google.com/maps/search/?api=1' +
                '&query=' + lat + ',' + lng + '(' + encodeURIComponent(name) + ')';
        }
        window.open(url, '_blank');
        showToastSafe((_currentLanguage === 'bn' ? 'গুগল ম্যাপে খোলা হচ্ছে: ' : 'Opening in Google Maps: ') + name, 'info');
    }

    // ─── Utility ──────────────────────────────────────────────────────────────
    function bookmark(pandalId) {
        if (typeof window.toggleBookmark === 'function') {
            window.toggleBookmark(pandalId);
        }
        setTimeout(refreshRecommendations, 300);
    }

    function markVisitedPublic(pandalId) {
        if (typeof window.markVisited === 'function') {
            window.markVisited(pandalId);
        }
        setTimeout(refreshRecommendations, 300);
    }

    function viewAllFiltered() {
        const grid = document.getElementById('pandalGrid');
        if (!grid || !_userLocation) {
            showToastSafe(_currentLanguage === 'bn' ? 'দূরত্ব অনুযায়ী সাজাতে GPS চালু করুন' : 'Enable GPS to sort by distance', 'warning');
            return;
        }

        const ranked = scoreAndRank(_pandalData, _userLocation);
        const order = ranked.map(function(r) { return r.pandal.id; });

        order.forEach(function(id) {
            const card = grid.querySelector('[data-id="' + id + '"]');
            if (card) grid.appendChild(card);
        });

        showToastSafe((_currentLanguage === 'bn' ? 'পণ্ডেলগুলি দূরত্ব অনুযায়ী সাজানো হয়েছে' : 'Pandals sorted by distance'), 'success');
    }

    function openMapView() {
        if (typeof window.showSection === 'function') {
            window.showSection('map');

            document.querySelectorAll('.nav-tab').forEach(function(tab) {
                tab.classList.toggle('active', tab.textContent.trim().match(/map|মানচিত্র/i));
            });

            setTimeout(function() {
                showToastSafe(_currentLanguage === 'bn'
                    ? 'মানচিত্রে আপনার সুপারিশকৃত পণ্ডেলগুলি দেখুন'
                    : 'View your recommended pandals on the map', 'info');
            }, 600);
        }
    }

    function showToastSafe(msg, type) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            console.log('[SmartRec]', msg);
        }
    }

    function escapeSQ(str) {
        return (str || '').replace(/'/g, "\\'");
    }

    // ─── Styles ───────────────────────────────────────────────────────────────
    function injectStyles() {
        if (document.getElementById('srec-styles')) return;
        const style = document.createElement('style');
        style.id = 'srec-styles';
        style.textContent = [
            // GIF integration with transparency layered correctly
            '.srec-panel{',
            '  background: linear-gradient(rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)), url("https://i.pinimg.com/originals/ca/61/f9/ca61f99f00df72cfc6f89e14668e616e.gif") center center / cover no-repeat !important;',
            '  border-radius:18px;',
            '  box-shadow:0 8px 32px rgba(0,0,0,.14);',
            '  margin:1.5rem 0;',
            '  overflow:hidden;',
            '  border:2px solid rgba(255,107,53,.25);',
            '  transition:all .35s ease;',
            '}',
            '.srec-slide-in{animation:srecSlide .4s ease}',
            '@keyframes srecSlide{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(1)}}',

            // Translucent Header
            '.srec-header{background:linear-gradient(135deg,rgba(255,107,53,0.85),rgba(247,147,30,0.85));padding:1.2rem 1.5rem .9rem;color:#fff;}',
            '.srec-title-row{display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem}',
            '.srec-icon{font-size:1.3rem}',
            '.srec-title{font-size:1.15rem;font-weight:700;letter-spacing:.01em}',
            '.srec-badge{background:rgba(255,255,255,.25);border-radius:20px;padding:.1rem .55rem;font-size:.78rem;font-weight:700;min-width:22px;text-align:center;}',
            '.srec-subtitle{font-size:.82rem;opacity:.9;margin-bottom:.7rem;line-height:1.4}',
            '.srec-actions-row{display:flex;align-items:center;gap:.6rem}',
            '.srec-gps-btn{background:rgba(255,255,255,.2);border:1.5px solid rgba(255,255,255,.5);color:#fff;border-radius:20px;padding:.4rem .9rem;font-size:.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:all .2s;}',
            '.srec-gps-btn:hover{background:rgba(255,255,255,.32)}',
            '.srec-close-btn{margin-left:auto;background:rgba(255,255,255,.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1rem;transition:all .2s;}',
            '.srec-close-btn:hover{background:rgba(255,255,255,.3)}',

            // List Layout and Translucent Cards
            '.srec-list{padding:.75rem; background: transparent;}',
            '.srec-empty{text-align:center;padding:2rem 1rem;color:#222;}',
            '.srec-empty i{font-size:2.2rem;opacity:.6;margin-bottom:.6rem;display:block}',
            '.srec-empty p{margin:0;font-size:.92rem;line-height:1.5;font-weight:600;}',

            // Frosted-glass look for recommendations cards so the animation details are visible underneath
            '.srec-item{',
            '  display:flex;align-items:flex-start;gap:.8rem;',
            '  padding:.85rem .8rem;',
            '  border-bottom:1px solid rgba(0,0,0,0.05);',
            '  transition:all .2s ease;',
            '  background: rgba(255, 255, 255, 0.45) !important;',
            '  backdrop-filter: blur(4px);',
            '  -webkit-backdrop-filter: blur(4px);',
            '  border-radius: 12px;',
            '  margin-bottom: 0.5rem;',
            '  border: 1px solid rgba(255, 255, 255, 0.4);',
            '}',
            '.srec-item:last-child{border-bottom:none; margin-bottom: 0;}',
            '.srec-item:hover{background:rgba(255,255,255,0.75) !important; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05);}',

            '.srec-rank{min-width:28px;height:28px;background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;flex-shrink:0;margin-top:2px;}',
            '.srec-info{flex:1;min-width:0}',
            '.srec-name-row{display:flex;align-items:center;flex-wrap:wrap;gap:.4rem;margin-bottom:.3rem}',
            '.srec-name{font-size:1rem;font-weight:700;color:#8B0000}',
            '.srec-tag{font-size:.68rem;font-weight:600;padding:.15rem .5rem;border-radius:10px}',
            '.srec-tag--nearest{background:#d4edda;color:#155724}',
            '.srec-tag--bookmark{background:#f8d7da;color:#721c24}',
            '.srec-tag--heritage{background:#fff3cd;color:#856404}',
            '.srec-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.25rem}',
            '.srec-area,.srec-crowd,.srec-dist{font-size:.76rem;display:flex;align-items:center;gap:.25rem}',
            '.srec-area{color:#222; font-weight: 600;}',
            '.srec-crowd--low{color:#1e7e34; font-weight:700;}',
            '.srec-crowd--med{color:#d35400; font-weight:700;}',
            '.srec-crowd--high{color:#bd2130; font-weight:700;}',
            '.srec-dist{font-weight:700; color: #111;}',
            '.srec-dist--near{color:#1e7e34}',
            '.srec-dist--far{color:#d35400}',
            '.srec-theme{font-size:.75rem;color:#333;margin-bottom:.35rem;font-style:italic; font-weight:600;}',
            '.srec-warning{font-size:.73rem;color:#856404;background:rgba(255,243,205,0.85);border-radius:6px;padding:.25rem .5rem;margin-bottom:.35rem;display:flex;align-items:center;gap:.3rem;border:1px solid #ffeeba;}',
            '.srec-btns{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.4rem}',
            '.srec-btn{border:none;border-radius:14px;padding:.3rem .75rem;font-size:.75rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:.3rem;transition:all .2s;}',
            '.srec-btn--dir{background:linear-gradient(135deg,#17a2b8,#138496);color:#fff}',
            '.srec-btn--gmap{background:linear-gradient(135deg,#4285F4,#34A853);color:#fff}',
            '.srec-btn--bm{background:rgba(255,255,255,0.6);color:#222; border: 1px solid rgba(0,0,0,0.1);}',
            '.srec-btn--bm-active{background:linear-gradient(135deg,#8B0000,#DC143C);color:#fff}',
            '.srec-btn--vis{background:rgba(255,255,255,0.6);color:#222; border: 1px solid rgba(0,0,0,0.1);}',
            '.srec-btn--vis-active{background:linear-gradient(135deg,#28a745,#20c997);color:#fff}',
            '.srec-btn:hover{transform:scale(1.05);opacity:.92}',
            '.srec-footer{display:flex;gap:.6rem;padding:.8rem 1rem;border-top:1px solid rgba(0,0,0,0.05);background:rgba(255,255,255,0.4);}',
            '.srec-view-all,.srec-view-map{flex:1;border:1.5px solid rgba(0,0,0,0.1);background:rgba(255,255,255,0.8);color:#222;border-radius:20px;padding:.5rem .8rem;font-size:.82rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.4rem;transition:all .2s;}',
            '.srec-view-all:hover,.srec-view-map:hover{background:linear-gradient(135deg,#ff6b35,#f7931e);color:#fff;border-color:transparent;}',

            // Dark Mode Configurations
            '[data-theme="dark"] .srec-panel{',
            '  background: linear-gradient(rgba(15,15,15,0.65), rgba(15,15,15,0.65)), url("https://i.pinimg.com/originals/8b/75/41/8b7541daeee2c5345c2eca2a989ceaa7.gif") center center / cover no-repeat !important;',
            '}',
            '[data-theme="dark"] .srec-item{background: rgba(30,30,30,0.6) !important; border: 1px solid rgba(255,255,255,0.1);}',
            '[data-theme="dark"] .srec-item:hover{background:rgba(45,45,45,0.8) !important;}',
            '[data-theme="dark"] .srec-name{color:#ff8b8b;}',
            '[data-theme="dark"] .srec-area{color:#eee;}',
            '[data-theme="dark"] .srec-dist{color:#fff;}',
            '[data-theme="dark"] .srec-theme{color:#ddd;}',
            '[data-theme="dark"] .srec-empty{color:#fff;}',
            '[data-theme="dark"] .srec-warning{background:rgba(255,243,205,.15);color:#ffc107; border-color: rgba(255,193,7,0.2);}',
            '[data-theme="dark"] .srec-tag--nearest{background:#0d3319;color:#6bdb8f}',
            '[data-theme="dark"] .srec-tag--bookmark{background:#3d0a0f;color:#f28b95}',
            '[data-theme="dark"] .srec-tag--heritage{background:#3d2f00;color:#ffd055}',
            '[data-theme="dark"] .srec-btn--bm,[data-theme="dark"] .srec-btn--vis{background:rgba(0,0,0,0.4);color:#eee; border-color: rgba(255,255,255,0.1);}',
            '[data-theme="dark"] .srec-footer{background:rgba(20,20,20,0.5);}',
            '[data-theme="dark"] .srec-view-all,[data-theme="dark"] .srec-view-map{background:rgba(40,40,40,0.7);color:#fff; border-color: rgba(255,255,255,0.15);}',
            '@media(max-width:480px){.srec-btns{gap:.25rem}.srec-btn{padding:.25rem .55rem;font-size:.7rem}.srec-footer{flex-direction:column}}',
        ].join('');
        document.head.appendChild(style);
    }

    // ─── Expose public API ────────────────────────────────────────────────────
    window.smartRec = {
        requestLocation: requestLocation,
        navigate: navigate,
        openInGoogleMaps: openInGoogleMaps,
        bookmark: bookmark,
        markVisited: markVisitedPublic,
        viewAllFiltered: viewAllFiltered,
        openMapView: openMapView,
        showPanel: showPanel,
        hidePanel: hidePanel,
        togglePanel: togglePanel,
        refresh: refreshRecommendations,
    };

    // ─── Start ────────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})();

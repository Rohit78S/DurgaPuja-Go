function ensureGroupService(callback) {
    if (window.GroupService && GroupService.currentUserId) {
        callback();
    } else if (window.GroupService) {
        GroupService.currentUserId = GroupService.getUserId();
        GroupService.currentUserName = GroupService.getUserName();
        if (!GroupService.currentUserId) { alert('Please log in first to use groups'); return; }
        GroupService.init().then(callback).catch(callback);
        callback();
    } else {
        setTimeout(function() { ensureGroupService(callback); }, 300);
    }
}
function createPujaGroup() {
    ensureGroupService(function() {
        var name = document.getElementById('new-group-name') ? document.getElementById('new-group-name').value.trim() : '';
        if (!name) name = GroupService.currentUserName + "'s Puja Group";
        var btn = document.getElementById('create-group-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
        GroupService.createGroup(name).then(function(result) {
            if (result) { alert('Group created!\nYour invite code: ' + result.code + '\n\nShare this code with your friends!'); }
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Create Group'; }
        }).catch(function(err) {
            alert('Error: ' + err.message);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-plus"></i> Create Group'; }
        });
    });
}
function joinPujaGroup() {
    var code = document.getElementById('join-code-input') ? document.getElementById('join-code-input').value.trim().toUpperCase() : '';
    if (!code || code.length < 6) { alert('Enter a valid 6-character code'); return; }
    ensureGroupService(function() {
        var btn = document.getElementById('join-group-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Joining...'; }
        GroupService.joinByCode(code).then(function(ok) {
            if (ok) { alert('Joined group successfully!'); }
            else { alert('Invalid code — check with your friend'); }
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Group'; }
        }).catch(function(err) {
            alert('Error: ' + err.message);
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Join Group'; }
        });
    });
}
function copyGroupCode() {
    var el = document.getElementById('group-code-display');
    if (el) navigator.clipboard.writeText(el.textContent).then(function() { alert('Code copied! Share with friends'); });
}
function shareGroupInvite() {
    var code = document.getElementById('group-code-display') ? document.getElementById('group-code-display').textContent : '';
    var name = document.getElementById('group-name-display') ? document.getElementById('group-name-display').textContent : 'Puja Group';
    var text = 'Join my Durga Puja group "' + name + '"!\nCode: ' + code + '\nApp: https://durgapujaweb-9c4e0.web.app';
    if (navigator.share) { navigator.share({ title: 'Join my Puja Group', text: text }); }
    else { navigator.clipboard.writeText(text).then(function() { alert('Invite copied!'); }); }
}
function toggleLocationSharing() {
    var toggle = document.getElementById('location-share-toggle');
    if (!window.GroupService) return;
    if (toggle && toggle.checked) { GroupService.startSharingLocation(); }
    else { GroupService.stopSharingLocation(); }
}
function leavePujaGroup() {
    if (!confirm('Leave this group?')) return;
    if (window.GroupService) GroupService.leaveGroup();

/* ══════════════════════════════════════════════════════════
   Bahrs Familienstammbaum – Gemeinsames JavaScript
   Wird von allen Ansichten eingebunden.
   Benötigt: config.js (SUPABASE_URL, SUPABASE_KEY, ADMIN_EMAIL)
   ══════════════════════════════════════════════════════════ */

// ── Supabase Client ─────────────────────────────────────
var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Globale Daten ───────────────────────────────────────
var allPersons = [];
var allRels    = [];

// ── Daten laden ─────────────────────────────────────────
function loadSharedData(callback) {
    Promise.all([
        client.from('persons').select('*'),
        client.from('relationships').select('*'),
    ]).then(function(results) {
        if (results[0].error || results[1].error) {
            console.error('Fehler beim Laden:', results[0].error, results[1].error);
            return;
        }
        allPersons = results[0].data.map(function(p) { p.id = Number(p.id); return p; });
        allRels    = results[1].data.map(function(r) {
            r.id = Number(r.id);
            r.person_id = Number(r.person_id);
            r.related_person_id = Number(r.related_person_id);
            return r;
        });
        if (callback) callback();
    });
}

// ── Auth: Login prüfen + Admin ──────────────────────────
function initAuth(onReady) {
    client.auth.getSession().then(function(result) {
        if (!result.data.session) {
            window.location.href = 'login.html';
        } else {
            if (result.data.session.user.email === ADMIN_EMAIL) {
                var adminBtn = document.getElementById('admin-btn');
                if (adminBtn) adminBtn.style.display = 'inline-block';
            }
            if (onReady) onReady();
        }
    });
}

// ── Logout ──────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', function() {
    client.auth.signOut().then(function() { window.location.href = 'login.html'; });
});

// ── Ansichten-Dropdown ──────────────────────────────────
document.getElementById('view-menu-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('view-dropdown').classList.toggle('open');
});
document.addEventListener('click', function() {
    document.getElementById('view-dropdown').classList.remove('open');
});

// Navigation: jede Ansicht ist eine eigene Seite
var viewPages = {
    'timeline':   'index.html',
    'network':    'netzwerk.html',
    'stammbaum':  'stammbaum.html',
    'register':   'register.html',
    'karte':      'karte.html',
};
document.querySelectorAll('.vd-item').forEach(function(el) {
    el.addEventListener('click', function() {
        var page = viewPages[el.dataset.view];
        if (page) window.location.href = page;
    });
});

// ── Familienfarbe (Regenbogen) ──────────────────────────
function getFamilyColor(name) {
    var n = allFamilyNames.length;
    if (n === 0) return '#cccccc';  // Fallback vor erstem Laden

    // Position dieses Namens in der sortierten Liste
    var idx = allFamilyNames.indexOf(name);
    if (idx < 0) {
        // Name noch nicht in Liste (sollte nicht passieren, aber sicher ist sicher):
        // Hash-Fallback damit trotzdem eine konsistente Farbe erscheint
        var hash = 0;
        for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xfffffff;
        idx = hash % n;
    }

    // Hue gleichmäßig über [0, 1) verteilen
    var hue = idx / n;

    // HLS → RGB (inline, kein externes Lib nötig)
    // L = 0.88 (hell/pastell), S = 0.70 (satt genug für Unterscheidbarkeit)
    var h = hue, s = 0.70, l = 0.88;
    var C = (1 - Math.abs(2 * l - 1)) * s;          // Chroma
    var X = C * (1 - Math.abs((h * 6) % 2 - 1));    // Zwischenwert
    var m = l - C / 2;                               // Helligkeitsversatz
    var r = 0, g = 0, b = 0;
    if      (h < 1/6) { r=C; g=X; b=0; }
    else if (h < 2/6) { r=X; g=C; b=0; }
    else if (h < 3/6) { r=0; g=C; b=X; }
    else if (h < 4/6) { r=0; g=X; b=C; }
    else if (h < 5/6) { r=X; g=0; b=C; }
    else              { r=C; g=0; b=X; }

    // Zu Hex konvertieren
    function toHex(v) {
        var hex = Math.round((v + m) * 255).toString(16);
        return hex.length < 2 ? '0' + hex : hex;
    }
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

// ── Datums-Formatierung ─────────────────────────────────
function formatDate(d, estimated) {
        if (!d) return '';
        if (estimated) return d.substring(0, 4) + ' (geschätzt)';
        return d.split('T')[0];  // yyyy-mm-dd
    }

function formatDateShort(d, estimated) {
        if (!d) return '';
        if (estimated) return d.substring(0, 4) + ' (geschätzt)';
        return d.split('T')[0];  // yyyy-mm-dd
    }

function formatDateFull(d, estimated) {
        if (!d) return '–';
        if (estimated) return d.substring(0, 4) + ' (geschätzt)';
        return d.split('T')[0];  // yyyy-mm-dd
    }

// ── Beziehungstypen deutsch ─────────────────────────────
var relTypeDE = {
    'hasMother':    'hat Mutter',
    'hasFather':    'hat Vater',
    'hasWife':      'hat Ehefrau',
    'hasHusband':   'hat Ehemann',
    'hasExWife':    'hat Ex-Ehefrau',
    'hasExHusband': 'hat Ex-Ehemann',
};

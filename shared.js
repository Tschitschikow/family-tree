/* ══════════════════════════════════════════════════════════
   Bahrs Familienstammbaum – Gemeinsames JavaScript
   Wird von allen Ansichten eingebunden.
   Benötigt: supabase-js + config.js (SUPABASE_URL, SUPABASE_KEY, ADMIN_EMAIL)
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

// ── Familienfarbe ───────────────────────────────────────
function getFamilyColor(familyName) {
    if (!familyName) return '#888';
    var families = [
        'DAVIDS','KUEHL','BAHRS','BERG','GROTH','PETERS','HEIDEMANN','WIPPERMANN',
        'RISCHE','DEPNER','STEINKAMP','FRANSSEN','RUEHMANN','ALLERHOLZ','UHLMANN',
        'RUEHTER','SCHMIDT','MEYER','GLASHOFF','MARTENS','MOELLER','KARSTENS',
        'APPEL','FRANCK','SCHUBERT','SCHNAAK','HEINRICHS','TEGTMEYER','ULMER',
        'GAVRIKOV','GAVRIKOVA','LOSEV','MYLIUS','PAGELS','BRANDT','HOFFMANN',
        'REITENBACH','HORSTMANN','TETZNER','MEUSER','BIES','AULBACH','QUINT',
        'PETERING','KOSIEK','HEIDENREICH','EICHMANN','WEISS','BRUEHL','KOCH',
        'OHLSON','ZIMMERMANN','WODTKE','SCHULZE','TIEDJE','FEDDERSEN',
        'AUF DER MAUER','REISE','ALBRECHT','THIELE-BAHRS','HINRICHS',
        'BROECKER','BEHRENDS','SCHUETT','THODE','KOOPMANN','SMITH',
        'VON FRANKENBERG UND LUDWIGSDORFF','EIKMEYER','KAUFMANN'
    ];
    var normalized = familyName.replace(/Ü/g,'UE').replace(/Ö/g,'OE').replace(/ü/g,'ue').replace(/ö/g,'oe');
    var idx = families.indexOf(normalized);
    if (idx < 0) idx = families.indexOf(familyName);
    if (idx < 0) {
        var hash = 0;
        for (var i = 0; i < familyName.length; i++) hash = familyName.charCodeAt(i) + ((hash << 5) - hash);
        idx = Math.abs(hash) % 360;
        return 'hsl(' + idx + ', 55%, 50%)';
    }
    var hue = (idx * 360 / families.length) % 360;
    return 'hsl(' + hue + ', 55%, 50%)';
}

// ── Datums-Formatierung ─────────────────────────────────
function formatDate(d, estimated) {
    if (!d) return '\u2013';
    if (estimated) return d.substring(0, 4) + ' (geschätzt)';
    return d.split('T')[0];
}
function formatDateShort(d, estimated) {
    if (!d) return '';
    if (estimated) return d.substring(0, 4) + ' (geschätzt)';
    return d.split('T')[0];
}
function formatDateFull(d, estimated) {
    if (!d) return '\u2013';
    if (estimated) return d.substring(0, 4) + ' (geschätzt)';
    return d.split('T')[0];
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

// ══════════════════════════════════════════════════════════
// DOM-abhaengige Logik – erst wenn Seite geladen ist
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {

    // ── Logout ──────────────────────────────────────────
    var logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            client.auth.signOut().then(function() { window.location.href = 'login.html'; });
        });
    }

    // ── Ansichten-Dropdown ──────────────────────────────
    var menuBtn = document.getElementById('view-menu-btn');
    var dropdown = document.getElementById('view-dropdown');
    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        document.addEventListener('click', function() {
            dropdown.classList.remove('open');
        });
    }

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

});

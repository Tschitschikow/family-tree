/* Bahrs Familienstammbaum – shared.js
   Nur Funktionen und Variablen. Kein DOM-Zugriff hier.
   Jede Seite ruft initPage() selbst auf. */

// Falls ADMIN_EMAIL nicht in config.js definiert ist
if (typeof ADMIN_EMAIL === 'undefined') var ADMIN_EMAIL = '';

var client = null;  // wird von initPage gesetzt
var allPersons = [];
var allRels = [];

/* Seite initialisieren: Supabase + Auth + Daten laden + callback */
function initPage(callback) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    client.auth.getSession().then(function(result) {
        if (!result.data.session) {
            window.location.href = 'login.html';
            return;
        }
        if (result.data.session.user.email === ADMIN_EMAIL) {
            var ab = document.getElementById('admin-btn');
            if (ab) ab.style.display = 'inline-block';
        }

        // Daten laden
        Promise.all([
            client.from('persons').select('*'),
            client.from('relationships').select('*'),
        ]).then(function(results) {
            if (results[0].error || results[1].error) {
                console.error('Fehler:', results[0].error, results[1].error);
                return;
            }
            allPersons = results[0].data.map(function(p) { p.id = Number(p.id); return p; });
            allRels = results[1].data.map(function(r) {
                r.id = Number(r.id);
                r.person_id = Number(r.person_id);
                r.related_person_id = Number(r.related_person_id);
                return r;
            });
            if (callback) callback();
        });
    });
}

/* Logout */
function setupLogout() {
    var btn = document.getElementById('logout-btn');
    if (btn) btn.addEventListener('click', function() {
        client.auth.signOut().then(function() { window.location.href = 'login.html'; });
    });
}

/* Ansichten-Dropdown */
function setupViewMenu() {
    var menuBtn = document.getElementById('view-menu-btn');
    var dropdown = document.getElementById('view-dropdown');
    if (!menuBtn || !dropdown) return;

    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function() {
        dropdown.classList.remove('open');
    });

    var pages = {
        'timeline':  'index.html',
        'network':   'netzwerk.html',
        'stammbaum': 'stammbaum.html',
        'register':  'register.html',
        'karte':     'karte.html',
    };
    document.querySelectorAll('.vd-item').forEach(function(el) {
        el.addEventListener('click', function() {
            var p = pages[el.dataset.view];
            if (p) window.location.href = p;
        });
    });
}

/* Familienfarbe */
function getFamilyColor(familyName) {
    if (!familyName) return '#888';
    var hash = 0;
    for (var i = 0; i < familyName.length; i++) {
        hash = familyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    var hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ', 55%, 50%)';
}

/* Datumsformatierung */
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

/* Beziehungstypen */
var relTypeDE = {
    'hasMother':    'hat Mutter',
    'hasFather':    'hat Vater',
    'hasWife':      'hat Ehefrau',
    'hasHusband':   'hat Ehemann',
    'hasExWife':    'hat Ex-Ehefrau',
    'hasExHusband': 'hat Ex-Ehemann',
};

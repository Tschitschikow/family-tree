/* ══════════════════════════════════════════════════════════
   Bahrs Familienstammbaum – shared.js
   
   Stellt Funktionen bereit. Kein DOM-Zugriff beim Laden.
   Jede Seite ruft im eigenen <script> auf:
   
       initPage(function() {
           // Daten geladen, Seite initialisieren
       });
   
   ══════════════════════════════════════════════════════════ */

/* ── Globale Variablen ───────────────────────────────── */
var client     = null;
var allPersons = [];
var allRels    = [];

/* ── Seite initialisieren: Auth + Daten ──────────────── */
function initPage(callback) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    client.auth.getSession().then(function(result) {
        if (!result.data.session) {
            window.location.href = 'login.html';
            return;
        }
        // Admin-Button
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

/* ── Logout-Button aktivieren ────────────────────────── */
function setupLogout() {
    var btn = document.getElementById('logout-btn');
    if (btn) {
        btn.addEventListener('click', function() {
            client.auth.signOut().then(function() {
                window.location.href = 'login.html';
            });
        });
    }
}

/* ── Ansichten-Dropdown aktivieren ────────────────────── */
function setupViewMenu() {
    var menuBtn  = document.getElementById('view-menu-btn');
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

/* ── Familienfarbe ───────────────────────────────────── */
function getFamilyColor(familyName) {
    if (!familyName) return '#888';
    var hash = 0;
    for (var i = 0; i < familyName.length; i++) {
        hash = familyName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 'hsl(' + (Math.abs(hash) % 360) + ', 55%, 50%)';
}

/* ── Datumsformatierung ──────────────────────────────── */
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

/* ── Beziehungstypen ─────────────────────────────────── */
var relTypeDE = {
    'hasMother':    'hat Mutter',
    'hasFather':    'hat Vater',
    'hasWife':      'hat Ehefrau',
    'hasHusband':   'hat Ehemann',
    'hasExWife':    'hat Ex-Ehefrau',
    'hasExHusband': 'hat Ex-Ehemann',
};

/* ══════════════════════════════════════════════════════════
   Gemeinsame UI-Komponenten
   ══════════════════════════════════════════════════════════ */

/* ── Familiennamen-Legende ───────────────────────────── 
   containerId: z.B. 'legend-items' oder 'cola-fam-list'
   allBtnId:    z.B. 'legend-all' oder 'cola-fam-all'
   noneBtnId:   z.B. 'legend-none' oder 'cola-fam-none'
   onFilterChange: callback wenn sich Filter ändert, bekommt activeFamilies als Set
*/
var activeFamilies = new Set();
var allFamilyNames = [];

function buildFamilyLegend(containerId, allBtnId, noneBtnId, onFilterChange) {
    var famSet = {};
    allPersons.forEach(function(p) {
        if (p.family_name) famSet[p.family_name] = true;
        if (p.maiden_name) famSet[p.maiden_name] = true;
    });

    allFamilyNames = Object.keys(famSet).sort(function(a, b) {
        return a.localeCompare(b, 'de');
    });
    activeFamilies = new Set(allFamilyNames);

    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    allFamilyNames.forEach(function(name) {
        var div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:0.4em;cursor:pointer;padding:0.15em 0;user-select:none;';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.style.cssText = 'width:auto;margin:0;cursor:pointer;accent-color:#888;';
        cb.addEventListener('change', function() {
            if (cb.checked) { activeFamilies.add(name); div.style.opacity = '1'; }
            else             { activeFamilies.delete(name); div.style.opacity = '0.35'; }
            if (onFilterChange) onFilterChange(activeFamilies);
        });

        var dot = document.createElement('span');
        dot.style.cssText = 'width:10px;height:10px;border-radius:50%;flex-shrink:0;background:' + getFamilyColor(name) + ';';

        var label = document.createElement('span');
        label.textContent = name.split(' ').map(function(w) {
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join(' ');
        label.title = name;

        div.appendChild(cb);
        div.appendChild(dot);
        div.appendChild(label);
        container.appendChild(div);
    });

    // Alle / Keine Buttons
    var allBtn = document.getElementById(allBtnId);
    var noneBtn = document.getElementById(noneBtnId);
    if (allBtn) {
        allBtn.addEventListener('click', function() {
            activeFamilies = new Set(allFamilyNames);
            container.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.checked = true; });
            container.querySelectorAll('div').forEach(function(d) { d.style.opacity = '1'; });
            if (onFilterChange) onFilterChange(activeFamilies);
        });
    }
    if (noneBtn) {
        noneBtn.addEventListener('click', function() {
            activeFamilies = new Set();
            container.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.checked = false; });
            container.querySelectorAll('div').forEach(function(d) { d.style.opacity = '0.35'; });
            if (onFilterChange) onFilterChange(activeFamilies);
        });
    }
}

/* ── Personen-Karteikarte ────────────────────────────── 
   p:           Person-Objekt aus allPersons
   contentId:   z.B. 'card-content' oder 'cola-info-content'
   hintId:      z.B. 'card-hint' oder 'cola-hint' (optional, wird ausgeblendet)
*/
function showPersonCard(p, contentId, hintId) {
    var pm = {};
    allPersons.forEach(function(x) { pm[x.id] = x; });

    var rels = allRels
        .filter(function(r) { return r.person_id === p.id || r.related_person_id === p.id; })
        .sort(function(a, b) { return a.id - b.id; });

    var relIds = rels.map(function(r) { return r.id; });

    var relLines = rels.map(function(r) {
        var nameA = pm[r.person_id] ? pm[r.person_id].display_name : 'ID ' + r.person_id;
        var nameB = pm[r.related_person_id] ? pm[r.related_person_id].display_name : 'ID ' + r.related_person_id;
        var verb = relTypeDE[r.relationship_type] || r.relationship_type;
        return '<div style="margin:0.2em 0;font-size:0.88em;color:#334;">' +
               nameA + ' ' + verb + ' ' + nameB + '</div>';
    }).join('');

    function row(lbl, val) {
        return '<div style="margin:0.3em 0;"><span style="color:#99a;font-size:0.85em;display:block;">' +
               lbl + '</span><span style="color:#223;font-weight:500;">' + val + '</span></div>';
    }

    if (hintId) {
        var hint = document.getElementById(hintId);
        if (hint) hint.style.display = 'none';
    }

    var el = document.getElementById(contentId);
    if (!el) return;
    el.innerHTML =
        row('Name', p.display_name || '\u2013') +
        row('Geschlecht', p.sex === 'm' ? 'männlich' : p.sex === 'f' ? 'weiblich' : '\u2013') +
        row('Mädchenname', p.maiden_name || '\u2013') +
        row('Geboren', formatDateFull(p.birth_date, p.birth_date_estimated)) +
        row('Geburtsort', p.birth_place || '\u2013') +
        row('Gestorben', formatDateFull(p.death_date, p.death_date_estimated)) +
        row('Sterbeort', p.death_place || '\u2013') +
        row('Beruf', p.profession || '\u2013') +
        '<div style="margin-top:0.5em;border-top:1px solid #eef;padding-top:0.4em;">' +
        '<span style="color:#99a;font-size:0.85em;">Person-ID: ' + p.id + '</span><br>' +
        '<span style="color:#99a;font-size:0.85em;">Rel-IDs: ' + (relIds.length ? relIds.join(', ') : '\u2013') + '</span></div>' +
        '<div style="margin-top:0.3em;"><span style="color:#99a;font-size:0.85em;">Beziehungen:</span></div>' +
        relLines;
}

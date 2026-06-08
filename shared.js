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


/* ── Kanten-Detailkarte ──────────────────────────────── 
   edge:      Cytoscape-Edge-Objekt
   contentId: z.B. 'details-content' oder 'cola-info-content'
   hintId:    z.B. 'details-hint' oder 'cola-hint'
*/
function showEdgeCard(edge, contentId, hintId) {
    var d = edge.data();
    var src = allPersons.find(function(p) { return p.id === parseInt(d.source); });
    var tgt = allPersons.find(function(p) { return p.id === parseInt(d.target); });
    var srcName = src ? src.display_name : 'ID ' + d.source;
    var tgtName = tgt ? tgt.display_name : 'ID ' + d.target;

    var typeLabels = {
        'parent':       'Eltern-Kind',
        'married':      'Ehepartner',
        'exmarried':    'Ex-Ehepartner',
        'sibling':      'Vollgeschwister',
        'half-sibling': 'Halbgeschwister',
    };
    var typeLabel = typeLabels[d.type] || d.type;

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
        row('Beziehungstyp', typeLabel) +
        row('Person A', srcName) +
        row('Person B', tgtName) +
        row('Kanten-ID', d.id || '\u2013');
}


/* ── Gemeinsame Cytoscape-Styles ──────────────────────
   Einheitliches Design für Nodes und Edges auf allen Seiten.
   Nutzung: cy = cytoscape({ ..., style: getCytoscapeStyles(), ... });
*/
function getCytoscapeStyles() {
    return [
        // ── Nodes ────────────────────────────────────
        {
            selector: 'node',
            style: {
                'label': 'data(label)',
                'text-valign': 'center',
                'text-halign': 'center',
                'text-wrap': 'wrap',
                'text-max-width': '90px',
                'font-size': '7px',
                'font-family': "'Helvetica Neue', Arial, sans-serif",
                'color': '#333',
                'background-color': '#ffffff',
                'border-width': '2.5px',
                'border-color': 'data(famColor)',
                'width': '90px',
                'height': '36px',
            }
        },
        { selector: 'node[sex="m"]', style: { 'shape': 'round-rectangle' } },
        { selector: 'node[sex="f"]', style: { 'shape': 'ellipse' } },
        { selector: 'node:selected', style: {
            'border-width': '4px', 'border-color': '#334466',
            'background-color': '#eef2ff',
        }},
        // ── Edges ────────────────────────────────────
        {
            selector: 'edge',
            style: {
                'curve-style': 'bezier',
                'width': 0.6,
                'line-color': '#999',
                'target-arrow-shape': 'none',
                'opacity': 0.6,
            }
        },
        { selector: 'edge[type="parent"]', style: {
            'line-color': '#666', 'width': 0.6,
            'target-arrow-shape': 'triangle', 'target-arrow-color': '#666',
            'arrow-scale': 0.4,
        }},
        { selector: 'edge[type="married"]', style: {
            'line-color': '#555', 'width': 1.5, 'line-style': 'solid',
        }},
        { selector: 'edge[type="exmarried"]', style: {
            'line-color': '#999', 'width': 1.5,
            'line-style': 'dashed', 'line-dash-pattern': [6, 4],
        }},
        { selector: 'edge[type="sibling"]', style: {
            'line-color': '#88a', 'width': 0.5,
            'line-style': 'dashed', 'line-dash-pattern': [4, 3],
        }},
        { selector: 'edge[type="half-sibling"]', style: {
            'line-color': '#aab', 'width': 0.4,
            'line-style': 'dashed', 'line-dash-pattern': [2, 3],
        }},
        // ── Highlight-Klassen ────────────────────────
        { selector: '.fam-hidden',   style: { 'opacity': 0.03 } },
        { selector: '.faded',        style: { 'opacity': 0.05 } },
        { selector: '.ring2',        style: { 'opacity': 0.22 } },
    ];
}

/* ── Gemeinsame Kanten-Sichtbarkeit ───────────────────
   cy:             Cytoscape-Instanz
   showParent:     boolean
   showMarried:    boolean
   showSiblings:   boolean
*/
function updateEdgeVisibility(cy, showParent, showMarried, showSiblings) {
    if (!cy) return;
    cy.edges().forEach(function(e) {
        var t = e.data('type');
        if (t === 'parent') e.style('display', showParent ? 'element' : 'none');
        else if (t === 'married' || t === 'exmarried') e.style('display', showMarried ? 'element' : 'none');
        else if (t === 'sibling' || t === 'half-sibling') e.style('display', showSiblings ? 'element' : 'none');
    });
}


/* ── Gemeinsame Toolbar ───────────────────────────────
   Baut die Toolbar-Elemente: Suche, Neu anordnen, Einpassen, PNG,
   Checkboxen, Personenzähler.
   containerId: z.B. 'toolbar'
   Jede Seite hängt danach ihre spezifischen Handler an.
*/
function buildToolbar(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    container.style.cssText = 'background:#fff;border-bottom:1px solid #e0e0e0;padding:0.4em 1.2em;display:flex;align-items:center;gap:0.8em;flex-shrink:0;flex-wrap:wrap;font-size:0.85em;';

    // Suche
    var search = document.createElement('input');
    search.type = 'text';
    search.id = 'toolbar-search';
    search.placeholder = 'Name suchen…';
    search.autocomplete = 'off';
    search.style.cssText = 'padding:0.3em 0.6em;border:1px solid #ccd;border-radius:5px;font-size:0.9em;font-family:inherit;width:140px;color:#334;';
    container.appendChild(search);

    // Buttons
    var buttons = [
        { id: 'btn-reset', label: 'Auswahl zurücksetzen' },
        { id: 'btn-refit', label: 'Baum neu anordnen' },
        { id: 'btn-fit', label: '🎯 Einpassen' },
        { id: 'btn-png', label: '💾 Druckansicht' },
    ];
    buttons.forEach(function(b) {
        var btn = document.createElement('button');
        btn.id = b.id;
        btn.textContent = b.label;
        btn.style.cssText = 'padding:0.3em 0.8em;background:#fff;border:1px solid #ccd;border-radius:5px;cursor:pointer;font-size:0.82em;font-family:inherit;color:#445;';
        container.appendChild(btn);
    });

    // Checkboxen
    var checks = [
        { id: 'cb-parent', label: 'Eltern-Kind' },
        { id: 'cb-married', label: 'Verheiratet' },
        { id: 'cb-siblings', label: 'Geschwister' },
    ];
    checks.forEach(function(ch) {
        var lbl = document.createElement('label');
        lbl.style.cssText = 'font-size:0.82em;display:flex;align-items:center;gap:4px;cursor:pointer;color:#555;';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = ch.id;
        cb.checked = true;
        cb.style.cssText = 'width:auto;margin:0;accent-color:#888;';
        lbl.appendChild(cb);
        lbl.appendChild(document.createTextNode(ch.label));
        container.appendChild(lbl);
    });

    // Personenzähler
    var count = document.createElement('span');
    count.id = 'person-count';
    count.style.cssText = 'margin-left:auto;font-size:0.8em;color:#999;';
    container.appendChild(count);
}

/* ── Gemeinsame Toolbar-Handler ───────────────────────
   cy:        Cytoscape-Instanz
   callbacks: {
     onRefit:  function()  – seiten-spezifisch (Neu anordnen)
     onSearch: function(query, cy) – optional, Standard: highlight matching
     onReset:  function()  – optional, Standard: remove all classes
   }
*/
function setupToolbarHandlers(cy, callbacks) {
    if (!cy) return;
    var cb = callbacks || {};

    // Checkboxen
    var showParent = true, showMarried = true, showSiblings = true;
    document.getElementById('cb-parent').addEventListener('change', function() {
        showParent = this.checked;
        updateEdgeVisibility(cy, showParent, showMarried, showSiblings);
    });
    document.getElementById('cb-married').addEventListener('change', function() {
        showMarried = this.checked;
        updateEdgeVisibility(cy, showParent, showMarried, showSiblings);
    });
    document.getElementById('cb-siblings').addEventListener('change', function() {
        showSiblings = this.checked;
        updateEdgeVisibility(cy, showParent, showMarried, showSiblings);
    });

    // Einpassen
    document.getElementById('btn-fit').addEventListener('click', function() {
        cy.fit(60);
    });

    // PNG Export
    document.getElementById('btn-png').addEventListener('click', function() {
        var png = cy.png({ scale: 2, bg: '#ffffff', full: true });
        var a = document.createElement('a');
        a.href = png;
        a.download = 'stammbaum.png';
        a.click();
    });

    // Auswahl zurücksetzen
    document.getElementById('btn-reset').addEventListener('click', function() {
        cy.elements().removeClass('faded ring2 fam-hidden cola-hidden cola-faded cola-focused');
        document.getElementById('toolbar-search').value = '';
        if (typeof applyFamilyFilter === 'function') applyFamilyFilter();
        if (cb.onReset) cb.onReset();
        // Details zurücksetzen
        var hint = document.getElementById('details-hint') || document.getElementById('cola-hint');
        var content = document.getElementById('details-content') || document.getElementById('cola-info-content');
        if (hint) hint.style.display = '';
        if (content) content.innerHTML = '';
    });

    // Neu anordnen (seiten-spezifisch)
    document.getElementById('btn-refit').addEventListener('click', function() {
        cy.elements().removeClass('faded ring2 cola-hidden cola-faded cola-focused');
        document.getElementById('toolbar-search').value = '';
        if (cb.onRefit) cb.onRefit();
    });

    // Namenssuche
    document.getElementById('toolbar-search').addEventListener('input', function() {
        var q = this.value.trim().toLowerCase();
        cy.elements().removeClass('faded ring2 cola-faded cola-focused');
        if (!q) return;
        cy.elements().addClass('faded');
        cy.nodes().forEach(function(n) {
            var raw = n.data('raw') || {};
            var label = (n.data('label') || '').toLowerCase();
            var display = (raw.display_name || '').toLowerCase();
            if (label.indexOf(q) >= 0 || display.indexOf(q) >= 0) {
                n.removeClass('faded');
                n.connectedEdges().removeClass('faded');
                n.connectedEdges().connectedNodes().removeClass('faded');
            }
        });
    });

    // Personenzähler
    document.getElementById('person-count').textContent = allPersons.length + ' Personen';
}

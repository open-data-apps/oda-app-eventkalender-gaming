/*
 * ODAS QuestKalender - app.js
 * (C) Ondics GmbH / ODAS Gaming Edition, 2026
 */

function app(configdata = {}, enclosingHtmlDivElement) {
  // 1. CONFIGURATION
  const API_URL = configdata.apiurl || configdata.apiUrl || "";
  const RESOURCE_ID = configdata.resourceId || configdata.resourceid || "";
  const MAX_RECORDS = Number(configdata.maxRecords || configdata.maxrecords || 1000);
  const STANDARD_KATEGORIE = configdata.standardKategorie || configdata.standardkategorie || "alle";
  const PROXY_AKTIV = configdata.proxyAktiv === "ja" || configdata.proxyaktiv === "ja";

  let mapCenter = [48.7396, 9.3097]; // Esslingen default
  const configKarteZentrum = configdata.karteZentrum || configdata.kartezentrum;
  if (configKarteZentrum && typeof configKarteZentrum === "string") {
    const coords = configKarteZentrum.split(",").map(Number);
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      mapCenter = coords;
    }
  }
  const mapZoom = Number(configdata.karteZoom || configdata.kartezoom || 12);

  // 2. STATE
  let allEvents = [];
  let filteredEvents = [];
  let currentPage = 1;
  const itemsPerPage = 5;
  let activeTab = "ablaufplan"; // keeps original value for simplicity of internal state
  let selectedEvent = null;
  let leafletMap = null;
  let markerLayer = null;
  let chartInstanceBar = null;
  let chartInstanceDoughnut = null;

  let filters = {
    von: "",
    bis: "",
    kategorie: STANDARD_KATEGORIE === "alle" ? "" : STANDARD_KATEGORIE,
    veranstalter: "",
    status: "",
    q: ""
  };

  const rootId = `eventkalender-${Date.now()}`;

  // 3. AUDIO SYSTEM (Web Audio API)
  let audioCtx = null;
  let soundMuted = true; // default muted to comply with browser autoplay policies

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playSelectSound() {
    if (soundMuted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  function playChimeSound() {
    if (soundMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      
      osc1.type = "square";
      osc1.frequency.setValueAtTime(987.77, now); // B5 note
      gain1.gain.setValueAtTime(0.06, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc2.type = "square";
      osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6 note
      gain2.gain.setValueAtTime(0.06, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.08);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  function playTabSound() {
    if (soundMuted) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.setValueAtTime(320, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn("Audio error", e);
    }
  }

  // Helper: Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper: Resolve CSS variable colors to absolute values for Canvas
  function resolveCssColor(cssVar) {
    if (!cssVar) return "#8b9bb4";
    if (cssVar.startsWith("var(")) {
      const varName = cssVar.substring(4, cssVar.length - 1).trim();
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return resolved || cssVar;
    }
    return cssVar;
  }

  // 4. GAMIFICATION: RARITY MAPPING
  function getRarity(kategorie) {
    const k = String(kategorie || "").trim().toLowerCase();
    if (k === "lan-party" || k === "convention") {
      return { id: "legendary", label: "Legendary", color: "var(--rarity-legendary)" };
    }
    if (k === "turnier") {
      return { id: "epic", label: "Epic", color: "var(--rarity-epic)" };
    }
    if (k === "community") {
      return { id: "rare", label: "Rare", color: "var(--rarity-rare)" };
    }
    return { id: "common", label: "Common", color: "var(--rarity-common)" };
  }

  // 5. RENDER SKELETON
  renderSkeleton();
  initEvents();
  loadAllData();

  function renderSkeleton() {
    enclosingHtmlDivElement.innerHTML = `
      <div class="event-container" id="${rootId}">
        <div class="text-end mb-2"><small id="qk-datenstand" class="text-muted">${configdata.datenStand ? escapeHtml(configdata.datenStand) : ''}</small></div>
        
        <!-- Header Actions -->
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 event-header">
          <div>
            <h3 class="mb-0 app-title fw-bold">Quest Board</h3>
            <p class="text-muted small mb-0">Active campaigns, tactical map, co-op lobbies and stats</p>
          </div>
          <div class="header-actions d-flex gap-2">
            <button class="btn btn-outline-event d-flex align-items-center gap-2" id="${rootId}-btn-mute" title="Toggle audio feedback">
              <span id="${rootId}-mute-icon">🔇</span> Sound
            </button>
            <button class="btn btn-event d-flex align-items-center gap-2" id="${rootId}-btn-export-all">
              <span>📅</span> Export Campaigns
            </button>
            <button class="btn btn-outline-event d-flex align-items-center gap-2" id="${rootId}-btn-refresh">
              <span>🔄</span> Refresh
            </button>
          </div>
        </div>

        <!-- KPI Cards Row -->
        <div class="kpi-row" id="${rootId}-kpis">
          <div class="kpi-card kpi-heute"><div class="kpi-label">Daily Quests</div><div class="kpi-value">-</div><div class="kpi-sub">Active today</div></div>
          <div class="kpi-card kpi-next"><div class="kpi-label">Active Quest</div><div class="kpi-value">-</div><div class="kpi-sub">Countdown</div></div>
          <div class="kpi-card kpi-woche"><div class="kpi-label">Weekly Quests</div><div class="kpi-value">-</div><div class="kpi-sub">Next 7 days</div></div>
          <div class="kpi-card kpi-kat"><div class="kpi-label">Quest Types</div><div class="kpi-value">-</div><div class="kpi-sub">Categories</div></div>
          <div class="kpi-card kpi-org"><div class="kpi-label">Guilds</div><div class="kpi-value">-</div><div class="kpi-sub">Organizers</div></div>
        </div>

        <!-- Filter Card -->
        <div class="filter-card">
          <div class="filter-grid">
            <div>
              <label class="form-label small fw-bold">Timeline From</label>
              <input type="date" class="form-control form-control-sm" id="${rootId}-filter-von">
            </div>
            <div>
              <label class="form-label small fw-bold">Timeline To</label>
              <input type="date" class="form-control form-control-sm" id="${rootId}-filter-bis">
            </div>
            <div>
              <label class="form-label small fw-bold">Quest Type</label>
              <select class="form-select form-select-sm" id="${rootId}-filter-kategorie">
                <option value="">All Types</option>
              </select>
            </div>
            <div>
              <label class="form-label small fw-bold">Guild / Faction</label>
              <select class="form-select form-select-sm" id="${rootId}-filter-veranstalter">
                <option value="">All Guilds</option>
              </select>
            </div>
            <div>
              <label class="form-label small fw-bold">Quest Status</label>
              <select class="form-select form-select-sm" id="${rootId}-filter-status">
                <option value="">All Status</option>
                <option value="geplant">Active</option>
                <option value="abgesagt">Failed/Cancelled</option>
                <option value="abgeschlossen">Completed</option>
              </select>
            </div>
            <div>
              <label class="form-label small fw-bold">Keywords</label>
              <input type="text" class="form-control form-control-sm" placeholder="Search objectives..." id="${rootId}-filter-q">
            </div>
            <div>
              <label class="form-label small fw-bold">Daily Challenge</label>
              <button class="btn btn-random-quest btn-sm w-100 py-1" id="${rootId}-btn-random-quest" style="height: 31px;">🎲 Random Quest</button>
            </div>
          </div>
        </div>

        <!-- Main Layout (Tab Views + Side Detail Panel) -->
        <div class="app-content-grid" id="${rootId}-main-layout">
          
          <!-- Left Column: Navigation Tabs & Tab Content -->
          <div class="d-flex flex-column gap-3">
            <nav class="nav nav-tabs-custom" role="tablist">
              <button class="tab-btn active" id="${rootId}-tab-plan" data-tab="ablaufplan" type="button">⚔️ Quest Log</button>
              <button class="tab-btn" id="${rootId}-tab-map" data-tab="karte" type="button">📡 Tactical Map</button>
              <button class="tab-btn" id="${rootId}-tab-users" data-tab="teilnehmer" type="button">🎮 Co-Op Lobby</button>
              <button class="tab-btn" id="${rootId}-tab-charts" data-tab="chart" type="button">🏆 Leaderboard</button>
            </nav>

            <div class="tab-pane-container" id="${rootId}-tab-content">
              <!-- Loading Spinner initially -->
              <div class="empty-state">
                <div class="spinner-border text-primary mb-3" role="status"></div>
                <div>Scanning database for active campaigns...</div>
              </div>
            </div>
          </div>

          <!-- Right Column: Event Detail Side Panel -->
          <div class="detail-panel" id="${rootId}-detail-panel">
            <div class="empty-state">
              <div class="empty-icon">ℹ️</div>
              <h5>No Active Quest Selected</h5>
              <p class="small text-muted">Select a Quest on the Quest Log or Tactical Map to view objective parameters.</p>
            </div>
          </div>

        </div>

        ${renderWeitereInfos(configdata)}
        ${renderMethodikbox(configdata)}

      </div>
    `;
  }

  // 6. BIND UI ACTIONS
  function initEvents() {
    const root = document.getElementById(rootId);
    if (!root) return;

    // Sound button toggle
    const btnMute = root.querySelector(`#${rootId}-btn-mute`);
    if (btnMute) {
      btnMute.addEventListener("click", () => {
        soundMuted = !soundMuted;
        const muteIcon = root.querySelector(`#${rootId}-mute-icon`);
        if (muteIcon) {
          muteIcon.textContent = soundMuted ? "🔇" : "🔊";
        }
        btnMute.classList.toggle("btn-outline-event", soundMuted);
        btnMute.classList.toggle("btn-event", !soundMuted);
        
        getAudioContext();
        if (!soundMuted) {
          playSelectSound();
        }
      });
    }

    // Tab buttons
    root.querySelectorAll(".nav-tabs-custom button").forEach(btn => {
      btn.addEventListener("click", (e) => {
        getAudioContext();
        playTabSound();
        root.querySelectorAll(".nav-tabs-custom button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeTab = btn.getAttribute("data-tab");
        renderActiveTab();
      });
    });

    // Inputs for filter
    const vonInput = root.querySelector(`#${rootId}-filter-von`);
    const bisInput = root.querySelector(`#${rootId}-filter-bis`);
    const katSelect = root.querySelector(`#${rootId}-filter-kategorie`);
    const verSelect = root.querySelector(`#${rootId}-filter-veranstalter`);
    const statSelect = root.querySelector(`#${rootId}-filter-status`);
    const qInput = root.querySelector(`#${rootId}-filter-q`);

    // Set initial filter value if any
    if (filters.kategorie) katSelect.value = filters.kategorie;

    const onFilterChange = () => {
      filters.von = vonInput.value;
      filters.bis = bisInput.value;
      filters.kategorie = katSelect.value;
      filters.veranstalter = verSelect.value;
      filters.status = statSelect.value;
      filters.q = qInput.value;

      currentPage = 1;
      applyFilters();
    };

    [vonInput, bisInput, katSelect, verSelect, statSelect].forEach(elem => {
      if (elem) elem.addEventListener("change", onFilterChange);
    });
    if (qInput) {
      qInput.addEventListener("input", onFilterChange);
    }

    // Refresh and export buttons
    const btnRefresh = root.querySelector(`#${rootId}-btn-refresh`);
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => {
        getAudioContext();
        playSelectSound();
        loadAllData();
      });
    }

    const btnExportAll = root.querySelector(`#${rootId}-btn-export-all`);
    if (btnExportAll) {
      btnExportAll.addEventListener("click", () => {
        getAudioContext();
        playSelectSound();
        if (filteredEvents.length === 0) {
          alert("No campaigns to export.");
          return;
        }
        const icsString = generateICS(filteredEvents);
        downloadICS(icsString, "quest_campaigns.ics");
      });
    }

    // Random Quest generator button
    const btnRandomQuest = root.querySelector(`#${rootId}-btn-random-quest`);
    if (btnRandomQuest) {
      btnRandomQuest.addEventListener("click", () => {
        getAudioContext();
        if (filteredEvents.length === 0) {
          alert("No active quests in the database!");
          return;
        }
        const randomIndex = Math.floor(Math.random() * filteredEvents.length);
        const randomQuest = filteredEvents[randomIndex];
        playChimeSound();
        showRandomQuestModal(randomQuest);
      });
    }
  }

  // 7. FETCH VIA PROXY OR DIRECT
  function extractPathFromUrl(url) {
    try {
      const u = new URL(url);
      return u.pathname + u.search;
    } catch (e) {
      return url;
    }
  }

  async function fetchViaProxy(targetUrl) {
    const fullPath = window.location.pathname.replace(/\/+$/, "");
    const apiPath = extractPathFromUrl(targetUrl);
    const proxyEndpoint = `${fullPath}/odp-data?path=${encodeURIComponent(apiPath)}`;
    
    const response = await fetch(proxyEndpoint, { method: "POST" });
    if (!response.ok) {
      throw new Error(`Proxy-Fehler: HTTP ${response.status}`);
    }
    const proxyData = await response.json();
    return proxyData.content;
  }

  async function loadAllData() {
    showLoading();
    let rawContent = "";
    let isFallbackNeeded = false;

    // Check if the config url is empty or if we are using the default schema resource ID
    if (!API_URL || RESOURCE_ID === "36aa580e-0c46-4f76-bc95-fbba9a5c5fa3") {
      console.log("Standard-Ressourcen-ID (Schema) oder leere API-URL erkannt. Verwende Mock-Daten.");
      isFallbackNeeded = true;
    }

    if (!isFallbackNeeded) {
      try {
        let fetchUrl = API_URL;
        if (RESOURCE_ID && !API_URL.endsWith(".json")) {
          fetchUrl += `?resource_id=${encodeURIComponent(RESOURCE_ID)}&limit=${MAX_RECORDS}`;
        }

        const isLocal = typeof window !== "undefined" && 
          ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);

        if (PROXY_AKTIV && !isLocal && !API_URL.startsWith("../") && !API_URL.startsWith("./")) {
          console.log("Lade Daten via ODAS Proxy...");
          rawContent = await fetchViaProxy(fetchUrl);
        } else {
          console.log("Lade Daten direkt von:", fetchUrl);
          const response = await fetch(fetchUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          rawContent = await response.text();
        }

        parseAndNormalize(rawContent);

        if (allEvents.length === 0) {
          console.log("Keine Events im Datensatz gefunden. Verwende Mock-Daten.");
          isFallbackNeeded = true;
        }
      } catch (err) {
        console.error("Fehler beim Laden der Veranstaltungsdaten:", err);
        isFallbackNeeded = true;
      }
    }

    if (isFallbackNeeded) {
      try {
        console.log("Lade lokale Mock-Daten aus assets/events-mock.json...");
        const isLocal = typeof window !== "undefined" && 
          ["127.0.0.1", "localhost", "::1"].includes(window.location.hostname);
        
        let response;
        if (isLocal) {
          console.log("Lokal: Versuche ../assets/events-mock.json");
          response = await fetch("../assets/events-mock.json");
        } else {
          console.log("Produktion: Versuche assets/events-mock.json");
          response = await fetch("assets/events-mock.json");
        }

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || contentType.includes("text/html")) {
          const fallbackPath = isLocal ? "assets/events-mock.json" : "../assets/events-mock.json";
          console.log(`Pfad fehlgeschlagen oder HTML-Antwort. Versuche Fallback-Pfad: ${fallbackPath}`);
          response = await fetch(fallbackPath);
        }

        const finalContentType = response.headers.get("content-type") || "";
        if (!response.ok || finalContentType.includes("text/html")) {
          throw new Error(`HTTP ${response.status} oder unerwarteter Inhalt (HTML-Fallback)`);
        }

        rawContent = await response.text();
        parseAndNormalize(rawContent);
      } catch (fallbackErr) {
        console.error("Konnte Mock-Daten nicht laden:", fallbackErr);
        showError(`Die Daten konnten nicht geladen werden und der Fallback ist fehlgeschlagen.`);
      }
    }
  }

  // Parses CSV, JSON or ICS/iCal and normalizes the format
  function parseAndNormalize(content) {
    let parsedData = [];
    
    if (content && typeof content === "string" && content.includes("BEGIN:VCALENDAR")) {
      console.log("iCalendar-Format (ICS) erkannt, parse...");
      parsedData = parseICS(content);
    } else {
      // Check if JSON
      try {
        const json = JSON.parse(content);
        if (json.success && json.result && Array.isArray(json.result.records)) {
          parsedData = json.result.records;
        } else if (Array.isArray(json)) {
          parsedData = json;
        } else if (json.records && Array.isArray(json.records)) {
          parsedData = json.records;
        } else if (json.data && Array.isArray(json.data)) {
          parsedData = json.data;
        }
      } catch (err) {
        // JSON failed, try CSV parser
        console.log("JSON parsing fehlgeschlagen, versuche CSV...");
        parsedData = parseCSV(content);
      }
    }

    // Normalize records to match concept keys
    allEvents = parsedData.map((ev, index) => {
      // Extract coordinates
      let lat = null;
      let lon = null;
      if (ev.ort_lat !== undefined && ev.ort_lat !== null) lat = Number(ev.ort_lat);
      if (ev.ort_lon !== undefined && ev.ort_lon !== null) lon = Number(ev.ort_lon);

      return {
        event_id: ev.event_id || ev.id || index + 1,
        titel: ev.titel || ev.titel_de || ev.summary || ev.title || "Unnamed Quest Campaign",
        beschreibung: ev.beschreibung || ev.description || "",
        datum_start: ev.datum_start || ev.dtstart || ev.start || "",
        datum_ende: ev.datum_ende || ev.dtend || ev.end || ev.datum_start || "",
        zeitzone: ev.zeitzone || ev.tzid || "Europe/Berlin",
        ort_name: ev.ort_name || ev.location || ev.ort || "",
        ort_adresse: ev.ort_adresse || ev.adresse || "",
        ort_lat: lat,
        ort_lon: lon,
        kategorie: ev.kategorie || ev.categories || ev.category || "Sonstiges",
        teilnehmer: ev.teilnehmer || ev.attendee || "",
        veranstalter: ev.veranstalter || ev.organizer || "Independent Guild",
        kontakt_email: ev.kontakt_email || ev.organizer_email || "",
        url: ev.url || ev.link || "",
        status: ev.status || "geplant",
        wiederholung: ev.wiederholung || ev.rrule || ""
      };
    }).filter(ev => ev.datum_start); // Skip events missing start date

    // Populate filter selectors dynamically
    populateFiltersDynamicOptions();

    // Set initial active filters selection
    applyFilters();
  }

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];
    
    // Detect delimiter
    const header = lines[0];
    let delimiter = ",";
    if (header.includes(";")) delimiter = ";";
    else if (header.includes("\t")) delimiter = "\t";

    // Split headers
    const headers = splitCSVLine(header, delimiter).map(h => h.trim().toLowerCase());

    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const values = splitCSVLine(lines[i], delimiter);
      if (values.length < headers.length) continue;
      
      const obj = {};
      headers.forEach((headerName, index) => {
        obj[headerName] = values[index];
      });
      result.push(obj);
    }
    return result;
  }

  function splitCSVLine(line, delimiter) {
    const result = [];
    let insideQuote = false;
    let entry = "";
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === delimiter && !insideQuote) {
        result.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  }

  function parseICS(text) {
    const events = [];
    // Unfold lines (RFC 5545: folded lines start with a space or tab)
    const unfolded = text.replace(/\r?\n[ \t]/g, "");
    const lines = unfolded.split(/\r?\n/);
    
    let currentEvent = null;
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      if (line.toUpperCase() === "BEGIN:VEVENT") {
        currentEvent = {};
        continue;
      }
      
      if (line.toUpperCase() === "END:VEVENT") {
        if (currentEvent) {
          events.push(currentEvent);
          currentEvent = null;
        }
        continue;
      }
      
      if (currentEvent) {
        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) continue;
        
        const keyPart = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1);
        
        const parts = keyPart.split(";");
        const key = parts[0].toUpperCase();
        const params = {};
        for (let i = 1; i < parts.length; i++) {
          const eqIndex = parts[i].indexOf("=");
          if (eqIndex !== -1) {
            const pKey = parts[i].substring(0, eqIndex).toUpperCase();
            const pVal = parts[i].substring(eqIndex + 1);
            params[pKey] = pVal;
          }
        }
        
        const decodeICSValue = (str) => {
          return str
            .replace(/\\(.)/g, "$1")
            .replace(/\\n/gi, "\n")
            .replace(/\\r/gi, "\r");
        };

        const decodedValue = decodeICSValue(value);

        if (key === "SUMMARY") {
          currentEvent.titel = decodedValue;
        } else if (key === "DESCRIPTION") {
          currentEvent.beschreibung = decodedValue;
        } else if (key === "DTSTART") {
          currentEvent.datum_start = parseICSDate(value, params.TZID);
          if (params.TZID) currentEvent.zeitzone = params.TZID;
        } else if (key === "DTEND") {
          currentEvent.datum_ende = parseICSDate(value, params.TZID);
        } else if (key === "LOCATION") {
          currentEvent.ort_name = decodedValue;
        } else if (key === "GEO") {
          const geoParts = value.split(";");
          if (geoParts.length === 2) {
            currentEvent.ort_lat = Number(geoParts[0]);
            currentEvent.ort_lon = Number(geoParts[1]);
          }
        } else if (key === "CATEGORIES") {
          currentEvent.kategorie = decodedValue;
        } else if (key === "URL") {
          currentEvent.url = decodedValue;
        } else if (key === "RRULE") {
          currentEvent.wiederholung = value;
        } else if (key === "ORGANIZER") {
          let veranstalter = params.CN ? decodeICSValue(params.CN) : value;
          if (veranstalter.toLowerCase().startsWith("mailto:")) {
            veranstalter = veranstalter.substring(7);
          }
          currentEvent.veranstalter = veranstalter;
          if (value.toLowerCase().startsWith("mailto:")) {
            currentEvent.kontakt_email = value.substring(7);
          }
        } else if (key === "STATUS") {
          if (value.toUpperCase() === "CANCELLED") {
            currentEvent.status = "abgesagt";
          } else {
            currentEvent.status = "geplant";
          }
        } else if (key === "ATTENDEE") {
          let attendeeName = params.CN ? decodeICSValue(params.CN) : value;
          if (attendeeName.toLowerCase().startsWith("mailto:")) {
            attendeeName = attendeeName.substring(7);
          }
          if (currentEvent.teilnehmer) {
            currentEvent.teilnehmer += ", " + attendeeName;
          } else {
            currentEvent.teilnehmer = attendeeName;
          }
        } else if (key === "UID") {
          currentEvent.event_id = decodedValue.split("@")[0];
        }
      }
    }
    
    return events;
  }

  function parseICSDate(icsDateStr, tzid) {
    const cleanDate = icsDateStr.replace(/[^0-9T]/g, "");
    if (cleanDate.length === 8) {
      return `${cleanDate.substring(0, 4)}-${cleanDate.substring(4, 6)}-${cleanDate.substring(6, 8)}`;
    } else if (cleanDate.length >= 15) {
      const y = cleanDate.substring(0, 4);
      const m = cleanDate.substring(4, 6);
      const d = cleanDate.substring(6, 8);
      const hh = cleanDate.substring(9, 11);
      const mm = cleanDate.substring(11, 13);
      const ss = cleanDate.substring(13, 15);
      
      if (icsDateStr.endsWith("Z")) {
        return `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
      }
      return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
    }
    return icsDateStr;
  }

  function populateFiltersDynamicOptions() {
    const root = document.getElementById(rootId);
    if (!root) return;

    const katSelect = root.querySelector(`#${rootId}-filter-kategorie`);
    const verSelect = root.querySelector(`#${rootId}-filter-veranstalter`);

    const categories = [...new Set(allEvents.map(e => e.kategorie))].filter(Boolean).sort();
    const veranstalter = [...new Set(allEvents.map(e => e.veranstalter))].filter(Boolean).sort();

    // Categories
    const currentKatValue = katSelect.value;
    katSelect.innerHTML = '<option value="">All Types</option>' +
      categories.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join("");
    katSelect.value = categories.includes(currentKatValue) ? currentKatValue : "";

    // Organizers
    const currentVerValue = verSelect.value;
    verSelect.innerHTML = '<option value="">All Guilds</option>' +
      veranstalter.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    verSelect.value = veranstalter.includes(currentVerValue) ? currentVerValue : "";
  }

  // 8. FILTERING
  function applyFilters() {
    filteredEvents = allEvents.filter(ev => {
      // Date start/end boundaries
      if (filters.von) {
        const evStart = ev.datum_start.substring(0, 10);
        if (evStart < filters.von) return false;
      }
      if (filters.bis) {
        const evStart = ev.datum_start.substring(0, 10);
        if (evStart > filters.bis) return false;
      }

      // Category
      if (filters.kategorie && ev.kategorie !== filters.kategorie) return false;

      // Organizer
      if (filters.veranstalter && ev.veranstalter !== filters.veranstalter) return false;

      // Status
      if (filters.status && ev.status !== filters.status) return false;

      // Query (freitext)
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const inTitle = ev.titel.toLowerCase().includes(query);
        const inDesc = ev.beschreibung.toLowerCase().includes(query);
        const inOrt = ev.ort_name.toLowerCase().includes(query) || ev.ort_adresse.toLowerCase().includes(query);
        if (!inTitle && !inDesc && !inOrt) return false;
      }

      return true;
    });

    // Update KPI panels
    updateKPIs();

    // Render active View
    renderActiveTab();
  }

  // 9. COUNT KPIs
  function updateKPIs() {
    const root = document.getElementById(rootId);
    if (!root) return;

    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);

    // 1. Events today
    const eventsToday = allEvents.filter(e => {
      const startStr = e.datum_start.substring(0, 10);
      const endeStr = e.datum_ende.substring(0, 10);
      return startStr === todayStr || (startStr <= todayStr && endeStr >= todayStr);
    });

    // 2. Next Event (chronological >= now)
    const futureEventsSorted = allEvents
      .filter(e => new Date(e.datum_start) >= now && e.status !== "abgesagt")
      .sort((a, b) => new Date(a.datum_start) - new Date(b.datum_start));

    let nextEventTitle = "None Active";
    let countdownStr = "Standby";

    if (futureEventsSorted.length > 0) {
      const nextEv = futureEventsSorted[0];
      nextEventTitle = nextEv.titel;
      
      const diffMs = new Date(nextEv.datum_start) - now;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);

      if (diffHrs < 1) {
        countdownStr = "Starting in < 1 hr";
      } else if (diffHrs < 24) {
        countdownStr = `Starting in ${diffHrs} hrs`;
      } else {
        countdownStr = `Starting in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
      }
    }

    // 3. Events this week (next 7 days)
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventsThisWeek = allEvents.filter(e => {
      const d = new Date(e.datum_start);
      return d >= now && d <= sevenDaysLater;
    });

    // 4. Unique Categories count
    const uniqueKats = [...new Set(allEvents.map(e => e.kategorie))].filter(Boolean).length;

    // 5. Unique Organizers count
    const uniqueOrgs = [...new Set(allEvents.map(e => e.veranstalter))].filter(Boolean).length;

    // Render into DOM
    root.querySelector(`#${rootId}-kpis`).innerHTML = `
      <div class="kpi-card kpi-heute">
        <div class="kpi-label">Daily Quests</div>
        <div class="kpi-value" title="${eventsToday.length}">${eventsToday.length}</div>
        <div class="kpi-sub">Active campaigns today</div>
        ${kpiContext(configdata.kpiKontext1, "1")}
      </div>
      <div class="kpi-card kpi-next">
        <div class="kpi-label">Active Quest</div>
        <div class="kpi-value" title="${escapeHtml(nextEventTitle)}">${escapeHtml(nextEventTitle)}</div>
        <div class="kpi-sub">${escapeHtml(countdownStr)}</div>
        ${kpiContext(configdata.kpiKontext2, "2")}
      </div>
      <div class="kpi-card kpi-woche">
        <div class="kpi-label">Weekly Quests</div>
        <div class="kpi-value" title="${eventsThisWeek.length}">${eventsThisWeek.length}</div>
        <div class="kpi-sub">Campaigns in 7 days</div>
        ${kpiContext(configdata.kpiKontext3, "3")}
      </div>
      <div class="kpi-card kpi-kat">
        <div class="kpi-label">Quest Types</div>
        <div class="kpi-value" title="${uniqueKats}">${uniqueKats}</div>
        <div class="kpi-sub">Campaign categories</div>
        ${kpiContext(configdata.kpiKontext4, "4")}
      </div>
      <div class="kpi-card kpi-org">
        <div class="kpi-label">Guilds</div>
        <div class="kpi-value" title="${uniqueOrgs}">${uniqueOrgs}</div>
        <div class="kpi-sub">Factions registered</div>
        ${kpiContext(configdata.kpiKontext5, "5")}
      </div>
    `;
  }

  // 10. RENDER ACTIVE TAB VIEW
  function renderActiveTab() {
    const container = document.getElementById(`${rootId}-tab-content`);
    if (!container) return;

    // Destroy Leaflet map on tab switch to avoid multiple instantiations
    if (activeTab !== "karte" && leafletMap) {
      leafletMap.remove();
      leafletMap = null;
      markerLayer = null;
    }

    if (filteredEvents.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎮</div>
          <h5>No Quests Found</h5>
          <p class="small text-muted">No quests match your active filter settings. Reset filters to scan again.</p>
        </div>
      `;
      return;
    }

    switch (activeTab) {
      case "ablaufplan":
        renderAblaufplan(container);
        break;
      case "karte":
        renderKarte(container);
        break;
      case "teilnehmer":
        renderTeilnehmer(container);
        break;
      case "chart":
        renderChart(container);
        break;
    }
  }

  // 11. TAB 1: QUEST LOG (Ablaufplan)
  function renderAblaufplan(container) {
    const sorted = [...filteredEvents].sort((a, b) => new Date(a.datum_start) - new Date(b.datum_start));
    
    const now = new Date();
    const pastEvents = sorted.filter(e => new Date(e.datum_start) < now);
    const futureEvents = sorted.filter(e => new Date(e.datum_start) >= now);

    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEvents = sorted.slice(startIndex, endIndex);

    let html = `<div class="quest-list-wrapper">`;
    let placedDivider = false;

    paginatedEvents.forEach((ev) => {
      const evDate = new Date(ev.datum_start);
      
      // Place "Heute" line if transitioning from past to future
      if (!placedDivider && evDate >= now && pastEvents.length > 0) {
        html += `
          <div class="date-divider date-divider-today">
            ⚡ TODAY'S CHALLENGES (${formatLocalDateString(now)})
          </div>
        `;
        placedDivider = true;
      } else if (!placedDivider && pastEvents.length === 0) {
        // if only future events, draw it at start
        html += `
          <div class="date-divider date-divider-today">
            ⚡ ACTIVE CAMPAIGNS
          </div>
        `;
        placedDivider = true;
      }

      const rarity = getRarity(ev.kategorie);
      const isSelected = selectedEvent && selectedEvent.event_id === ev.event_id;
      const isCancelled = ev.status === "abgesagt";
      const isRecurring = ev.wiederholung ? "🔄" : "";
      
      const timeStr = formatEventTimeRange(ev.datum_start, ev.datum_ende);
      const activeStyle = isSelected ? 'border-color: var(--event-primary) !important; box-shadow: 0 0 15px rgba(0, 240, 255, 0.4) !important;' : '';

      html += `
        <div class="quest-item rarity-${rarity.id} ${isSelected ? "active" : ""}" data-id="${ev.event_id}" style="cursor: pointer; ${activeStyle}">
          <span class="quest-rarity-tag">${rarity.label}</span>
          <div class="quest-title fw-bold ${isCancelled ? "event-cancelled text-decoration-line-through text-muted" : ""}">
            ${escapeHtml(ev.titel)}
          </div>
          <div class="quest-meta text-muted">
            <span>⏰ ${timeStr}</span>
            <span>📍 ${escapeHtml(ev.ort_name || "Unknown Zone")}</span>
            <span>🏢 ${escapeHtml(ev.veranstalter)}</span>
            ${isRecurring ? `<span title="Respawnable Quest" style="cursor:help;">${isRecurring}</span>` : ""}
          </div>
          <div class="quest-desc mt-2 text-truncate" style="max-width: 90%;">
            ${escapeHtml(ev.beschreibung)}
          </div>
        </div>
      `;
    });

    html += `</div>`;

    // Pagination Controls
    if (totalPages > 1) {
      html += `
        <div class="pagination-controls d-flex gap-3 justify-content-center align-items-center mt-3">
          <button class="btn btn-sm btn-outline-event" id="${rootId}-btn-page-prev" ${currentPage === 1 ? "disabled" : ""}>◀ Previous</button>
          <span class="small text-muted" style="font-family:'Orbitron', sans-serif;">Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></span>
          <button class="btn btn-sm btn-outline-event" id="${rootId}-btn-page-next" ${currentPage === totalPages ? "disabled" : ""}>Next ▶</button>
        </div>
      `;
    }

    container.innerHTML = html;

    // Bind event handlers
    const listDiv = container.querySelector(".quest-list-wrapper");
    listDiv.querySelectorAll(".quest-item").forEach(item => {
      item.addEventListener("click", () => {
        getAudioContext();
        playSelectSound();
        const id = Number(item.getAttribute("data-id"));
        const ev = filteredEvents.find(e => e.event_id === id);
        selectEvent(ev);
        listDiv.querySelectorAll(".quest-item").forEach(i => {
          i.classList.remove("active");
          i.style.borderColor = "";
          i.style.boxShadow = "";
        });
        item.classList.add("active");
        item.style.borderColor = "var(--event-primary)";
        item.style.boxShadow = "0 0 15px rgba(0, 240, 255, 0.4)";
      });
    });

    // Pagination events
    if (totalPages > 1) {
      container.querySelector(`#${rootId}-btn-page-prev`).addEventListener("click", () => {
        getAudioContext();
        playTabSound();
        if (currentPage > 1) {
          currentPage--;
          renderAblaufplan(container);
        }
      });
      container.querySelector(`#${rootId}-btn-page-next`).addEventListener("click", () => {
        getAudioContext();
        playTabSound();
        if (currentPage < totalPages) {
          currentPage++;
          renderAblaufplan(container);
        }
      });
    }
  }

  // 12. TAB 2: TACTICAL MAP (Karte)
  function renderKarte(container) {
    container.innerHTML = `
      <div class="map-card">
        <div id="${rootId}-map-canvas" style="height: 520px; width: 100%; background: var(--event-bg-dark);"></div>
      </div>
      <div class="d-flex justify-content-end gap-3 mt-2 flex-wrap text-muted small fw-bold" style="font-family:'Orbitron', sans-serif;">
        <span>Rarities:</span>
        <span><span class="badge" style="background: var(--rarity-legendary);">&nbsp;</span> Legendary</span>
        <span><span class="badge" style="background: var(--rarity-epic);">&nbsp;</span> Epic</span>
        <span><span class="badge" style="background: var(--rarity-rare);">&nbsp;</span> Rare</span>
        <span><span class="badge" style="background: var(--rarity-common);">&nbsp;</span> Common</span>
      </div>
    `;

    loadLeaflet(() => {
      const mapDiv = document.getElementById(`${rootId}-map-canvas`);
      if (!mapDiv || !window.L) return;

      leafletMap = window.L.map(mapDiv).setView(mapCenter, mapZoom);

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(leafletMap);

      if (window.L.markerClusterGroup) {
        markerLayer = window.L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 40
        });
      } else {
        markerLayer = window.L.layerGroup();
      }
      markerLayer.addTo(leafletMap);

      const bounds = [];

      filteredEvents.forEach(ev => {
        if (ev.ort_lat && ev.ort_lon) {
          const rarity = getRarity(ev.kategorie);
          const pinColor = rarity.color;
          const markerHtml = `
            <div style="
              width: 24px; 
              height: 24px; 
              background-color: ${pinColor}; 
              border: 2px solid #fff; 
              border-radius: 50%; 
              box-shadow: 0 0 10px ${pinColor}, 0 0 5px #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #fff;
              cursor: pointer;
            ">📍</div>
          `;

          const icon = window.L.divIcon({
            html: markerHtml,
            className: 'custom-div-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const timeStr = formatEventTimeRange(ev.datum_start, ev.datum_ende);

          const popupHtml = `
            <div style="font-family:'Rajdhani', sans-serif; color:#ffffff; width: 220px; padding: 4px;">
              <span class="badge" style="background:${pinColor}; color:#fff; font-size:0.65rem; display:inline-block; margin-bottom:5px; text-transform:uppercase; font-family:'Orbitron', sans-serif;">
                ${rarity.label} | ${escapeHtml(ev.kategorie)}
              </span>
              <strong style="display:block; font-size:0.95rem; margin-bottom:4px; font-family:'Orbitron', sans-serif; color:#fff;">${escapeHtml(ev.titel)}</strong>
              <div class="small text-muted" style="margin-bottom:2px; font-weight:600;">📅 ${timeStr}</div>
              <div class="small text-muted" style="margin-bottom:5px; font-weight:600;">📍 ${escapeHtml(ev.ort_name)}</div>
              ${ev.teilnehmer ? `<div class="small text-truncate text-white-50" style="margin-bottom:6px; font-weight:600;">👥 Parties: ${escapeHtml(ev.teilnehmer.split(';').join(', '))}</div>` : ""}
              <button class="btn btn-xs btn-event w-100 py-1 text-center" style="font-size:0.75rem; border-radius:4px; font-family:'Orbitron', sans-serif;" id="map-btn-show-${ev.event_id}">
                Lock Target
              </button>
            </div>
          `;

          const marker = window.L.marker([ev.ort_lat, ev.ort_lon], { icon })
            .bindPopup(popupHtml);

          marker.on("popupopen", () => {
            getAudioContext();
            playSelectSound();
            const btn = document.getElementById(`map-btn-show-${ev.event_id}`);
            if (btn) {
              btn.addEventListener("click", () => {
                getAudioContext();
                playChimeSound();
                selectEvent(ev);
              });
            }
          });

          markerLayer.addLayer(marker);
          bounds.push([ev.ort_lat, ev.ort_lon]);
        }
      });

      if (bounds.length > 0) {
        leafletMap.fitBounds(window.L.latLngBounds(bounds), {
          padding: [30, 30],
          maxZoom: 15
        });
      }
    });
  }

  // 13. TAB 3: CO-OP LOBBY (Teilnehmer)
  function renderTeilnehmer(container) {
    const participantMap = new Map();

    filteredEvents.forEach(ev => {
      if (ev.teilnehmer) {
        const attendees = ev.teilnehmer.split(";").map(t => t.trim()).filter(Boolean);
        attendees.forEach(att => {
          if (!participantMap.has(att)) {
            participantMap.set(att, []);
          }
          participantMap.get(att).push(ev);
        });
      }
    });

    const participantsList = Array.from(participantMap.keys()).sort((a, b) => a.localeCompare(b, "de"));

    container.innerHTML = `
      <div class="mb-3">
        <input type="text" class="form-control form-control-sm" placeholder="Filter co-op players..." id="${rootId}-search-attendee">
      </div>
      <div id="${rootId}-attendee-results" class="quest-lobby-list" style="max-height: 520px; overflow-y:auto;">
      </div>
    `;

    const resultDiv = container.querySelector(`#${rootId}-attendee-results`);
    const searchInput = container.querySelector(`#${rootId}-search-attendee`);

    const drawAttendees = (query = "") => {
      const q = query.toLowerCase();
      const filteredList = participantsList.filter(name => name.toLowerCase().includes(q));

      if (filteredList.length === 0) {
        resultDiv.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <div>No party members matching search filter.</div>
          </div>
        `;
        return;
      }

      resultDiv.innerHTML = filteredList.map(name => {
        const events = participantMap.get(name);
        events.sort((a, b) => new Date(a.datum_start) - new Date(b.datum_start));

        const collapsibleId = `att-coll-${name.replace(/[^a-zA-Z0-9]/g, "")}`;

        return `
          <div class="border rounded p-2 mb-2" style="background: var(--event-bg-card); border-color: var(--event-border) !important;">
            <div class="d-flex justify-content-between align-items-center cursor-pointer text-white" 
                 data-bs-toggle="collapse" 
                 data-bs-target="#${collapsibleId}" 
                 style="cursor:pointer; font-family: 'Orbitron', sans-serif;">
              <span class="fw-bold">👤 ${escapeHtml(name)}</span>
              <span class="badge" style="background: var(--event-primary); color: var(--event-bg-dark);">${events.length} Quest${events.length > 1 ? "s" : ""}</span>
            </div>
            <div class="collapse mt-2" id="${collapsibleId}">
              <div class="list-group list-group-flush border-top pt-2" style="border-color: var(--event-border) !important;">
                ${events.map(ev => {
                  const rarity = getRarity(ev.kategorie);
                  const dateStr = formatEventTimeRange(ev.datum_start, ev.datum_ende);
                  return `
                    <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-0 py-2 px-1 rounded text-white" 
                         style="background: transparent; cursor:pointer; font-size:0.85rem;" 
                         id="att-ev-link-${ev.event_id}">
                      <div>
                        <span class="badge me-2" style="background: ${rarity.color}; font-size:0.65rem; text-transform:uppercase;">
                          ${rarity.label}
                        </span>
                        <span class="${ev.status === "abgesagt" ? "event-cancelled text-decoration-line-through text-muted" : ""} fw-semibold">${escapeHtml(ev.titel)}</span>
                      </div>
                      <div class="text-muted small text-end">
                        ${dateStr} <br>
                        📍 ${escapeHtml(ev.ort_name)}
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          </div>
        `;
      }).join("");

      // Bind click triggers
      filteredList.forEach(name => {
        const events = participantMap.get(name);
        events.forEach(ev => {
          const item = resultDiv.querySelector(`#att-ev-link-${ev.event_id}`);
          if (item) {
            item.addEventListener("click", (e) => {
              getAudioContext();
              playChimeSound();
              e.stopPropagation();
              selectEvent(ev);
            });
          }
        });
      });
    };

    drawAttendees();

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        drawAttendees(searchInput.value);
      });
    }
  }

  // 14. TAB 4: LEADERBOARD (Charts)
  function renderChart(container) {
    container.innerHTML = `
      <div class="stats-grid">
        <div class="stats-card">
          <h6 class="fw-bold mb-2 text-white" style="font-family:'Orbitron',sans-serif;">Quest Completion Timeline</h6>
          <div style="height: 300px; position: relative;">
            <canvas id="${rootId}-chart-bar"></canvas>
          </div>
        </div>
        <div class="stats-card">
          <h6 class="fw-bold mb-2 text-white" style="font-family:'Orbitron',sans-serif;">Rarity Distribution</h6>
          <div style="height: 300px; position: relative;">
            <canvas id="${rootId}-chart-doughnut"></canvas>
          </div>
        </div>
      </div>
    `;

    loadChartJS(() => {
      const barCanvas = document.getElementById(`${rootId}-chart-bar`);
      const doughnutCanvas = document.getElementById(`${rootId}-chart-doughnut`);
      if (!barCanvas || !doughnutCanvas || !window.Chart) return;

      const categories = [...new Set(filteredEvents.map(e => e.kategorie))].filter(Boolean);
      const months = [];
      const monthMap = new Map(); // "YYYY-MM" -> Map(category -> count)

      filteredEvents.forEach(ev => {
        const date = new Date(ev.datum_start);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const monthKey = `${yyyy}-${mm}`;
        
        if (!months.includes(monthKey)) {
          months.push(monthKey);
        }
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, new Map());
        }
        const catMap = monthMap.get(monthKey);
        catMap.set(ev.kategorie, (catMap.get(ev.kategorie) || 0) + 1);
      });

      months.sort();

      const barDatasets = categories.map(cat => {
        const rarity = getRarity(cat);
        const data = months.map(m => monthMap.get(m).get(cat) || 0);
        return {
          label: cat,
          data: data,
          backgroundColor: resolveCssColor(rarity.color),
          borderColor: "#090a0f",
          borderWidth: 1.5
        };
      });

      const catOverallCounts = categories.map(cat => {
        return filteredEvents.filter(e => e.kategorie === cat).length;
      });

      const monthLabels = months.map(m => {
        const [year, month] = m.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);
        return date.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      });

      if (chartInstanceBar) chartInstanceBar.destroy();
      if (chartInstanceDoughnut) chartInstanceDoughnut.destroy();

      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              color: "#e2e8f0",
              font: { family: "Orbitron", size: 10 }
            }
          }
        }
      };

      chartInstanceBar = new window.Chart(barCanvas, {
        type: "bar",
        data: {
          labels: monthLabels,
          datasets: barDatasets
        },
        options: Object.assign({}, commonOptions, {
          scales: {
            x: { 
              stacked: true,
              grid: { color: "rgba(36, 41, 66, 0.4)" },
              ticks: { color: "#8b9bb4", font: { family: "Rajdhani", size: 12, weight: "600" } }
            },
            y: { 
              stacked: true, 
              beginAtZero: true, 
              grid: { color: "rgba(36, 41, 66, 0.4)" },
              ticks: { precision: 0, color: "#8b9bb4", font: { family: "Rajdhani", size: 12, weight: "600" } }
            }
          }
        })
      });

      chartInstanceDoughnut = new window.Chart(doughnutCanvas, {
        type: "doughnut",
        data: {
          labels: categories,
          datasets: [{
            data: catOverallCounts,
            backgroundColor: categories.map(c => resolveCssColor(getRarity(c).color)),
            borderColor: "#131522",
            borderWidth: 2
          }]
        },
        options: commonOptions
      });
    });
  }

  // 15. SIDE DETAIL PANEL
  function selectEvent(ev) {
    selectedEvent = ev;
    const panel = document.getElementById(`${rootId}-detail-panel`);
    if (!panel) return;

    if (!ev) {
      panel.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">ℹ️</div>
          <h5>No Active Quest Selected</h5>
          <p class="small text-muted">Select a Quest on the Quest Log or Tactical Map to view objective parameters.</p>
        </div>
      `;
      return;
    }

    const rarity = getRarity(ev.kategorie);
    const dateStr = formatLocalDateString(new Date(ev.datum_start));
    const timeRangeStr = formatEventTimeRange(ev.datum_start, ev.datum_ende);
    const attendees = ev.teilnehmer ? ev.teilnehmer.split(";").map(t => t.trim()).filter(Boolean) : [];
    const isCancelled = ev.status === "abgesagt";

    panel.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2" style="border-color: var(--event-border) !important;">
        <span class="badge" style="background: ${rarity.color}; color: #fff; font-family: 'Orbitron', sans-serif; text-transform: uppercase;">
          ${rarity.label} | ${escapeHtml(ev.kategorie)}
        </span>
        <button type="button" class="btn-close btn-close-white" aria-label="Close" id="${rootId}-detail-close"></button>
      </div>
      
      <div class="detail-content">
        <h4 class="fw-bold mb-3 ${isCancelled ? "event-cancelled text-decoration-line-through text-danger" : "text-white"}">${escapeHtml(ev.titel)}</h4>
        
        ${isCancelled ? `
          <div class="alert alert-danger py-2 px-3 mb-3 d-flex align-items-center gap-2 small" role="alert" style="background: rgba(255, 0, 60, 0.15); border-color: var(--event-danger); color: #fff;">
            <span>⚠️</span> <strong>This quest is currently offline/cancelled.</strong>
          </div>
        ` : ""}

        <div class="mb-2 d-flex align-items-start gap-2" style="font-size:0.95rem;">
          <span style="min-width: 24px;">📅</span>
          <div>
            <strong class="text-white d-block">Campaign Date:</strong>
            <span class="text-muted">${dateStr}</span>
          </div>
        </div>

        <div class="mb-2 d-flex align-items-start gap-2" style="font-size:0.95rem;">
          <span style="min-width: 24px;">⏰</span>
          <div>
            <strong class="text-white d-block">Spawn Time:</strong>
            <span class="text-muted">${timeRangeStr} ${ev.zeitzone !== "Europe/Berlin" ? `(${escapeHtml(ev.zeitzone)})` : ""}</span>
          </div>
        </div>

        <div class="mb-2 d-flex align-items-start gap-2" style="font-size:0.95rem;">
          <span style="min-width: 24px;">📍</span>
          <div>
            <strong class="text-white d-block">Quest Zone:</strong>
            <span class="text-muted">${escapeHtml(ev.ort_name || "Unknown Coordinates")}</span>
            ${ev.ort_adresse ? `<div class="small text-white-50 mt-1">${escapeHtml(ev.ort_adresse)}</div>` : ""}
          </div>
        </div>

        <div class="mb-2 d-flex align-items-start gap-2" style="font-size:0.95rem;">
          <span style="min-width: 24px;">🏢</span>
          <div>
            <strong class="text-white d-block">Quest Giver (Guild):</strong>
            <span class="text-muted">${escapeHtml(ev.veranstalter)}</span>
            ${ev.kontakt_email ? `<div class="mt-1 small"><a href="mailto:${escapeHtml(ev.kontakt_email)}" style="color:var(--event-primary); text-decoration:none;">✉️ ${escapeHtml(ev.kontakt_email)}</a></div>` : ""}
          </div>
        </div>

        ${ev.beschreibung ? `
          <div class="mt-3 border-top pt-2" style="border-color: var(--event-border) !important;">
            <strong class="text-white d-block mb-1" style="font-size:0.9rem; font-family:'Orbitron',sans-serif;">📝 Quest Objectives:</strong>
            <div class="text-muted" style="white-space: pre-wrap; font-size:0.85rem; line-height:1.5;">${escapeHtml(ev.beschreibung)}</div>
          </div>
        ` : ""}

        ${attendees.length > 0 ? `
          <div class="mt-3 border-top pt-2" style="border-color: var(--event-border) !important;">
            <strong class="text-white d-block mb-1" style="font-size:0.9rem; font-family:'Orbitron',sans-serif;">👥 Recommended Party (Co-Op):</strong>
            <div class="d-flex flex-wrap gap-1 mt-1">
              ${attendees.map(att => `<span class="badge border" style="background: var(--event-bg-input); border-color: var(--event-border) !important; color: #fff;">👤 ${escapeHtml(att)}</span>`).join("")}
            </div>
          </div>
        ` : ""}

        ${ev.wiederholung ? `
          <div class="mt-3 border-top pt-2" style="border-color: var(--event-border) !important;">
            <strong class="text-white d-block mb-1" style="font-size:0.9rem; font-family:'Orbitron',sans-serif;">🔄 Respawn Timer:</strong>
            <code style="color: var(--event-secondary); font-size: 0.75rem;">${escapeHtml(ev.wiederholung)}</code>
          </div>
        ` : ""}

        ${ev.url ? `
          <div class="mt-3">
            <a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-event w-100 py-2">
              🔗 Guild Board Details &rarr;
            </a>
          </div>
        ` : ""}

        <div class="mt-2">
          <button class="btn btn-sm btn-event w-100 py-2 d-flex align-items-center justify-content-center gap-2" id="${rootId}-btn-export-single">
            <span>📅</span> Add to Quest Tracker (.ics)
          </button>
        </div>
      </div>
    `;

    // Bind close and export actions
    panel.querySelector(`#${rootId}-detail-close`).addEventListener("click", () => {
      getAudioContext();
      playSelectSound();
      selectEvent(null);
      const listDiv = document.querySelector(`.quest-list-wrapper`);
      if (listDiv) {
        listDiv.querySelectorAll(".quest-item").forEach(i => {
          i.classList.remove("active");
          i.style.borderColor = "";
          i.style.boxShadow = "";
        });
      }
    });

    panel.querySelector(`#${rootId}-btn-export-single`).addEventListener("click", () => {
      getAudioContext();
      playSelectSound();
      const icsString = generateICS([ev]);
      downloadICS(icsString, `quest_${slugify(ev.titel)}.ics`);
    });
  }

  // 16. GAMING ACHIEVEMENT MODAL POPUP
  function showRandomQuestModal(ev) {
    const existing = document.getElementById(`${rootId}-random-modal`);
    if (existing) existing.remove();

    const rarity = getRarity(ev.kategorie);
    const dateStr = formatLocalDateString(new Date(ev.datum_start));
    const timeRangeStr = formatEventTimeRange(ev.datum_start, ev.datum_ende);

    const modalDiv = document.createElement("div");
    modalDiv.id = `${rootId}-random-modal`;
    modalDiv.className = "gaming-modal-overlay";
    modalDiv.innerHTML = `
      <div class="gaming-modal">
        <button class="gaming-modal-close" id="${rootId}-btn-modal-close">&times;</button>
        <div class="gaming-modal-header">⚡ Quest Unlocked ⚡</div>
        <div class="gaming-modal-body">
          <span class="gaming-modal-rarity rarity-${rarity.id}">${rarity.label}</span>
          <h3 class="gaming-modal-quest-title">${escapeHtml(ev.titel)}</h3>
          <p class="text-muted small mt-2">📍 ${escapeHtml(ev.ort_name || "Unknown Coordinates")}</p>
          <p class="small text-white-50 mt-1">📅 ${dateStr} | ⏰ ${timeRangeStr}</p>
          <div class="mt-3 p-3 bg-dark border border-secondary rounded text-start quest-desc text-muted" style="max-height:150px; overflow-y:auto; white-space:pre-wrap; border-color: var(--event-border) !important;">${escapeHtml(ev.beschreibung || "No details provided.")}</div>
        </div>
        <button class="btn btn-event w-100" id="${rootId}-btn-modal-accept">Track Quest</button>
      </div>
    `;
    document.body.appendChild(modalDiv);

    const closeModal = () => {
      modalDiv.remove();
      playSelectSound();
    };

    modalDiv.querySelector(`#${rootId}-btn-modal-close`).addEventListener("click", closeModal);
    modalDiv.querySelector(`#${rootId}-btn-modal-accept`).addEventListener("click", () => {
      closeModal();
      selectEvent(ev);
      const detailPanel = document.getElementById(`${rootId}-detail-panel`);
      if (detailPanel) {
        detailPanel.scrollIntoView({ behavior: "smooth" });
      }
    });

    modalDiv.addEventListener("click", (e) => {
      if (e.target === modalDiv) closeModal();
    });
  }

  // 17. ICAL GENERATOR (RFC 5545)
  function generateICS(events) {
    let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//QuestKalender ODAS//DE\r\nCALSCALE:GREGORIAN\r\n";
    
    events.forEach(ev => {
      const startFormatted = formatICSDate(ev.datum_start);
      const endFormatted = formatICSDate(ev.datum_ende);
      const nowFormatted = formatICSDate(new Date().toISOString());

      ics += "BEGIN:VEVENT\r\n";
      ics += `UID:${ev.event_id}@odas-questkalender.de\r\n`;
      ics += `DTSTAMP:${nowFormatted}\r\n`;
      
      const tzid = ev.zeitzone || "Europe/Berlin";
      ics += `DTSTART;TZID=${tzid}:${startFormatted}\r\n`;
      ics += `DTEND;TZID=${tzid}:${endFormatted}\r\n`;

      ics += `SUMMARY:${escapeICSString(ev.titel)}\r\n`;
      
      if (ev.beschreibung) {
        ics += `DESCRIPTION:${escapeICSString(ev.beschreibung)}\r\n`;
      }
      
      if (ev.ort_name) {
        const addressPart = ev.ort_adresse ? `, ${ev.ort_adresse}` : "";
        ics += `LOCATION:${escapeICSString(ev.ort_name + addressPart)}\r\n`;
      }
      
      if (ev.ort_lat && ev.ort_lon) {
        ics += `GEO:${ev.ort_lat};${ev.ort_lon}\r\n`;
      }
      
      if (ev.kategorie) {
        ics += `CATEGORIES:${escapeICSString(ev.kategorie)}\r\n`;
      }
      
      if (ev.url) {
        ics += `URL:${escapeICSString(ev.url)}\r\n`;
      }

      if (ev.wiederholung) {
        ics += `RRULE:${ev.wiederholung}\r\n`;
      }

      if (ev.veranstalter) {
        const mailto = ev.kontakt_email ? `:mailto:${ev.kontakt_email}` : "";
        ics += `ORGANIZER;CN=${escapeICSString(ev.veranstalter)}${mailto}\r\n`;
      }

      if (ev.status === "abgesagt") {
        ics += "STATUS:CANCELLED\r\n";
      } else {
        ics += "STATUS:CONFIRMED\r\n";
      }

      if (ev.teilnehmer) {
        const attendees = ev.teilnehmer.split(";").map(t => t.trim()).filter(Boolean);
        attendees.forEach(att => {
          ics += `ATTENDEE;CN=${escapeICSString(att)};ROLE=REQ-PARTICIPANT:mailto:noreply@odas-questkalender.de\r\n`;
        });
      }

      ics += "END:VEVENT\r\n";
    });

    ics += "END:VCALENDAR";
    return ics;
  }

  function downloadICS(content, filename) {
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Helper functions
  function formatICSDate(dateStr) {
    if (!dateStr) return "";
    const clean = dateStr.replace(/[-:]/g, "");
    const indexDot = clean.indexOf(".");
    if (indexDot !== -1) {
      return clean.substring(0, indexDot);
    }
    return clean.replace("Z", "");
  }

  function escapeICSString(str) {
    if (!str) return "";
    return str
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "");
  }

  function formatLocalDateString(date) {
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function formatEventTimeRange(startIso, endIso) {
    if (!startIso) return "";
    const startDate = new Date(startIso);
    const dateStr = formatLocalDateString(startDate);
    const startHrs = String(startDate.getHours()).padStart(2, "0");
    const startMins = String(startDate.getMinutes()).padStart(2, "0");
    
    if (!endIso || startIso === endIso) {
      return `${dateStr}, ${startHrs}:${startMins} Uhr`;
    }

    const endDate = new Date(endIso);
    const endHrs = String(endDate.getHours()).padStart(2, "0");
    const endMins = String(endDate.getMinutes()).padStart(2, "0");

    if (startIso.substring(0, 10) === endIso.substring(0, 10)) {
      return `${dateStr}, ${startHrs}:${startMins} – ${endHrs}:${endMins} Uhr`;
    }

    const endDateStr = formatLocalDateString(endDate);
    return `${dateStr}, ${startHrs}:${startMins} Uhr – ${endDateStr}, ${endHrs}:${endMins} Uhr`;
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function showLoading() {
    const container = document.getElementById(`${rootId}-tab-content`);
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="spinner-border text-primary mb-3" role="status"></div>
          <div>Scanning database for active campaigns...</div>
        </div>
      `;
    }
  }

  function showError(msg) {
    const container = document.getElementById(`${rootId}-tab-content`);
    if (container) {
      container.innerHTML = `
        <div class="alert alert-danger m-3" role="alert" style="background: rgba(255,0,60,0.15); border-color: var(--event-danger); color: #fff;">
          <h5 class="alert-heading fw-bold">Database Scan Offline</h5>
          <p class="mb-0">${escapeHtml(msg)}</p>
        </div>
      `;
    }
  }

  // 18. DYNAMIC SCRIPTS LOADING
  function loadLeaflet(callback) {
    if (window.L) {
      callback();
      return;
    }
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      const clusterLink = document.createElement("link");
      clusterLink.id = "leaflet-markercluster-css";
      clusterLink.rel = "stylesheet";
      clusterLink.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
      document.head.appendChild(clusterLink);

      const clusterDefaultLink = document.createElement("link");
      clusterDefaultLink.id = "leaflet-markercluster-default-css";
      clusterDefaultLink.rel = "stylesheet";
      clusterDefaultLink.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
      document.head.appendChild(clusterDefaultLink);

      const clusterScript = document.createElement("script");
      clusterScript.id = "leaflet-markercluster-js";
      clusterScript.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
      clusterScript.async = true;
      clusterScript.onload = callback;
      document.head.appendChild(clusterScript);
    };
    document.head.appendChild(script);
  }

  function loadChartJS(callback) {
    if (window.Chart) {
      callback();
      return;
    }
    const script = document.createElement("script");
    script.id = "chart-js";
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.async = true;
    script.onload = callback;
    document.head.appendChild(script);
  }


  /* ── Schale 4: KPI Kontext ── */
  function kpiContext(kontext, id) {
    var text = String(kontext || "").trim();
    if (!text) return "";
    var targetId = "qk-kpi-kontext-" + id;
    return (
      '<button class="qk-kpi-info-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#' + targetId + '" ' +
      'aria-expanded="false" aria-controls="' + targetId + '" ' +
      'aria-label="Erklärung zu diesem Wert">' +
      '<span class="qk-kpi-info-icon" aria-hidden="true">ⓘ</span>' +
      "</button>" +
      '<div id="' + targetId + '" class="collapse">' +
      '<div class="qk-kpi-kontext">' + escapeHtml(text) + "</div>" +
      "</div>"
    );
  }

  /* ── Schale 4: Methodikbox ── */
  function renderMethodikbox(cfg) {
    var hinweis = ((cfg && cfg.datenquelleHinweis) || "").trim();
    var stand = ((cfg && cfg.datenStand) || "").trim();
    if (!hinweis && !stand) return "";
    var standHtml = stand
      ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
      : "";
    return (
      '<section class="qk-methodik mt-3">' +
      '<button class="qk-methodik-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#qk-methodik-body" ' +
      'aria-expanded="false" aria-controls="qk-methodik-body">' +
      '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
      '<span class="qk-methodik-chevron" aria-hidden="true">&#9662;</span>' +
      "</button>" +
      '<div id="qk-methodik-body" class="collapse">' +
      '<div class="qk-methodik-content">' +
      standHtml +
      hinweis +
      "</div></div></section>"
    );
  }


  /* ── Schale 4: KPI Kontext ── */
  function kpiContext(kontext, id) {
    var text = String(kontext || "").trim();
    if (!text) return "";
    var targetId = "qk-kpi-kontext-" + id;
    return (
      '<button class="qk-kpi-info-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#' + targetId + '" ' +
      'aria-expanded="false" aria-controls="' + targetId + '" ' +
      'aria-label="Erklärung zu diesem Wert">' +
      '<span class="qk-kpi-info-icon" aria-hidden="true">ⓘ</span>' +
      "</button>" +
      '<div id="' + targetId + '" class="collapse">' +
      '<div class="qk-kpi-kontext">' + escapeHtml(text) + "</div>" +
      "</div>"
    );
  }

  /* ── Schale 4: Methodikbox ── */
  function renderMethodikbox(cfg) {
    var hinweis = ((cfg && cfg.datenquelleHinweis) || "").trim();
    var stand = ((cfg && cfg.datenStand) || "").trim();
    if (!hinweis && !stand) return "";
    var standHtml = stand
      ? '<p class="text-muted small mb-2">' + escapeHtml(stand) + "</p>"
      : "";
    return (
      '<section class="qk-methodik mt-3">' +
      '<button class="qk-methodik-toggle collapsed" type="button" ' +
      'data-bs-toggle="collapse" data-bs-target="#qk-methodik-body" ' +
      'aria-expanded="false" aria-controls="qk-methodik-body">' +
      '<h2 class="h5 mb-0">Methodik &amp; Datenquelle</h2>' +
      '<span class="qk-methodik-chevron" aria-hidden="true">&#9662;</span>' +
      "</button>" +
      '<div id="qk-methodik-body" class="collapse">' +
      '<div class="qk-methodik-content">' +
      standHtml +
      hinweis +
      "</div></div></section>"
    );
  }

  /* ── Schale 4: Weiterführende Links ── */
  function renderWeitereInfos(cfg) {
    var links = cfg && cfg.weiterfuehrendeLinks;
    if (!links) return "";
    if (Array.isArray(links)) {
      links = links.filter(function(l) { return l !== "_multiline_"; }).join("\n");
    }
    links = String(links).trim();
    if (!links) return "";
    return (
      '<section class="qk-weitere-infos mt-3">' +
      '<h2 class="h5 mb-2">Weitere Informationen</h2>' +
      '<div class="qk-weitere-infos-content">' +
      links +
      "</div></section>"
    );
  }

  return null;
}

// ═══════════════════════════════════════════
// REQUIRED FUNCTION OUTSIDE app()
// ═══════════════════════════════════════════
function addToHead() {
  return;
}

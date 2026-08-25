# Changelog

## 1.31.0 - 2026-08-25
- **CHG:** apiurls-Standard „Eine Quelle = eine vollständige URL“ umgesetzt: Instanzfelder `resourceId` und `maxRecords` entfernt; Paket-Default ist jetzt die vollständige Download-URL (löst die bisherige Abweichung zwischen `resourceId`-Default und konfigurierter Ressource).

## 1.30.0 - 2026-08-22
- **CHG:** `version` in `app-package.json` zu `app-version` umbenannt.
- **ENH:** Top-Level-Feld `app-package-version` ergänzt (Wert `"2"`: mehrere benannte API-URLs über `instanz-config.apiurls`).

## 1.29.0 - 2026-08-21
- **CHG:** Skalares `apiurl` durch das Array-Feld `apiurls` ersetzt (`typ: "array"`, Eintrag `events`). Neuer Standard portfolioweit; `apiurl` entfällt. `app.js` liest die Datenquelle jetzt über `getOdasApiUrl(configdata, "events")`.

## 1.28.0 - 2026-08-20
- Markdown-Metadaten: Paketbeschreibungen auf echtes Markdown umgestellt, exakte Identität Top-Level/Instanz hergestellt, lokale HTML-Fixture semantisch gespiegelt.

## 1.27.0 - 2026-08-20
- FIX: `escapeHtml()` für DOM-IDs erzeugte ein Render/Lookup-Mismatch bei Sonderzeichen in `event_id`; durch ID-sicheren Sanitizer ersetzt (F-81)
- FIX: KPI-Berechnung und Sortierung berücksichtigen jetzt `ev.zeitzone` statt naiver `new Date()`-Interpretation (F-82)
- FIX: Verworfene Termine (kaputte CSV-Zeilen, fehlendes `datum_start`) werden jetzt gezählt und als Hinweis angezeigt (F-73)

## 1.26.0 - 2026-08-17
- `fetchOdasJson()` wirft jetzt bei nicht-JSON-Antworten (CSV, HTML, leerer Body) eine sprechende Konfigurationsfehlermeldung statt der rohen `JSON.parse`-Parserfehlermeldung (F-66)
- `urlDaten` zeigte auf einen nicht mehr existierenden Host (`offenedaten.esslingen.de`/`open-data-esslingen.de`, NXDOMAIN) bzw. auf den Platzhalter `.../testdaten` (HTTP 404) — jetzt auf die reale Datensatz-Landingpage der tatsächlich konfigurierten `apiurl`-Quelle verweisend, live per HTTP-Abruf verifiziert (F-67) (auch `default`/`beispiel` in der `urlDaten`-Feldbeschreibung in `app-package.json` korrigiert)

## 1.25.0 - 2026-08-17
- **CHG:** `instanz-config`-`category`-Vokabular auf Deutsch umgestellt (`allgemein`, `beschreibung`, `datenherkunft`, `kontakt-rechtliches`, `sonstiges`); die entfallenen Kategorien `metrics` und `advanced` wurden auf `beschreibung` bzw. `sonstiges` verteilt

## 1.24.0 - 2026-08-12
- FIX: `app/index.html` auf den Template-Stand (F-47): Datei byte-gleich aus `oda-generic` übernommen — gültiges HTML, deutsche ARIA-Labels, Footer im Body; Titel und Fußzeile bleiben Platzhalter und werden zur Laufzeit aus der Instanz-Config überschrieben

## 1.23.0 - 2026-08-12
- FIX: Widersprüchlichen Datenschutzsatz „Alle Abfragen erfolgen anonym über den Server." aus Datenschutz-Default und lokalem Mirror entfernt — die offene Offenlegung der an Drittanbieter übertragenen Daten bleibt stehen (F-53)

## 1.22.0 - 2026-08-11
- FIX: Laufzeitressourcen beim Seitenwechsel freigeben (F-43): neuer Top-Level-Hook `onPageLeave(page)`, der je Instanz die Leaflet-Karte entfernt, die beiden Chart.js-Instanzen (Balken/Donut) zerstört und den AudioContext schließt; das `disposed`-Flag macht späte Async-Renders (nach `loadLeaflet`/`loadChartJS`/Datenabruf) wirkungslos; zusätzlich wird die Karte beim Re-Render des Karte-Tabs vor dem `innerHTML`-Austausch entfernt (bisher blieb die Leaflet-Instanz mit Listenern und Tile-Requests aktiv); der `soundMuted`-Zustand bleibt instanzlokal

## 1.21.0 - 2026-08-11
- FIX: Laufzeitzustand pro App-Instanz isoliert (F-42): `rootId` aus `Date.now()` durch den monotonen Instanzzähler ersetzt — `const rootId = "eventkalender-" + qkInstanzZaehler;` teilt sich mit `qkUid = "i" + ++qkInstanzZaehler` denselben Zählerstand N; alle `document.getElementById`-Zugriffe auf `${rootId}-…`-IDs bleiben damit je Instanz eindeutig und kollidieren bei mehreren gleichzeitig gemounteten Instanzen nicht mehr

## 1.20.0 - 2026-08-11
- FIX: XSS- und URL-Vertrag geschlossen (F-35): neuer Top-Level-Helfer `safeHttpUrl`; `event_id` wird an allen dynamischen ID-/`data-id`-Stellen (Quest-Log, Karten-Button, Attributionslink) escapt; Event-URL nur noch als Link gerendert, wenn sie ein gültiges http(s)-Schema hat (ICS-Export unverändert)
- FIX: Google-Fonts-Offenlegung (F-36): `fonts.googleapis.com` (Orbitron, Rajdhani) in allen drei Drittanbieter-Listen (README, `app-package.json` `datenschutz.default`, `odas-config/config.json` `datenschutz`); README-Floskel zu den Programmbibliotheken präzisiert

## 1.19.0 - 2026-08-07
- CHG: Bootstrap-Ziele instanzeindeutig (F-32): beide KPI-Kontext-Definitionen (`#qk-kpi-kontext-<id>`, zwei `targetId`-Stellen) sowie Methodik- und Attribut-Accordion-Ziele (`#qk-methodik-body`, `att-coll-*`) um eine Instanzkennung ergänzt — mehrere Instanzen derselben App auf einer Seite klappen ihre Panels unabhängig auf

## 1.18.0 - 2026-08-06
- CHG: DOM-Zugriffe auf den App-Container gescopt (F-25, Tranche 3): die unpräfixierte ID `map-btn-show-${ev.event_id}` (Button im Leaflet-Popup) wird mit dem rootId-Präfix versehen (`${rootId}-map-btn-show-${ev.event_id}`, rootId ist an beiden Stellen im Scope); der Klassen-Zugriff `.quest-list-wrapper` wird über den App-Container gescopt (kein Rename)

## 1.17.0 - 2026-08-06
- FIX: Datenschutzangabe beschreibt den tatsaechlichen Stand nach dem Vendoring (Welle G)

## 1.16.0 - 2026-08-06
- FIX: Drittanbietersektion nennt keine Beim-Aufruf-Behauptung mehr (Welle G)

## 1.15.0 - 2026-08-06
- FIX: Drittanbieterliste "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Leaflet MarkerCluster) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln) bleiben genannt

## 1.14.0 - 2026-08-06
- FIX: Leaflet MarkerCluster vendored in `app/vendor/` statt von CDN geladen (Vendoring Teil 3) — Standalone-Betrieb laedt die Zusatzbibliotheken nicht mehr extern

## 1.13.0 - 2026-08-06
- FIX: Base auf Template oda-generic 1.6.0 vereinheitlicht (Hook renderPageOverride)

## 1.12.0 - 2026-08-06
- FIX: toter Mock-Fallback entfernt (F-13-Nachzug); die konfigurierte Datenquelle ist jetzt maßgeblich — `loadAllData()` unterscheidet drei Datenzustände: keine Quelle konfiguriert, Quelle nicht erreichbar und Quelle erreichbar aber leer. Die Mock-Datei ist aus dem Lieferumfang entfernt

## 1.11.0 - 2026-08-04
- FIX: Datenschutzhinweis "Beim Aufruf kontaktierte Drittanbieter" an das Vendoring angepasst — jetzt lokal ausgelieferte Bibliotheken (Bootstrap/Leaflet/Chart.js) sind aus der Liste entfernt, weiterhin extern geladene Dienste (Kartenkacheln, Zusatzbibliotheken) bleiben genannt

## 1.10.0 - 2026-08-04
- FIX: Bootstrap, Leaflet, Chart.js vendored in `app/vendor/` statt von CDN geladen (F-07 Teil 2) — Standalone-Betrieb laedt diese Bibliotheken nicht mehr extern

## 1.9.0 - 2026-08-04
- FIX: Chart.js-Version vereinheitlicht auf 4.4.9 (vorher uneinheitlich gepinnt oder ganz ungepinnt, laedt bei jedem Aufruf die neueste Version) — Voraussetzung fuer das geplante Vendoring (F-07 Teil 2)

## 1.8.0 - 2026-08-04
- FIX: Drittanbieter (CDN, Kartendienste) in `datenschutz`-Default und README dokumentiert (F-07 Teil 1)
- FIX: Bootstrap CSS/JS auf einheitlich 5.3.8 gezogen (vorher gemischt 5.3.0/5.3.1 bzw. 5.3.0/5.3.0) (F-31)

## 1.7.0 - 2026-07-31
- CHG: toter Konfigurationsschlüssel lizenz entfernt (F-17)
- CHG: brandingCSS und brandingCSSFile als Base-Abhängigkeiten deklariert und lokal gespiegelt (F-17)
- CHG: Groß-/Kleinschreibung der Config-Schlüssel vereinheitlicht, Fallback-Ketten entfernt (F-17)
- CHG: urlDaten deklariert; der Schlüssel war bisher nur lokal vorhanden (F-17)
- CHG: dropdown-Default auf Feldebene verschoben statt in format (F-18)
- CHG: assets/schema.json auf ein flaches Frictionless Table Schema gebracht (F-20)

## 1.6.0 - 2026-07-30

- **ENH:** Referenzdatensatz `assets/events.csv` neu erstellt (20 Termine, rollierend um den 30.07.2026). Der bisherige Bestand lag vollständig in der Vergangenheit (15.05.–31.05.2026), wodurch sämtliche Kennzahlen der Startseite auf null standen und der Kalender leer blieb
- **ENH:** `assets/events.ics` als zweite Fassung desselben Datensatzes im iCalendar-Format (RFC 5545) ergänzt — zum Hochladen als weitere Portal-Ressource und für Kalenderanwendungen
- **ENH:** Datensatz nutzt alle sechs Kategorien, enthält einen abgesagten Termin und zwei Wiederholungsregeln; Veranstalter, Kontaktadressen und Weblinks sind erkennbar fiktiv (`example.org`). Bisher waren erfundene Veranstaltungen real existierenden Einrichtungen zugeschrieben
- **ENH:** `assets/events-mock.json` auf denselben Inhalt gebracht, damit der Fallback keinen anderen Datenstand zeigt als die Quelle
- **DOC:** README beschreibt den Referenzdatensatz, seine Rolle beim Portal-Upload und die CSV-Randbedingungen der App; Beschreibungstext für die Portal-Ressource beigelegt
- **FIX:** `daten.beispiel` verweist auf `assets/events.csv` statt auf die Mock-Datei
- **FIX:** Laufzeitfehler nach dem Laden der Konfiguration werden jetzt sichtbar gemeldet; `handleRouting()` wird `await`et und besitzt einen Fehlerpfad
- **FIX:** `getConfigUrl()` schneidet bei einer URL ohne abschließenden Schrägstrich nicht mehr das letzte Verzeichnis ab
- **FIX:** Klick auf einen Hash-Link, der bereits die aktive Seite bezeichnet, rendert die Seite neu (`setupSamePageLinks()`) — das Logo führt damit aus Unteransichten zurück zur Startseite
- **ENH:** `app/app-base.js` ist wieder byte-identisch zum Template `oda-generic` 1.4.0. Der App-eigene Localhost-Umschreiber fuer den Branding-CSS-Pfad entfaellt. Er loeste ein reales Problem — lokal und im ODAS-Live-Betrieb liegt die Seite unter unterschiedlichen Pfaden. Stattdessen traegt `odas-config/config.json` jetzt die Testform `../assets/...`
- **FIX:** `datenStand` von `2026-07-03` auf `2026-07-30` gezogen (Konfiguration und `instanz-config`-Default); der Wert wird auf der Startseite sichtbar angezeigt und passt jetzt zum neuen Referenzdatensatz
- **FIX:** Ein Klick auf einen Eintrag in der Liste zeigt die Details jetzt auch bei CSV- und ICS-Quellen an. Der Lookup verglich die ID der angeklickten Zeile (immer ein String) strikt mit `event_id` aus den Daten; CSV und ICS liefern dort einen String, JSON eine Zahl, sodass `"1" === 1` fehlschlug und stumm der Leerzustand „Keine Veranstaltung ausgewaehlt“ stehen blieb. `event_id` wird jetzt bei der Normalisierung einheitlich als String gefuehrt

## 1.5.0 - 2026-07-24

- **FIX:** Laufzeit-Fehlermeldung wird vor der Anzeige HTML-maskiert (`escapeHtmlForBase`); ein Fehlertext kann kein Markup mehr in die Seite einschleusen (XSS)
- **FIX:** Startseiten-Renderer wird nun `await`et; bei asynchronen Apps erscheint kein kurzzeitiges `[object Promise]` in `#main-content`

## 1.4.0 - 2026-07-23

- **ENH:** Datenabruf auf den Schalter `proxyAktiv` umgestellt; direkte Abrufe sind der Standard, der ODAS-Proxy wird nur noch bei `ja` verwendet
- **ENH:** Einfachen Standalone-Betrieb hinter Traefik mit derselben `odas-config/config.json` wie in der Entwicklung ergänzt
- **ENH:** Traefik-Anbindung auf das externe Netzwerk `proxynet`, den EntryPoint `websecure` und den Zertifikatsresolver `letsencrypt` festgelegt
- **FIX:** Proxy-Basispfad funktioniert jetzt auch bei URLs mit `index.html`; der Ziel-Pfad wird URL-kodiert
- **FIX:** Inline-PROXY_AKTIV-Logik samt localhost-Sonderfall durch die kanonischen Helper ersetzt
- **FIX:** Lokale `odas-config/config.json` auf `proxyAktiv: nein` gestellt; der frühere localhost-Sonderfall erzwang lokal ohnehin den Direktabruf, die Quelle ist CORS-freigegeben
- **DOC:** Start über `STANDALONE=true make up` dokumentiert

## 1.3.0 (2026-07-03)

- **Schale 4 – Phase 1:** Für-wen-Block, Weiterführende Links, Datenfrische (manueller datenStand)

## ToDo

- Config über Nginx laden

## 22.05.2026 (Version 1.0.1)

- FIX: Behobenes Einklappen des Layouts in ODAS durch Einführung von CSS Grid (`.app-content-grid`)
- FIX: `min-width: 0` Einschränkung für Grid-Elemente hinzugefügt, um unkontrollierte Breiten-Expansion zu verhindern
- ENH: Responsives Tab-Design mit horizontalem Scrollen auf kleinen Bildschirmen und Single-Line-Darstellung auf Desktop
- ENH: Gaming-Branding und Dunkles Cyberpunk-Design für junge Zielgruppe implementiert


## 21.02.2025

- ENH: app-package mit Multiline Strings
- ENH: Feldtypen von HTML auf Markdown umgestellt

## 17.02.2025

- FIX: Loadpage Funktion optimiert

## 12.2.2025 (Version 1.0.0)

- ENH: Anzeige config.json
- ENH: Config-File mit Multiline-String (als Array)
- FIX: Code-Teilung in app-base und app
- FIX: Docker korrigiert, läuft wieder

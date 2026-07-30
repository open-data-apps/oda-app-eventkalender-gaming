# Changelog

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

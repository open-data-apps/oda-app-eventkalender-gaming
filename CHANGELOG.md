# Changelog

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

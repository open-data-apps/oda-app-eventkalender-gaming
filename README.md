# QuestKalender (Gaming/Youth Event Hub)

Die App **QuestKalender** bietet einen interaktiven, gamifizierten Veranstaltungskalender, der speziell auf Jugendliche und junge Erwachsene ausgerichtet ist. Sie stellt Events als „Quests“ dar und motiviert durch ein ansprechendes Dark-Cyberpunk-Design sowie spielerische Features zur Teilnahme am lokalen Geschehen.

Die App ist für die Verwendung im [Open Data App Store](https://open-data-app-store.de/) gemacht und entspricht der [Open Data App Spezifikation](https://open-data-apps.github.io/open-data-app-docs/open-data-app-spezifikation/).

---

## Features
Die App ist eine Single Page Application (Webapp) mit:

- **Quest Log (Ablaufplan)**: Chronologische Übersicht aller anstehenden Events (Quests) mit Heute-Trennlinie. Jedes Event wird mit einer Rarity (Common, Rare, Epic, Legendary) dargestellt.
- **Tactical Map (Kartenansicht)**: Interaktive, im Dark-Mode gehaltene Karte mit allen Quest-Standorten (Leaflet.js) und farblich an die Rarity angepassten, glühenden Pins.
- **Co-Op Lobby (Teilnehmer)**: Auflistung aller registrierten Spieler (Teilnehmer) und Gruppierung nach Events.
- **Leaderboard & Stats (Auswertungen)**: Visualisierte XP-Statistiken über wöchentliche Quests, meistbesuchte Kampagnen (Kategorien) und Top-Gilden (Veranstalter).
- **Random Quest Generator**: Ein interaktiver Zufallsgenerator, der dem Benutzer ein passendes Event auswählt und als neue Quest vorschlägt, untermalt mit 8-Bit Achievement-Sounds.
- **Retro Audio Feedback**: Akustisches Feedback bei Benutzeraktionen (z.B. Tab-Wechsel oder Quest-Annahme) über die Web Audio API. Die Töne können über einen Mute-Button (🔊/🔇) in der Menüleiste jederzeit stummgeschaltet werden.
- **iCal-Export**: Einzelne Quests oder die gesamte Auswahlliste können mit einem Klick im `.ics`-Format heruntergeladen werden.

---

## Datenformat
Die App unterstützt sowohl **JSON** (inklusive CKAN Datastore), **CSV** (mit automatischer Delimiter-Erkennung) als auch **iCal / ICS**-Feeds als direkte Datenquellen über die API-URL / Ressourcen-ID.

---

### Systemvoraussetzungen
- Docker / Docker Compose
- Make

Die Entwicklung wurde getestet unter Windows und macOS.

### Starten
```bash
make build up
```

Die App wird gestartet und steht auf Port 8089 zur Verfügung: http://localhost:8089

### Aufbau der App
Der Inhaltsbereich wird in `app.js` erstellt. Dort ist die gesamte Visualisierungs- und Soundlogik implementiert. Die styles befinden sich in `app.css`.

---

## Betriebsarten

Die App kann lokal, eigenstaendig hinter einem Traefik-Reverse-Proxy oder ueber den ODAS
betrieben werden.

### Datenabruf: `proxyAktiv`

| Wert   | Bedeutung                                                                   |
| ------ | --------------------------------------------------------------------------- |
| `nein` | Direkter Abruf der Daten-URL. Standard fuer Entwicklung und Standalone.      |
| `ja`   | Abruf ueber den ODAS-Proxy `…/odp-data`. Nur im ODAS-Live-System verfuegbar. |

Bei `nein` muss die Datenquelle CORS freigeben.

### Standalone-Betrieb

Voraussetzung: ein laufender Traefik mit dem externen Docker-Netzwerk `proxynet`,
dem EntryPoint `websecure` und dem Zertifikatsresolver `letsencrypt`.

1. In `docker-compose.standalone.yml` den Platzhalter `app1.example.com` durch den
   echten FQDN ersetzen.
2. In `odas-config/config.json` `proxyAktiv` auf `nein` belassen.
3. Starten:

```bash
STANDALONE=true make up
STANDALONE=true make logs
STANDALONE=true make down
```

Im Standalone-Betrieb entfaellt die lokale Portfreigabe; Traefik terminiert TLS und
leitet auf den internen Nginx-Port 80 weiter. Die Konfiguration wird aus derselben
`odas-config/config.json` gelesen wie in der Entwicklung und von Nginx unter `/config`
ausgeliefert.

### Auslieferung an den ODAS

`make zip` erzeugt das Liefer-ZIP mit `app/`, `assets/`, `app-package.json` und
`CHANGELOG.md`. Die Infrastrukturdateien (`Dockerfile`, `docker-compose*.yml`,
`nginx.conf`, `Makefile`) sind nicht Teil der Auslieferung.

## Autor
© 2026, Ondics GmbH

## Für wen ist diese App?
Diese App präsentiert Veranstaltungen im Gaming-Stil. Sie richtet sich an Gaming-affine Event-Entdecker:innen, die lokale Events auf spielerische Weise erkunden möchten.

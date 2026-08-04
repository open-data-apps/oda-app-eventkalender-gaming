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

Das Feldmodell ist in `assets/schema.json` als Frictionless *tabular-data-resource*
beschrieben. Pflichtfelder sind `event_id`, `titel` und `datum_start`; Datensätze ohne
Startzeitpunkt werden verworfen.

> **Hinweis zur CSV-Struktur:** Das Trennzeichen wird ausschließlich aus der **Kopfzeile**
> abgeleitet. Enthält diese ein Semikolon, wird die gesamte Datei als semikolongetrennt
> gelesen. Außerdem darf kein Feld einen Zeilenumbruch enthalten — auch nicht in
> Anführungszeichen. Beschreibungen müssen daher einzeilig bleiben.

### Mitgelieferter Referenzdatensatz

Für diese App existiert **keine reale kommunale Datenquelle**; sie wurde gegen einen
eigens erstellten Beispieldatensatz entwickelt. Dieser liegt in zwei Fassungen bei und ist
zum Hochladen in ein Open-Data-Portal vorgesehen:

| Datei | Format | Rolle |
| --- | --- | --- |
| `assets/events.csv` | CSV, 20 Datensätze | **maßgebliche Ressource**, auf die `apiurl` zeigt |
| `assets/events.ics` | iCalendar (RFC 5545) | dieselben Termine für Kalenderanwendungen |

Die Termine liegen rollierend um den 30.07.2026 — einige abgeschlossen, einige in der
laufenden Woche, der Großteil in der Zukunft — damit alle Kennzahlen der Startseite
belegt sind. Enthalten sind alle sechs Kategorien, ein abgesagter Termin und zwei
Wiederholungsregeln.

**Alle Inhalte sind frei erfunden.** Veranstalter, Kontaktadressen und Weblinks verweisen
durchgängig auf `example.org`; die Veranstaltungsorte sind fiktiv. Lediglich die
Geokoordinaten liegen im Raum Esslingen, damit die Kartenansicht sinnvoll zentriert.

<details>
<summary>Beschreibungstext für die Portal-Ressource</summary>

> **Veranstaltungskalender (Beispieldatensatz)**
>
> Beispielhafter Veranstaltungskalender mit 20 Terminen aus dem Bereich Gaming, E-Sport
> und digitale Jugendkultur. Der Datensatz dient der Erprobung von Kalenderanwendungen im
> Open Data App Store und enthält **ausschließlich frei erfundene Veranstaltungen**;
> Veranstalter, Kontaktdaten und Weblinks sind Platzhalter (`example.org`). Die
> Geokoordinaten liegen im Raum Esslingen am Neckar, damit Kartendarstellungen sinnvoll
> funktionieren.
>
> Felder: `event_id`, `titel`, `beschreibung`, `datum_start`, `datum_ende`, `zeitzone`,
> `ort_name`, `ort_adresse`, `ort_lat`, `ort_lon`, `kategorie`, `teilnehmer`,
> `veranstalter`, `kontakt_email`, `url`, `status`, `wiederholung`.
>
> Zeitangaben nach ISO 8601 in der Zeitzone `Europe/Berlin`. `kategorie` ist auf
> LAN-Party, Turnier, Community, Workshop, Convention und Sonstiges beschränkt, `status`
> auf geplant, abgesagt und abgeschlossen. `wiederholung` enthält, sofern belegt, eine
> iCalendar-RRULE. Das Feldmodell liegt als Frictionless-Schema bei.
>
> Lizenz: CC BY 4.0

</details>

Nach dem Hochladen sind `apiurl` und `resourceId` in `odas-config/config.json` auf die
reale Ressource zu setzen; die Links in `beschreibung` und `weiterfuehrendeLinks` sind
entsprechend nachzuziehen.

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

### Beim Aufruf kontaktierte Drittanbieter

Beim Aufruf dieser App werden folgende externe Server kontaktiert:

- `cdn.jsdelivr.net` — Bootstrap (Layout- und UI-Framework), Chart.js (Diagramme)
- `unpkg.com` — Leaflet (Kartendarstellung), Leaflet MarkerCluster (Gruppierung von Kartenmarkern)
- `tile.openstreetmap.org` — Kartenkacheln (OpenStreetMap)

Diese Anbieter bleiben auch im Standalone-Betrieb extern; ein vollständig autarker Betrieb ohne Internetzugang ist derzeit nicht möglich (siehe F-07 in `Review.md`).

### Auslieferung an den ODAS

`make zip` erzeugt das Liefer-ZIP mit `app/`, `assets/`, `app-package.json` und
`CHANGELOG.md`. Die Infrastrukturdateien (`Dockerfile`, `docker-compose*.yml`,
`nginx.conf`, `Makefile`) sind nicht Teil der Auslieferung.

## Autor
© 2026, Ondics GmbH

## Für wen ist diese App?
Diese App präsentiert Veranstaltungen im Gaming-Stil. Sie richtet sich an Gaming-affine Event-Entdecker:innen, die lokale Events auf spielerische Weise erkunden möchten.

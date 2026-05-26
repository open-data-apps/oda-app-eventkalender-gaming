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

## Autor
© 2026, Ondics GmbH

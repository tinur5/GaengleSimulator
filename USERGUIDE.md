# Benutzerhandbuch - GaengleSimulator

## 📱 So bedienst du die App

### Start
1. Öffne die App im Browser (auf Handy, Tablet oder PC)
2. Du siehst sofort den Energiestatus des Hauses

### ⚙️ Steuerung

**DATUM wählen:**
- Klicke auf das Eingabefeld
- Wähle einen beliebigen Tag aus
- Die App berechnet neu

**UHRZEIT wählen:**
- Bewege den Schieber ← → oder tippe eine Zeit
- Die App zeigt sofort, was zu dieser Stunde passiert
- Schieber reicht von 00:00 (Mitternacht) bis 23:00 (11 Uhr abends)

---

## 📊 Was die Anzeigen bedeuten

### KPI-Karten (oben)

**☀️ PV-PRODUKTION (orange)**
- Wie viel Solarenergie gerade produziert wird
- 0 kW nachts, max. ~40 kW mittags im Sommer

**🏠 VERBRAUCH (rot)**
- Wie viel Energie alle Wohnungen + Allgemeinteile brauchen
- Aufgeschlüsselt nach:
  - Wohnungen (Familien + Pensionierte)
  - Pool (nur tagsüber in Saison aktiv)
  - Heizung (mehr im Winter)
  - Garage, Boiler

**📈/📉 ÜBERSCHUSS/DEFIZIT (grün/grau)**
- Positiv (grün) = Mehr PV als Verbrauch → Batterie laden / Netz einspeisen
- Negativ (grau) = Weniger PV als Verbrauch → Batterie entladen / Netz beziehen

**🔋 BATTERIE (lila)**
- Durchschnittlicher Ladezustand beider Batterien
- 30-85% ist normal
- <15% = niedriger Reserve
- >95% = voll geladen

---

### 📈 Parteien-Details

Drei Boxen mit Verbrauch pro Haushalt:

**👨‍👩‍👧‍👦 Graf (Tesla)**
- Haushalt: 70% des Verbrauchs
- 🚗 Tesla laden: 30%

**👵 Wetli (VW)**
- Haushalt: 80% des Verbrauchs
- 🚗 VW laden: 20%

**👨‍👩‍👧‍👦 Bürzle (E-Bike)**
- Haushalt: 98% des Verbrauchs
- 🚴 E-Bike laden: 2%

---

### 🌊 Sankey Energiefluss (Mitte)

Das bunte Diagramm zeigt, wo die Energie fließt:

**Eingänge (von links):**
- ☀️ **PR** = Solaranlage (oben)
- 🔌 **Netz** = Stromversorgung (unten)

**Mittlere Knoten (Verteiler):**
- **WR1, WR2** = Wechselrichter (Inverter) - konvertieren DC zu AC Strom

**Speicher:**
- **Bat1, Bat2** = Batterien (lila/violett)

**Verbraucher (rechts):**
- **Wohnungen** = Alle 3 Haushalte
- **Allgemein** = Pool, Heizung, Garage, Boiler

**Farben:**
- 🟠 Orange = Energie von Solaranlage
- 🟣 Violett = Batterie
- 🔴 Rot = Energie vom Netz
- 🟢 Grün = Verbraucher
- 🔵 Blau = Andere Energieflüsse

---

### 💡 24h Haushalt-Verbrauch (unten)

Das Balkendiagramm zeigt:
- **Rote Linie** = Aktuelle Uhrzeit (von deinem Schieber)
- **Balken** = Verbrauch pro Stunde über 24 Stunden
- **Muster:**
  - Morgens 6-8 Uhr: Hoch (Frühstück, Duschen)
  - Tagsüber 9-16 Uhr: Niedrig (Arbeit/Schule)
  - Abends 17-22 Uhr: Hoch (Kochen, TV)
  - Nachts: Sehr niedrig

---

## 🔋 Batteriestand-Anzeige (rechts oben)

Zwei farbige Balken:

**Wechselrichter 1 / Wechselrichter 2**
- Blauer Balken = Aktueller Ladezustand
- Oben die Prozent: z.B. "65%"
- Darunter in kWh: z.B. "13.0 kWh"

**Farbe des Balkens:**
- 🟢 Grün = >66% (gut geladen)
- 🟡 Gelb = 33-66% (mittel)
- 🔴 Rot = <33% (schwach)

---

## 💡 Tipps & Tricks

### Tag durchspielen
1. Stelle das Datum auf heute
2. Ziehe den Zeit-Schieber von links nach rechts (00:00 → 23:00)
3. Beobachte, wie sich alles verändert:
   - PV steigt (Sonne geht auf)
   - Batterie lädt sich (wenn Überschuss)
   - Abends entlädt sich die Batterie (Defizit)

### Jahreszeiten-Effekte
- **Winter (Dezember-Februar):** Weniger PV, mehr Heizung
- **Frühling/Herbst (März-Mai, Sept-Nov):** Moderat
- **Sommer (Juni-August):** Viel PV, weniger Heizung, Pool aktiv

### Wochenende vs. Werktag
- **Mo-Fr:** Niedriger Tagesverbrauch (alle arbeiten/Schule)
- **Sa-So:** Höherer Tagesverbrauch (alle zu Hause)

---

## ⚙️ Technische Details (für Interessierte)

### Wie funktioniert die Optimierung?

**Nachts (21:00-06:00):**
- ✅ Priorität: Vom Netz beziehen (günstiger)
- ⚠️ Batterie sparen für nächste Nacht

**Tagsüber (06:00-21:00):**
- ✅ PV nutzen für direkten Verbrauch
- ✅ Überschuss in Batterie speichern
- ⚠️ Batterie entladen nur wenn nötig

**Intelligente Batterie-Verwaltung:**
- Min. Reserve: 12% (2.4 kWh)
- Max. Ladung: 95% (Schutz)
- Automatische Start-SOC:
  - +15% im Winter (längere Nächte)
  - +10% am Wochenende (mehr Verbrauch)

**Ergebnis: 81.4% Energieunabhängigkeit** 🎉

---

## ❓ Häufige Fragen

**F: Warum ist die Batterie nachts nicht leer?**
A: Die optimierte Strategie speichert Energie für die Nacht. Bei Defizit wird zuerst vom günstigen Netz bezogen.

**F: Kann ich die Batterie manuell steuern?**
A: Nein, diese App ist eine Simulation. Die echte Batterie-Steuerung erfolgt durch das Energiemanagementsystem.

**F: Warum wird so viel ins Netz eingespeist?**
A: Die PV ist sehr groß (66.88 kWp) und produziert im Sommer viel mehr als der Verbrauch.

**F: Kann ich die Verbrauchsmuster ändern?**
A: Nein, die App simuliert realistische Verbrauchsmuster basierend auf Jahreszeit, Wochentag und Uhrzeit.

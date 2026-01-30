# Vercel Deployment Guide - GaengleSimulator

## 🚀 Wie man die App online stellt

### Schritt 1: GitHub Repository erstellen
1. Falls noch nicht gemacht: Git-Repository initialisieren
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Repository auf GitHub hochladen:
   - Gehe auf [github.com](https://github.com)
   - Klicke "New repository"
   - Name: `gaengle-simulator`
   - Mache es **Public** (damit kann man darauf zugreifen)
   - Folge den Anweisungen zum Push-en

### Schritt 2: Auf Vercel deployen
1. Gehe auf [vercel.com](https://vercel.com)
2. Klicke "Sign Up" → Melde dich mit GitHub an
3. Klicke "New Project"
4. Wähle dein `gaengle-simulator` Repository
5. Vercel macht automatisch die Konfiguration:
   - Framework: Next.js (auto-erkannt)
   - Build Command: `npm run build` ✓
   - Start Command: `next start` ✓
6. **Optional: Environment Variables konfigurieren** (für Issue-Reporting):
   - Klicke auf "Environment Variables"
   - Für GitHub-Integration:
     - `GITHUB_TOKEN`: Dein GitHub Personal Access Token
     - `GITHUB_REPO`: `tinur5/GaengleSimulator`
   - Für Email-Fallback (wenn kein GitHub-Token):
     - `SMTP_HOST`: z.B. `smtp.gmail.com`
     - `SMTP_PORT`: z.B. `587`
     - `SMTP_USER`: Deine Email-Adresse
     - `SMTP_PASSWORD`: Dein Email App-Passwort
     - `EMAIL_FALLBACK_TO`: `tinur5@hotmail.com`
7. Klicke "Deploy"
8. Warten Sie 2-5 Minuten → App ist live! 🎉

### Schritt 3: Link teilen
Nach dem Deploy bekommst du einen Link wie:
```
https://gaengle-simulator.vercel.app
```

**Diese URL kannst du deinem Freund geben** - er kann die App sofort im Browser öffnen (auf Handy, Tablet, PC).

---

## 📱 Mobile Optimierung

Die App ist bereits mit Tailwind CSS mobile-optimiert:
- ✅ Responsive Layout
- ✅ Touch-freundliche Buttons
- ✅ Optimierte Bildschirmgrößen
- ✅ Automatische Skalierung

### Test auf dem Handy
1. Öffne die Vercel-URL auf deinem Smartphone
2. Die App sollte perfekt aussehen
3. Optional: Homescreen-Shortcut erstellen (Safari: Share → "Zum Homescreen")

---

## 🔒 Sicherheit & Privacy

**Wichtig:** Die App speichert keine Daten auf einem Server!
- Alle Berechnungen laufen im Browser
- Keine Datenspeicherung
- Keine Benutzerkonten nötig
- Völlig privat

---

## 🔄 Updates & Änderungen

Wenn du die App veränderst:
1. Committe deine Änderungen lokal
2. Push zu GitHub:
   ```bash
   git push origin main
   ```
3. Vercel deployt automatisch innerhalb von 1-2 Minuten
4. Die URL bleibt gleich!

---

## 💡 Alternative: Auf eigenen Server deployen

Falls du einen eigenen Server hast:

```bash
# Build erstellen
npm run build

# Production-Server starten
npm start
```

Die App läuft dann auf Port 3000 (konfigurierbar via `PORT` Environment-Variable).

---

## ❓ Häufige Fragen

**F: Kostet Vercel etwas?**
A: Nein, für kleine Projekte wie dieses ist Vercel völlig kostenlos.

**F: Braucht mein Freund einen Account?**
A: Nein! Er gibt einfach die URL in seinen Browser ein.

**F: Kann die App offline funktionieren?**
A: Ja, nach dem ersten Laden funktioniert sie auch ohne Internet (Browser-Cache).

**F: Wie sichert man die Änderungen ab?**
A: Alles ist in Git versioniert. Mit `git push` ist alles auf GitHub.

**F: Wie funktioniert das Issue-Reporting?**
A: Es gibt zwei Optionen:
- **Mit GitHub-Integration**: Issues werden direkt auf GitHub erstellt (erfordert `GITHUB_TOKEN`)
- **Mit Email-Fallback**: Issues werden als Email gesendet (erfordert SMTP-Konfiguration)
Wenn keines konfiguriert ist, zeigt die App eine entsprechende Fehlermeldung.

# Issue Reporting - Email Fallback Configuration

## Übersicht

Die GaengleSimulator-App bietet eine integrierte Fehlermeldefunktion, die automatisch zwischen GitHub-Integration und Email-Fallback wählt.

## Konfigurationsoptionen

### Option 1: GitHub-Integration (Empfohlen)

Issues werden direkt als GitHub-Issues erstellt.

**Erforderliche Environment Variables:**
```
GITHUB_TOKEN=dein_github_personal_access_token
GITHUB_REPO=tinur5/GaengleSimulator
```

**GitHub Token erstellen:**
1. Gehe zu [GitHub Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Klicke "Generate new token (classic)"
3. Wähle Scope: `repo` (voller Zugriff auf Repositories)
4. Kopiere den Token und setze ihn als `GITHUB_TOKEN`

### Option 2: Email-Fallback

Wenn kein GitHub-Token konfiguriert ist, werden Issues per Email gesendet.

**Erforderliche Environment Variables:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=deine_email@gmail.com
SMTP_PASSWORD=dein_app_passwort
EMAIL_FALLBACK_TO=tinur5@hotmail.com
```

**Gmail App-Passwort erstellen:**
1. Gehe zu [Google Account > Security](https://myaccount.google.com/security)
2. Aktiviere 2-Faktor-Authentifizierung (falls noch nicht aktiviert)
3. Gehe zu "App passwords" (App-Passwörter)
4. Erstelle ein neues App-Passwort für "Mail"
5. Kopiere das Passwort und setze es als `SMTP_PASSWORD`

**Andere Email-Provider:**
- **Gmail**: `smtp.gmail.com:587`
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Mailgun**: `smtp.mailgun.org:587`

## Vercel Deployment

### Environment Variables in Vercel setzen:

1. Gehe zu deinem Projekt auf [Vercel Dashboard](https://vercel.com/dashboard)
2. Klicke auf "Settings"
3. Wähle "Environment Variables"
4. Füge die gewünschten Variables hinzu
5. Klicke "Save"
6. Redeploy das Projekt

## Lokale Entwicklung

1. Kopiere `.env.example` zu `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Bearbeite `.env.local` und füge deine Credentials ein

3. Starte den Development-Server:
   ```bash
   npm run dev
   ```

## Funktionsweise

### Mit GitHub-Integration:
1. Benutzer meldet ein Problem über den "Problem melden" Button
2. App sendet Issue direkt an GitHub
3. Issue wird mit Label `user-reported` erstellt
4. Benutzer erhält Link zum GitHub-Issue

### Mit Email-Fallback:
1. Benutzer meldet ein Problem über den "Problem melden" Button
2. App erkennt, dass kein GitHub-Token vorhanden ist
3. Email wird an `EMAIL_FALLBACK_TO` gesendet
4. Email enthält alle Issue-Details (Titel, Beschreibung, User-Agent, Timestamp)
5. Benutzer sieht Bestätigung dass Email gesendet wurde

### Ohne Konfiguration:
1. Benutzer meldet ein Problem
2. App zeigt Fehlermeldung: "GitHub-Integration und Email-Fallback sind nicht konfiguriert"

## Email-Format

Die Email enthält:
- **Subject**: `[GaengleSimulator] Issue Report: <Titel>`
- **Inhalt**:
  - Titel des Problems
  - Detaillierte Beschreibung
  - Technische Details (Timestamp, User-Agent)
  - Hinweis dass Email-Fallback verwendet wurde
  - Link zum GitHub-Repository

## Sicherheit

### GitHub Token:
- ⚠️ **NIEMALS** den Token im Code committen
- ⚠️ Verwende Environment Variables
- ⚠️ Token hat Zugriff auf alle Repos - verwende einen Token nur für dieses Projekt
- ✅ Lösche den Token wenn er nicht mehr benötigt wird

### Email-Passwort:
- ⚠️ **NIEMALS** das Passwort im Code committen
- ⚠️ Verwende App-Passwörter statt echtem Passwort
- ✅ App-Passwörter können jederzeit widerrufen werden

## Troubleshooting

### "Gmail blockiert die Email"
- Stelle sicher, dass 2-Faktor-Authentifizierung aktiviert ist
- Verwende ein App-Passwort statt dem normalen Passwort
- Überprüfe ob "Less secure app access" deaktiviert ist (sollte deaktiviert sein)

### "SMTP Timeout"
- Überprüfe Firewall-Einstellungen
- Stelle sicher, dass Port 587 (oder 465) nicht blockiert ist
- Versuche einen anderen Email-Provider

### "Email kommt nicht an"
- Überprüfe Spam-Ordner
- Überprüfe die `EMAIL_FALLBACK_TO` Adresse
- Schaue in die Logs für Fehlermeldungen

### "GitHub API Fehler"
- Stelle sicher, dass der Token gültig ist
- Überprüfe, dass der Token `repo` Scope hat
- Stelle sicher, dass `GITHUB_REPO` im Format `owner/repo` ist

## Erweiterte Funktionen (Zukünftig)

Die aktuelle Implementierung bietet Email-Fallback als Basis-Funktionalität. Zukünftige Erweiterungen könnten sein:

- ✉️ Automatische Email-Benachrichtigungen bei Issue-Updates
- 🔄 Branch-Erstellung basierend auf Issues
- 🤖 GitHub Copilot Integration für automatische Fixes
- 📧 Email-basierte Approval-Workflows
- 🔔 Build-Status Benachrichtigungen

Diese Funktionen erfordern zusätzliche Infrastruktur (Webhooks, CI/CD Integration, etc.) und sind nicht Teil der aktuellen Minimal-Implementierung.

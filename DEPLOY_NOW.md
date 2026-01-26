# 🚀 MACH DAS LIVE - Schritt für Schritt

## Was du am Ende hast:
✅ Eine Link wie: `https://gaengle-simulator.vercel.app`  
✅ Du kannst die App vom Handy öffnen  
✅ Dein Freund kann den Link klicken und los geht's  
✅ Keine Installation nötig  

---

## SCHRITT 1: GitHub vorbereiten (2 Min)

Falls du noch keinen GitHub Account hast:
1. Gehe auf **[github.com](https://github.com)**
2. Klicke **"Sign up"**
3. E-Mail eingeben, Passwort, Benutzername
4. Bestätige deine E-Mail

---

## SCHRITT 2: Code auf GitHub hochladen (5 Min)

Öffne ein Terminal/PowerShell im Projektordner und tippe:

```bash
git remote add origin https://github.com/[DEIN-USERNAME]/gaengle-simulator.git
git branch -M main
git push -u origin main
```

Dann:
1. Es fragt dich nach GitHub Login
2. Gib deine E-Mail und Passwort ein (oder generate token)
3. Warten bis "done" angezeigt wird ✓

**Fertig mit GitHub! Der Code ist jetzt online.**

---

## SCHRITT 3: Vercel Deploy (3 Min) - DAS WICHTIGSTE!

1. Öffne **[vercel.com](https://vercel.com)** im Browser
2. Klicke **"Sign Up"**
3. Wähle **"Continue with GitHub"**
4. Autorisiere Vercel (klick auf "Authorize")
5. Nach der Anmeldung: Klicke **"New Project"**
6. Du siehst dein Repository `gaengle-simulator` → Klick darauf
7. Überprüfe die Settings:
   - Framework: `Next.js` ✓
   - Build Command: `npm run build` ✓  
   - Output Directory: `.next` ✓
8. Klicke **"Deploy"**

**Vercel macht jetzt alles automatisch:**
- Lädt dein Repository
- Installiert Dependencies
- Baut die App
- Deployed sie live

Nach **2-5 Minuten** siehst du eine grüne Meldung: **"Deployment Successful"** ✅

---

## 🎉 SCHRITT 4: Link bekommen

Klicke auf die URL oben auf der Vercel-Seite, z.B.:
```
https://gaengle-simulator.vercel.app
```

**DIESE URL IST DEINE GEHEIME WAFFE!**

---

## 📱 DAS FUNKTIONIERT JETZT:

### Auf dem Handy:
1. Öffne Safari oder Chrome
2. Gib die URL ein oder scan QR-Code
3. App lädt... und schon sieht man alles! 📱

### Optional: Auf Homescreen speichern
- Safari: **Share → "Zum Homescreen"**
- Chrome: **Menü → "Auf Startbildschirm"**
- Danach kann man die App wie eine App öffnen!

### Deinem Freund zeigen:
> "Hier ist die Energie-App: https://gaengle-simulator.vercel.app"
> 
> Einfach klicken - funktioniert auf jedem Gerät!

---

## 🔄 WICHTIG: Updates machen

Wenn du die App veränderst:

```bash
git add .
git commit -m "Meine Änderung"
git push
```

Vercel sieht die Änderung automatisch und deployed sie neu (1-2 Min).

Die URL bleibt gleich!

---

## ❌ Was kann schiefgehen?

**"Deployment failed"**
→ Vercel zeigt dir in den Logs was falsch ist
→ Meist: Syntax-Fehler in einer Datei
→ Fix lokal und `git push` wieder

**"Seite wird nicht geladen"**
→ Browser-Cache leeren: `Strg+Shift+R` (oder `Cmd+Shift+R` auf Mac)
→ Oder Incognito-Modus probieren

**"Die URL funktioniert nicht"**
→ Ein paar Sekunden nach Deploy warten
→ Vercel muss die App noch auf mehreren Servern verteilen

---

## 💡 Das Ergebnis

Jetzt hast du:

| Was | Status |
|-----|--------|
| App läuft lokal | ✅ |
| App im Internet | ✅ **NEU!** |
| Handy-Zugriff | ✅ **NEU!** |
| Link zum Teilen | ✅ **NEU!** |
| Auto-Updates | ✅ **NEU!** |
| Kostenlos | ✅ |
| Keine Installation nötig | ✅ |

---

## 🎯 NÄCHSTE SCHRITTE (Optional)

1. **Mit Freund testen:** Link schicken, Feedback holen
2. **Mehr Tenants:** Neue Haushalte in der App hinzufügen
3. **Echte Daten:** Mit echten Verbrauchsmessungen verbinden
4. **Mobile App:** Mit React Native zu echter App machen

---

**Fragen?** Siehe:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detaillierte Erklärung
- [USERGUIDE.md](./USERGUIDE.md) - Wie man die App benutzt
- [QUICKSTART.md](./QUICKSTART.md) - Schnelle Referenz

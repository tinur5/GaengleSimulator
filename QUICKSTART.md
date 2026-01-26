# Quick Start - 5 Minuten zum Live-Deploy

## 🚀 Für Eilige

### Schritt 1: GitHub Account (1 Min)
```bash
# Falls noch nicht gemacht, committe alles:
git add .
git commit -m "Ready for deployment"
git push origin main
```

Falls noch kein GitHub Account: [github.com](https://github.com) → Sign Up

---

### Schritt 2: Vercel Deploy (2 Min)
1. Gehe auf **[vercel.com](https://vercel.com)**
2. Klicke **"Sign Up"** → Wähle **"Continue with GitHub"**
3. Autorisiere Vercel
4. Klicke **"New Project"**
5. Wähle dein **gaengle-simulator** Repository
6. Klicke **"Deploy"**

**Fertig! ✅**

Nach 2-5 Minuten:
- Deine App läuft unter: `https://[dein-projekt].vercel.app`
- Teile diesen Link mit deinem Freund!

---

### Schritt 3: Link teilen
Schreib deinem Freund:
> Hier ist die Energy-Simulator App: `https://[dein-projekt].vercel.app`
> Einfach im Browser öffnen - funktioniert auf Handy, Tablet und PC!

---

## 📝 Noch nicht auf GitHub?

**Option 1: GitHub Desktop (easiest)**
1. Download: [desktop.github.com](https://desktop.github.com)
2. "Create a New Repository"
3. Name: `gaengle-simulator`
4. Publish to GitHub
5. Fertig!

**Option 2: Command Line**
```bash
cd GaengleSimulator
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/[dein-username]/gaengle-simulator.git
git push -u origin main
```

---

## 🎯 Was danach?

**App läuft jetzt:**
- ✅ Überall erreichbar via Link
- ✅ Handy, Tablet, PC - alles funktioniert
- ✅ Dein Freund kann reinklicken ohne Installation
- ✅ Updates automatisch wenn du `git push` machst

**Troubleshooting:**
- Vercel zeigt Build-Fehler? → Check der Logs in Vercel Dashboard
- App lädt nicht? → Browser-Cache leeren (Strg+Shift+R)
- Änderungen nicht sichtbar? → Ein paar Sekunden warten nach git push

---

**Fragen?** → Siehe [DEPLOYMENT.md](./DEPLOYMENT.md) für Details

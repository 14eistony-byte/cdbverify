# BlockVerify — Discord + Minecraft (Starterprojekt)

Ein erster lokal startbarer MVP für deinen Discord-Minecraft-Server. Die Website nutzt ein Minecraft-inspiriertes Gras-/Pixel-Design; der Bot stellt `/verify` bereit.

## Was funktioniert

- Discord-Bot auf Basis von `discord.js`
- `/verify` mit privatem Verifizierungslink
- Discord OAuth2-Anmeldung auf der Website
- Auswahl Java/Bedrock und Einreichung eines Minecraft-Namens
- Status für ausstehende Prüfung
- `/verifyapprove spieler:<Discord-Spieler>` vergibt die Rolle `Verified` **nur nach manueller Prüfung durch einen Moderator**
- Einfache lokale JSON-Speicherung

## Wichtige Sicherheitsgrenze

Ein Minecraft-Spielername, ein Skin oder eine Discord-Anmeldung beweisen für sich allein nicht, dass eine Person den Minecraft-Account kontrolliert. Dieser MVP vergibt die Rolle deshalb **nicht automatisch bei der Formulareinreichung**. Ein Moderator darf `/verifyapprove` erst verwenden, nachdem ein belastbarer Besitznachweis außerhalb dieses MVP geprüft wurde.

Da der Server bei Aternos läuft und dort kein beliebiges eigenes Plugin hochgeladen werden kann, ist eine vollautomatische Prüfung über einen selbst entwickelten Minecraft-Chat-Befehl nicht Bestandteil dieser ersten Version. Dafür muss später eine tatsächlich verfügbare und geeignete Integration gefunden oder die Serverumgebung geändert werden.

## Voraussetzungen

- Node.js 20 oder neuer
- Ein Discord-Server, auf dem du Bot und Rolle konfigurieren darfst
- Eine Discord-Anwendung im Developer Portal

## 1. Discord-Anwendung einrichten

1. Öffne https://discord.com/developers/applications und erstelle eine Application.
2. Unter **Bot** erstelle/öffne den Bot und kopiere den Bot-Token.
3. Unter **OAuth2** füge als Redirect URL exakt `http://localhost:3000/auth/discord/callback` hinzu.
4. Kopiere Application ID und OAuth2 Client Secret.
5. Erstelle in deinem Discord-Server eine Rolle namens `Verified` und kopiere ihre Rollen-ID (Entwicklermodus in Discord aktivieren).
6. Lade den Bot über OAuth2 URL Generator mit den Scopes `bot` und `applications.commands` ein. Er braucht `View Channels`, `Send Messages` und `Manage Roles`. Setze die Bot-Rolle in der Rollenliste oberhalb von `Verified`.
7. Kopiere die Server-ID (Entwicklermodus → Rechtsklick auf Server → ID kopieren).

## 2. Lokal auf dem PC starten

1. Entpacke den ZIP-Ordner.
2. Öffne ein Terminal im Projektordner.
3. Kopiere `.env.example` nach `.env`.
   - Windows PowerShell: `Copy-Item .env.example .env`
   - macOS/Linux: `cp .env.example .env`
4. Öffne `.env` und trage deine Werte ein. Erfinde keine IDs/Secrets. Erzeuge für `SESSION_SECRET` eine lange zufällige Zeichenfolge.
5. Installiere Pakete:
   ```bash
   npm install
   ```
6. Registriere Slash-Commands:
   ```bash
   npm run deploy-commands
   ```
7. Starte Bot und Website:
   ```bash
   npm start
   ```
8. Öffne `http://localhost:3000` im Browser.

**Hinweis:** Der PC muss laufen und mit dem Internet verbunden sein, damit der Bot online bleibt. `localhost` ist zunächst nur auf deinem PC erreichbar; Discord OAuth funktioniert lokal, wenn die Redirect URL exakt übereinstimmt.

## 3. Testablauf

1. Führe `/verify` in deinem Discord-Server aus.
2. Öffne den privaten Link.
3. Melde dich mit Discord an.
4. Reiche Edition und Spielernamen ein.
5. Der Antrag wartet auf manuelle Prüfung.
6. Erst nach externer Besitzprüfung kann ein Moderator `/verifyapprove spieler:@Person` ausführen.

## Später vom Handy aus

Ein Handy kann den Bot nicht zuverlässig betreiben, wenn die App im Hintergrund beendet wird. Der übliche Weg ist, den Bot später auf einen dauerhaft laufenden Node.js-Host zu übertragen und ihn vom Handy aus über das Hosting-Dashboard zu verwalten. Dafür muss die Website außerdem eine öffentliche HTTPS-Adresse bekommen und `BASE_URL` sowie `DISCORD_REDIRECT_URI` müssen angepasst werden. **Veröffentliche niemals deine `.env` oder deinen Bot-Token.**

## Bekannte Einschränkungen dieses MVP

- Der Skin wird nur als externe Vorschau von mc-heads.net geladen; das ist keine Verifizierung.
- Daten werden in `data/requests.json` gespeichert und sind für einen produktiven Mehrserverbetrieb nicht ausgelegt.
- Die Admin-Freigabe ist manuell. Es gibt noch keinen sicheren automatischen Minecraft-Besitznachweis.
- Vor einem öffentlichen Deployment sollten Rate-Limits, CSRF-Schutz für Formulare, ein produktiver Session-Store, HTTPS, Datenschutz-/Löschfunktionen und robustere Datenbankhaltung ergänzt werden.

require("dotenv").config();
const crypto = require("node:crypto");
const express = require("express");
const session = require("express-session");
const {
  Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits,
  MessageFlags
} = require("discord.js");
const store = require("./store");

const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET",
  "DISCORD_GUILD_ID", "DISCORD_REDIRECT_URI", "VERIFIED_ROLE_ID", "SESSION_SECRET"];
for (const key of required) {
  if (!process.env[key] || process.env[key].startsWith("put_") || process.env[key].startsWith("replace_")) {
    console.error(`Bitte ${key} in deiner .env konfigurieren.`);
    process.exit(1);
  }
}
if (process.env.SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET sollte mindestens 32 Zeichen lang sein.");
  process.exit(1);
}

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();

app.disable("x-powered-by");
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(session({
  name: "mcverify.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 2 * 60 * 60 * 1000 }
}));

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function page(title, body, user) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} · BlockVerify</title>
  <link rel="stylesheet" href="/style.css"></head><body>
  <header class="top"><a class="brand" href="/">▧ BLOCK<span>VERIFY</span></a>
  <span class="tag">JAVA + BEDROCK</span></header><main class="wrap">${body}</main>
  <footer>BlockVerify · Demo-Version · Gib niemals dein Minecraft- oder Microsoft-Passwort auf dieser Website ein.</footer></body></html>`;
}
function alertBox(text, type = "info") { return `<div class="notice ${type}">${escapeHtml(text)}</div>`; }
function loginButton() { return `<a class="button" href="/auth/discord">Mit Discord anmelden</a>`; }
function authRequired(req, res, next) {
  if (!req.session.discordUser) return res.redirect("/auth/discord");
  next();
}

app.get("/style.css", (_req, res) => {
  res.type("text/css").send(`
  :root{--grass:#65b741;--dirt:#795238;--dark:#172117;--panel:#223023;--cream:#f2f0d8;--gold:#f6d365}
  *{box-sizing:border-box}body{margin:0;background-color:var(--dark);background-image:linear-gradient(45deg,#1c291c 25%,transparent 25%),linear-gradient(-45deg,#1c291c 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1c291c 75%),linear-gradient(-45deg,transparent 75%,#1c291c 75%);background-size:32px 32px;color:var(--cream);font-family:Verdana,Arial,sans-serif;line-height:1.55}
  .top{display:flex;justify-content:space-between;align-items:center;padding:18px max(5vw,18px);background:#101810;border-bottom:5px solid var(--grass)}.brand{font-weight:1000;font-size:1.25rem;letter-spacing:2px;color:#fff;text-decoration:none}.brand span{color:var(--grass)}.tag{font-size:.75rem;color:var(--gold);font-weight:bold}
  .wrap{width:min(760px,92vw);margin:48px auto;background:rgba(24,37,24,.97);border:4px solid #3c5834;box-shadow:8px 8px 0 #0b100b;padding:clamp(20px,5vw,42px)}h1{line-height:1.2;font-size:clamp(1.8rem,5vw,3rem);margin-top:0}h2{color:var(--gold)}.grassbar{height:14px;background:repeating-linear-gradient(90deg,#70c34a 0 24px,#559b36 24px 48px);border-bottom:5px solid var(--dirt);margin:22px 0}.sub{color:#c8d6c0}.card{padding:20px;margin:18px 0;background:#2a3b29;border:3px solid #486440}.button{display:inline-block;border:0;border-bottom:5px solid #376d2c;background:var(--grass);color:#10200d;padding:13px 18px;text-decoration:none;font-weight:900;cursor:pointer;font-size:1rem}.button:hover{filter:brightness(1.1);transform:translateY(-1px)}.button.secondary{background:#e3c45b;border-color:#9b7924}.choices{display:flex;gap:12px;flex-wrap:wrap}.choices label{display:flex;gap:8px;align-items:center;background:#172517;padding:12px;border:2px solid #4c6744}.field{display:block;margin:18px 0}.field span{display:block;font-weight:bold;margin-bottom:7px}.field input,.field select{width:100%;padding:12px;background:#101810;color:white;border:2px solid #59734e;font-size:1rem}.notice{padding:14px;border-left:5px solid var(--gold);background:#31341f;margin:18px 0}.notice.ok{border-color:#71ce52;background:#1d351d}.notice.bad{border-color:#e68d6f;background:#3b2420}.small{font-size:.86rem;color:#c3d0bb}footer{text-align:center;padding:20px;color:#a8b7a1;font-size:.8rem}.status{display:inline-block;padding:5px 10px;background:#514622;color:#ffe58d;font-weight:bold}.pixel{font-family:monospace;letter-spacing:1px}.profile{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.profile img{width:96px;height:96px;image-rendering:pixelated;border:3px solid #58754d;background:#101810}
  `);
});

app.get("/", (req, res) => {
  const user = req.session.discordUser;
  const body = `<div class="pixel small">[ SERVER LINK SYSTEM v1.0 ]</div><div class="grassbar"></div>
  <h1>Dein Minecraft-Account.<br><span style="color:var(--grass)">Dein Discord.</span></h1>
  <p class="sub">Verknüpfe dein Profil in wenigen Schritten. Pixel-Look, klare Statusanzeige und kein Minecraft-Passwort nötig.</p>
  <div class="card"><h2>▣ So funktioniert's</h2><p>1. Starte <b>/verify</b> auf Discord.<br>2. Melde dich hier mit Discord an.<br>3. Trage Edition und Spielernamen ein.<br>4. Ein Serverteam-Mitglied prüft den Besitznachweis, bevor die Rolle vergeben wird.</p></div>
  ${user ? `<p>Angemeldet als <b>${escapeHtml(user.username)}</b>.</p><a class="button" href="/profile">Zum Profil</a>` : loginButton()}
  <div class="notice">Sicherheitshinweis: Ein Minecraft-Name allein beweist keinen Accountbesitz. In dieser Aternos-Version wird die Rolle erst nach einer manuellen Prüfung vergeben.</div>`;
  res.send(page("Start", body, user));
});

app.get("/auth/discord", (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  req.session.oauthState = state;
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID);
  url.searchParams.set("redirect_uri", process.env.DISCORD_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

app.get("/auth/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || !req.session.oauthState || state !== req.session.oauthState) {
    return res.status(400).send(page("Login fehlgeschlagen", alertBox("Ungültige Anmeldung. Bitte versuche es erneut.", "bad")));
  }
  delete req.session.oauthState;
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });
    if (!tokenResponse.ok) throw new Error("OAuth token request failed");
    const tokenData = await tokenResponse.json();
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    if (!userResponse.ok) throw new Error("Discord profile request failed");
    const discordUser = await userResponse.json();
    // If login began from a /verify link, enforce that it belongs to this Discord account.
    if (req.session.requestToken) {
      const linkedRequest = store.getRequest(req.session.requestToken);
      if (!linkedRequest || linkedRequest.discordId !== discordUser.id ||
          !["started", "login_matched"].includes(linkedRequest.status)) {
        return res.status(403).send(page("Falscher Discord-Account",
          alertBox("Dieser Verifizierungslink gehört zu einem anderen Discord-Konto. Bitte starte /verify erneut mit deinem eigenen Account.", "bad")));
      }
      store.updateRequest(linkedRequest.token, { status: "login_matched" });
    }
    req.session.discordUser = { id: discordUser.id, username: discordUser.global_name || discordUser.username, avatar: discordUser.avatar };
    req.session.save(() => res.redirect("/profile"));
  } catch (error) {
    console.error("Discord OAuth error:", error.message);
    res.status(502).send(page("Login fehlgeschlagen", alertBox("Discord-Anmeldung fehlgeschlagen. Bitte später erneut versuchen.", "bad")));
  }
});

app.get("/profile", authRequired, (req, res) => {
  const user = req.session.discordUser;
  const entries = store.listAwaitingReview().filter(x => x.discordId === user.id);
  const latest = entries[0];
  let status = latest ? `<p>Status: <span class="status">WARTET AUF PRÜFUNG</span></p><p>Minecraft: <b>${escapeHtml(latest.minecraftName)}</b> (${escapeHtml(latest.edition)})</p>` :
    `<p>Noch kein Minecraft-Profil eingereicht.</p>`;
  const body = `<h1>Spielerprofil</h1><div class="profile"><img alt="Minecraft-Kopf-Vorschau" src="https://mc-heads.net/avatar/${encodeURIComponent(latest?.minecraftName || "Steve")}/96" onerror="this.style.display='none'"><div><b>${escapeHtml(user.username)}</b><br><span class="small">Discord-ID: ${escapeHtml(user.id)}</span></div></div>
  <div class="grassbar"></div>${status}
  <div class="card"><h2>Account verknüpfen</h2><form method="post" action="/claim">
  <label class="field"><span>Minecraft-Edition</span><div class="choices"><label><input type="radio" name="edition" value="Java" required> Java</label><label><input type="radio" name="edition" value="Bedrock" required> Bedrock</label></div></label>
  <label class="field"><span>Minecraft-Spielername</span><input name="minecraftName" minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" required placeholder="z. B. Steve"></label>
  <button class="button" type="submit">Profil einreichen</button></form></div>
  <div class="notice">Diese Einreichung beweist noch nicht, dass dir der Minecraft-Account gehört. Die Verified-Rolle wird erst nach einem separaten Besitznachweis und manueller Freigabe vergeben.</div>
  <p><a class="button secondary" href="/logout">Abmelden</a></p>`;
  res.send(page("Spielerprofil", body, user));
});

app.post("/claim", authRequired, (req, res) => {
  const user = req.session.discordUser;
  const linkedRequest = req.session.requestToken ? store.getRequest(req.session.requestToken) : null;
  if (!linkedRequest || linkedRequest.discordId !== user.id ||
      !["login_matched", "started"].includes(linkedRequest.status)) {
    return res.status(403).send(page("Bitte /verify starten",
      alertBox("Bitte starte zuerst /verify in Discord und öffne den Link aus der privaten Bot-Nachricht.", "bad"), user));
  }
  const minecraftName = String(req.body.minecraftName || "").trim();
  const edition = String(req.body.edition || "");
  if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftName) || !["Java", "Bedrock"].includes(edition)) {
    return res.status(400).send(page("Ungültige Angaben", alertBox("Bitte prüfe Edition und Spielernamen.", "bad"), user));
  }
  const token = crypto.randomBytes(18).toString("hex");
  store.createRequest({
    token, discordId: user.id, discordName: user.username, minecraftName, edition,
    status: "awaiting_review", createdAt: new Date().toISOString()
  });
  store.updateRequest(linkedRequest.token, { status: "submitted", submittedAt: new Date().toISOString() });
  delete req.session.requestToken;
  res.send(page("Einreichung gespeichert", `<h1>Einreichung gespeichert!</h1>${alertBox("Dein Profil wartet auf Prüfung. Noch wurde keine Verified-Rolle vergeben.", "ok")}<p>Minecraft: <b>${escapeHtml(minecraftName)}</b> (${escapeHtml(edition)})</p><p class="small">Bitte gib niemals dein Microsoft- oder Minecraft-Passwort weiter.</p><a class="button" href="/profile">Zurück zum Profil</a>`, user));
});

app.get("/logout", (req, res) => req.session.destroy(() => res.redirect("/")));

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "verify") {
    const token = crypto.randomBytes(18).toString("hex");
    store.createRequest({
      token, discordId: interaction.user.id, discordName: interaction.user.username,
      minecraftName: null, edition: null, status: "started", createdAt: new Date().toISOString()
    });
    const url = new URL("/start", BASE_URL);
    url.searchParams.set("request", token);
    await interaction.reply({
      content: `🌿 Starte deine Minecraft-Verknüpfung hier: ${url.toString()}\n**Hinweis:** Die Eingabe eines Namens allein verifiziert keinen Accountbesitz.`,
      flags: MessageFlags.Ephemeral
    });
  }
  if (interaction.commandName === "verifyapprove") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({ content: "Du brauchst die Berechtigung „Rollen verwalten“.", flags: MessageFlags.Ephemeral });
    }
    const target = interaction.options.getUser("spieler", true);
    const request = store.findLatestPendingByDiscord(target.id);
    if (!request) {
      return interaction.reply({ content: "Für diesen Spieler wurde kein Antrag gefunden, der auf Prüfung wartet.", flags: MessageFlags.Ephemeral });
    }
    try {
      const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      const member = await guild.members.fetch(target.id);
      const role = await guild.roles.fetch(process.env.VERIFIED_ROLE_ID);
      if (!role) throw new Error("Verified role not found");
      await member.roles.add(role, `Minecraft-Verknüpfung manuell geprüft durch ${interaction.user.tag}`);
      store.updateRequest(request.token, { status: "verified", reviewedBy: interaction.user.id, verifiedAt: new Date().toISOString() });
      await interaction.reply({ content: `✅ Rolle **${role.name}** wurde an ${target.tag} vergeben. Bitte nutze diesen Befehl nur, nachdem du den Minecraft-Besitz außerhalb des Bots tatsächlich geprüft hast.`, flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error("Role grant failed:", err.message);
      await interaction.reply({ content: "Die Rolle konnte nicht vergeben werden. Prüfe Bot-Rechte, Rollenposition und VERIFIED_ROLE_ID.", flags: MessageFlags.Ephemeral });
    }
  }
});

app.get("/start", (req, res) => {
  const token = String(req.query.request || "");
  const request = store.getRequest(token);
  if (!request || request.status !== "started") {
    return res.status(404).send(page("Link ungültig", alertBox("Dieser Verifizierungslink ist ungültig oder wurde bereits verwendet.", "bad")));
  }
  req.session.requestToken = token;
  res.send(page("Verifizierung starten", `<h1>Verifizierung starten</h1><p>Dieser Link wurde für Discord-Konto <b>${escapeHtml(request.discordName)}</b> erstellt.</p><p>Melde dich mit Discord an und reiche anschließend dein Minecraft-Profil ein.</p>${loginButton()}<p class="small">Die Verified-Rolle gibt es erst nach einer separaten Besitzprüfung.</p>`));
});

app.listen(PORT, () => console.log(`Website läuft: ${BASE_URL}`));
client.once("ready", () => console.log(`Discord-Bot online als ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("Discord-Login fehlgeschlagen:", err.message);
  process.exit(1);
});

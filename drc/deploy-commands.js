require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Starte die Verknüpfung deines Minecraft- und Discord-Accounts."),
  new SlashCommandBuilder()
    .setName("verifyapprove")
    .setDescription("Bestätigt nach manueller Prüfung eine Minecraft-Verknüpfung.")
    .addUserOption(option => option.setName("spieler").setDescription("Discord-Spieler, dessen Antrag geprüft wurde").setRequired(true))
].map(c => c.toJSON());

if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_GUILD_ID) {
  console.error("Bitte DISCORD_TOKEN, DISCORD_CLIENT_ID und DISCORD_GUILD_ID in .env setzen.");
  process.exit(1);
}
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
      { body: commands }
    );
    console.log("Slash-Commands wurden für den angegebenen Discord-Server registriert.");
  } catch (err) {
    console.error("Command-Registrierung fehlgeschlagen:", err);
    process.exitCode = 1;
  }
})();

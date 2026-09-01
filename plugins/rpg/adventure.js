import { getDatabase } from "../../src/lib/ourin-database.js";
import { addExpWithLevelCheck } from "../../src/lib/ourin-level.js";
import { getRpgContextInfo } from "../../src/lib/ourin-context.js";
const pluginConfig = {
  name: "adventure",
  alias: ["adv", "petualangan"],
  category: "rpg",
  description: "Berpetualang untuk mendapat Exp dan hadiah",
  usage: ".adventure",
  example: ".adventure",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 120,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};
  user.rpg.health = user.rpg.health || 100;

  if (user.rpg.health < 30) {
    return m.reply(
      `❌ *ʜᴇᴀʟᴛʜ ᴛᴇʀʟᴀʟᴜ ʀᴇɴᴅᴀʜ*\n\n` +
        `> Minimal 30 HP untuk berpetualang!\n` +
        `> Health kamu: ${user.rpg.health} HP`,
    );
  }

  const locations = [
    "🌲 Hutan Gelap",
    "🏔️ Gunung Es",
    "🏜️ Padang Pasir",
    "🌋 Gunung Berapi",
    "🏰 Kastil Tua",
    "🌊 Pantai Misterius",
  ];
  const location = locations[Math.floor(Math.random() * locations.length)];

  await m.reply(`⚔️ *ᴍᴇᴍᴜʟᴀɪ ᴘᴇᴛᴜᴀʟᴀɴɢᴀɴ*\n\n> Menuju ${location}...`);
  await new Promise((r) => setTimeout(r, 2500));

  const isWin = Math.random() < 0.6;

  if (isWin) {
    const expGain = Math.floor(Math.random() * 2000) + 500;
    const moneyGain = Math.floor(Math.random() * 10000) + 2000;

    user.koin = (user.koin || 0) + moneyGain;
    const levelResult = await addExpWithLevelCheck(sock, m, db, user, expGain);

    db.save();

    let txt = `✅ *ᴘᴇᴛᴜᴀʟᴀɴɢᴀɴ sᴜᴋsᴇs*\n\n`;
    txt += `> 📍 ${location}\n\n`;
    txt += `╭┈┈⬡「 🎁 *ʀᴇᴡᴀʀᴅ* 」\n`;
    txt += `┃ 💰 Money: *+Rp ${moneyGain.toLocaleString("id-ID")}*\n`;
    txt += `┃ 🚄 Exp: *+${expGain}*\n`;
    txt += `╰┈┈┈┈┈┈┈┈⬡`;

    await m.reply(txt);
  } else {
    const healthLoss = Math.floor(Math.random() * 30) + 10;
    user.rpg.health = Math.max(0, user.rpg.health - healthLoss);

    let msg = `❌ *ᴘᴇᴛᴜᴀʟᴀɴɢᴀɴ ɢᴀɢᴀʟ*\n\n`;
    msg += `> 📍 ${location}\n\n`;
    msg += `> Kamu diserang monster!\n`;
    msg += `> ❤️ Health: *-${healthLoss}*`;

    if (user.rpg.health <= 0) {
      user.rpg.health = 0;
      user.exp = Math.floor((user.exp || 0) / 2);
      msg += `\n\n💀 *ᴋᴀᴍᴜ ᴍᴀᴛɪ*\n> Exp berkurang 50%!`;
    }

    db.save();
    await m.reply(msg);
  }
}

export { pluginConfig as config, handler };

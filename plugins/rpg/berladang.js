import { getDatabase } from "../../src/lib/ourin-database.js";
import { addExpWithLevelCheck } from "../../src/lib/ourin-level.js";
import config from "../../config.js";
import path from "path";
import fs from "fs";
const pluginConfig = {
  name: "berladang",
  alias: ["farm", "tanam", "berkebun"],
  category: "rpg",
  description: "Berladang untuk mendapat hasil panen",
  usage: ".berladang",
  example: ".berladang",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 180,
  energi: 1,
  isEnabled: true,
};

let thumbRpg = null;
try {
  const thumbPath = path.join(
    process.cwd(),
    "assets",
    "images",
    "ourin-rpg.jpg",
  );
  if (fs.existsSync(thumbPath)) thumbRpg = fs.readFileSync(thumbPath);
} catch (e) {}

function getContextInfo(title = "🌾 *ʙᴇʀʟᴀᴅᴀɴɢ*", body = "Hasil Panen") {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";

  const contextInfo = {
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };

  if (thumbRpg) {
    contextInfo.externalAdReply = {
      title: title,
      body: body,
      thumbnail: thumbRpg,
      mediaType: 1,
      renderLargerThumbnail: false,
      sourceUrl: config.saluran?.link || "",
    };
  }

  return contextInfo;
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};
  if (!user.inventory) user.inventory = {};

  const staminaCost = 20;
  user.rpg.stamina = user.rpg.stamina ?? 100;

  if (user.rpg.stamina < staminaCost) {
    return m.reply(
      `⚡ *sᴛᴀᴍɪɴᴀ ʜᴀʙɪs*\n\n` +
        `> Butuh ${staminaCost} stamina untuk berladang\n` +
        `> Stamina kamu: ${user.rpg.stamina}`,
    );
  }

  user.rpg.stamina -= staminaCost;

  await m.react("🌾");
  await m.reply(`🌾 *sᴇᴅᴀɴɢ ʙᴇʀʟᴀᴅᴀɴɢ...*`);
  await new Promise((r) => setTimeout(r, 2500));

  const crops = [
    { item: "padi", name: "🌾 Padi", chance: 90, min: 2, max: 8, price: 100 },
    {
      item: "jagung",
      name: "🌽 Jagung",
      chance: 70,
      min: 1,
      max: 5,
      price: 150,
    },
    { item: "tomat", name: "🍅 Tomat", chance: 50, min: 1, max: 4, price: 200 },
    {
      item: "wortel",
      name: "🥕 Wortel",
      chance: 40,
      min: 1,
      max: 3,
      price: 250,
    },
    {
      item: "strawberry",
      name: "🍓 Strawberry",
      chance: 20,
      min: 1,
      max: 2,
      price: 500,
    },
    {
      item: "melon",
      name: "🍈 Melon",
      chance: 10,
      min: 1,
      max: 1,
      price: 1000,
    },
  ];

  let results = [];
  let totalValue = 0;

  for (const crop of crops) {
    if (Math.random() * 100 <= crop.chance) {
      const qty =
        Math.floor(Math.random() * (crop.max - crop.min + 1)) + crop.min;
      user.inventory[crop.item] = (user.inventory[crop.item] || 0) + qty;
      const value = qty * crop.price;
      totalValue += value;
      results.push({ name: crop.name, qty, value });
    }
  }

  if (results.length === 0) {
    user.inventory["padi"] = (user.inventory["padi"] || 0) + 1;
    results.push({ name: "🌾 Padi", qty: 1, value: 100 });
    totalValue = 100;
  }

  const expGain = Math.floor(totalValue / 10) + Math.floor(Math.random() * 100);
  const levelResult = await addExpWithLevelCheck(sock, m, db, user, expGain);

  db.save();

  await m.react("✅");

  let txt = `🌾 *ʙᴇʀʟᴀᴅᴀɴɢ sᴇʟᴇsᴀɪ*\n\n`;
  txt += `╭┈┈⬡「 🧺 *ʜᴀsɪʟ ᴘᴀɴᴇɴ* 」\n`;
  for (const r of results) {
    txt += `┃ ${r.name}: *+${r.qty}* (Rp ${r.value.toLocaleString("id-ID")})\n`;
  }
  txt += `┃ ─────────\n`;
  txt += `┃ 💰 Total Nilai: *Rp ${totalValue.toLocaleString("id-ID")}*\n`;
  txt += `┃ 🚄 Exp: *+${expGain}*\n`;
  txt += `┃ ⚡ Stamina: *-${staminaCost}*\n`;
  txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`;
  txt += `> Jual hasil panen dengan \`${m.prefix}sellall\``;

  await sock.sendMessage(
    m.chat,
    {
      text: txt,
      contextInfo: getContextInfo(),
    },
    { quoted: m },
  );
}

export { pluginConfig as config, handler };

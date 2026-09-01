import config from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import fs from "fs";
import path from "path";
const pluginConfig = {
  name: "rulesgrup",
  alias: ["grouprules", "aturangrup", "grules"],
  category: "group",
  description: "Menampilkan rules/aturan grup",
  usage: ".rulesgrup",
  example: ".rulesgrup",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 10,
  energi: 0,
  isEnabled: true,
};

const DEFAULT_GROUP_RULES = `📜 *ᴀᴛᴜʀᴀɴ ɢʀᴜᴘ*

┃ 1️⃣ Dilarang spam/flood chat
┃ 2️⃣ Dilarang promosi tanpa izin
┃ 3️⃣ Dilarang konten SARA/Porn
┃ 4️⃣ Hormati sesama member
┃ 5️⃣ Gunakan bahasa yang sopan
┃ 6️⃣ Dilarang share link tanpa izin
┃ 7️⃣ Patuhi instruksi admin
┃ 8️⃣ No toxic & bullying

_Mau langgar? Siap-siap di Kick!_`;

async function handler(m, { sock, config: botConfig }) {
  const db = getDatabase();
  const groupData = db.getGroup(m.chat) || {};
  const customRules = groupData.groupRules;
  const rulesText = customRules || DEFAULT_GROUP_RULES;

  const imagePath = path.join(
    process.cwd(),
    "assets",
    "images",
    "ourin-rules.jpg",
  );
  let imageBuffer = fs.existsSync(imagePath)
    ? fs.readFileSync(imagePath)
    : null;

  const saluranId = botConfig.saluran?.id || "120363400911374213@newsletter";
  const saluranName =
    botConfig.saluran?.name || botConfig.bot?.name || "Ourin-AI";

  if (imageBuffer) {
    await sock.sendMedia(m.chat, imageBuffer, rulesText, m, {
      type: "image",
    });
  } else {
    await m.reply(rulesText);
  }
}

export { pluginConfig as config, handler, DEFAULT_GROUP_RULES };

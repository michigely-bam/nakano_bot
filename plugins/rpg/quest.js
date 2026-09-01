import { getDatabase } from "../../src/lib/ourin-database.js";
import { getRpgContextInfo } from "../../src/lib/ourin-context.js";
const pluginConfig = {
  name: "quest",
  alias: ["misi", "mission"],
  category: "rpg",
  description: "Ambil quest harian untuk reward bonus",
  usage: ".quest",
  example: ".quest",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 0,
  energi: 0,
  isEnabled: true,
};

const QUESTS = [
  {
    id: "mining5",
    name: "Penambang Pemula",
    desc: "Mining 5 kali",
    target: 5,
    reward: { money: 10000, exp: 1000 },
  },
  {
    id: "fishing5",
    name: "Pemancing Handal",
    desc: "Fishing 5 kali",
    target: 5,
    reward: { money: 8000, exp: 800 },
  },
  {
    id: "adventure3",
    name: "Petualang Sejati",
    desc: "Adventure 3 kali",
    target: 3,
    reward: { money: 15000, exp: 1500 },
  },
  {
    id: "work10",
    name: "Pekerja Keras",
    desc: "Work 10 kali",
    target: 10,
    reward: { money: 20000, exp: 2000 },
  },
  {
    id: "hunt5",
    name: "Pemburu Ulung",
    desc: "Hunt 5 kali",
    target: 5,
    reward: { money: 12000, exp: 1200 },
  },
];

async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);

  if (!user.rpg) user.rpg = {};
  if (!user.quest) user.quest = {};

  const args = m.args || [];
  const sub = args[0]?.toLowerCase();

  if (sub === "claim") {
    const questId = args[1];
    if (!questId || !user.quest[questId]) {
      return m.reply(
        `❌ *ǫᴜᴇsᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ*\n\n> Quest tidak ditemukan atau belum diambil!`,
      );
    }

    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) {
      return m.reply(`❌ *ɪɴᴠᴀʟɪᴅ ǫᴜᴇsᴛ*\n\n> Quest ID tidak valid!`);
    }

    if (user.quest[questId].progress < quest.target) {
      return m.reply(
        `❌ *ǫᴜᴇsᴛ ʙᴇʟᴜᴍ sᴇʟᴇsᴀɪ*\n\n` +
          `> Progress: ${user.quest[questId].progress}/${quest.target}`,
      );
    }

    if (user.quest[questId].claimed) {
      return m.reply(`❌ *sᴜᴅᴀʜ ᴅɪᴋʟᴀɪᴍ*\n\n> Quest ini sudah diklaim!`);
    }

    user.koin = (user.koin || 0) + quest.reward.money;
    db.updateExp(m.sender, quest.reward.exp);
    user.quest[questId].claimed = true;

    db.save();
    return m.reply(
      `✅ *ǫᴜᴇsᴛ ᴄʟᴀɪᴍᴇᴅ*\n\n> 🎯 ${quest.name}\n> 💰 Money: +Rp ${quest.reward.money.toLocaleString("id-ID")}\n> 🚄 Exp: +${quest.reward.exp}`,
    );
  }

  if (sub === "take") {
    const questId = args[1];
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest) {
      return m.reply(`❌ *ǫᴜᴇsᴛ ɴᴏᴛ ꜰᴏᴜɴᴅ*\n\n> Lihat list: \`.quest\``);
    }

    if (user.quest[questId]) {
      return m.reply(`❌ *sᴜᴅᴀʜ ᴅɪᴀᴍʙɪʟ*\n\n> Quest ini sudah diambil!`);
    }

    user.quest[questId] = { progress: 0, claimed: false, takenAt: Date.now() };
    db.save();
    return m.reply(
      `✅ *ǫᴜᴇsᴛ ᴅɪᴀᴍʙɪʟ*\n\n> 🎯 ${quest.name}\n> 📝 ${quest.desc}\n> 🎁 Reward: Rp ${quest.reward.money.toLocaleString("id-ID")} + ${quest.reward.exp} Exp`,
    );
  }

  let txt = `📜 *ǫᴜᴇsᴛ ʟɪsᴛ*\n\n`;

  for (const quest of QUESTS) {
    const userQuest = user.quest[quest.id];
    let status = "⬜ Belum diambil";
    if (userQuest) {
      if (userQuest.claimed) {
        status = "✅ Selesai";
      } else if (userQuest.progress >= quest.target) {
        status = "🎁 Bisa diklaim";
      } else {
        status = `🔄 ${userQuest.progress}/${quest.target}`;
      }
    }

    txt += `╭┈┈⬡「 🎯 *${quest.name}* 」\n`;
    txt += `┃ 📝 ${quest.desc}\n`;
    txt += `┃ 🎁 Rp ${quest.reward.money.toLocaleString("id-ID")} + ${quest.reward.exp} Exp\n`;
    txt += `┃ 📊 Status: ${status}\n`;
    txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`;
  }

  txt += `> Ambil: \`.quest take <id>\`\n`;
  txt += `> Claim: \`.quest claim <id>\``;

  await m.reply(txt);
}

export { pluginConfig as config, handler };

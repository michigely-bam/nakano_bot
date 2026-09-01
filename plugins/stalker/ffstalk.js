import te from "../../src/lib/ourin-error.js";
import config from "../../config.js";
import ourinApi from "../../src/lib/ourin-apimanager.js";

const pluginConfig = {
  name: "ffstalk",
  alias: ["freefireid", "stalkff"],
  category: "stalker",
  description: "Stalk ID Free Fire",
  usage: ".ffstalk <id>",
  example: ".ffstalk 775417067",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const id = m.args[0];

  if (!id) {
    return m.reply(
      `🔥 *ꜰʀᴇᴇ ꜰɪʀᴇ sᴛᴀʟᴋ*\n\n` +
        `> Masukkan ID Free Fire\n\n` +
        `\`Contoh: ${m.prefix}ffstalk 775417067\``,
    );
  }

  m.react("🔍");

  try {
    const res = await ourinApi.covenant.freefire(id, { timeout: 30000 });

    if (!res?.status || !res?.data) {
      m.react("❌");
      return m.reply(`❌ ID *${id}* tidak ditemukan`);
    }

    const r = res.data;

    const caption =
      `🔥 *ꜰʀᴇᴇ ꜰɪʀᴇ sᴛᴀʟᴋ*\n\n` +
      `🎮 *Game:* Free Fire\n` +
      `🆔 *User ID:* ${r.uid}\n` +
      `👤 *Nickname:* ${r.name}\n` +
      `📊 *Level:* ${r.level}\n` +
      `⭐ *EXP:* ${r.exp}\n` +
      `🌍 *Region:* ${r.region}\n` +
      `❤️ *Likes:* ${r.likes ?? "-"}\n\n` +
      `🏆 *BR Rank Point:* ${r.br_rank_point}\n` +
      `🥇 *BR Max Rank:* ${r.br_max_rank}\n` +
      `🎯 *CS Rank Point:* ${r.cs_rank_point ?? "-"}\n` +
      `🏅 *CS Max Rank:* ${r.cs_max_rank}\n\n` +
      `📅 *Created:* ${r.created_at}\n` +
      `🕒 *Last Login:* ${r.last_login}\n` +
      `🆔 *Season ID:* ${r.season_id}\n\n` +
      `👥 *Guild:* ${r.guild_name ?? "-"}\n` +
      `🆔 *Guild ID:* ${r.guild_id ?? "-"}\n\n` +
      `🐾 *Pet ID:* ${r.pet_id ?? "-"}\n` +
      `📈 *Pet Level:* ${r.pet_level ?? "-"}\n\n` +
      `🧾 *Bio:* ${r.signature ?? "-"}\n` +
      `⚧ *Gender:* ${r.gender ?? "-"}\n` +
      `🌐 *Language:* ${r.language ?? "-"}\n\n`;

    m.react("✅");

    if (r.banner_image) {
      await sock.sendMedia(m.chat, r.banner_image, null, m, {
        caption,
        type: "image",
      });
    } else {
      await m.reply(caption);
    }
  } catch (error) {
    console.log(error?.response?.data || error.message);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };

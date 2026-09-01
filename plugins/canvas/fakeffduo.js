import axios from "axios";
import config from "../../config.js";
import { uploadTo0x0 } from "../../src/lib/ourin-tmpfiles.js";
import te from "../../src/lib/ourin-error.js";
const pluginConfig = {
  name: "fakeffduo",
  alias: ["fakefreefirduo"],
  category: "canvas",
  description: "Membuat gambar ff",
  usage: ".fakeffduo <text>",
  example: ".fakeffduo Hai cantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const nama = m.text?.split("|");
  if (!nama || nama.length < 2) {
    return m.reply(
      `*FAKE FF DUO*\n\n> Contoh: ${m.prefix}fakeffduo nama1|nama2`,
    );
  }
  m.react("🕕");

  try {
    await sock.sendMedia(
      m.chat,
      `https://api.ourin.my.id/api/fake-ff-duo-2?name1=${encodeURIComponent(nama[0])}&name2=${encodeURIComponent(nama[1])}&bg=random`,
      null,
      m,
      {
        type: "image",
      },
    );

    m.react("✅");
  } catch (error) {
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };

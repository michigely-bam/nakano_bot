import * as _canvas from '@napi-rs/canvas'
import axios from "axios";
import path from "path";
import fs from "fs";


import { uploadTo0x0 } from "../../src/lib/ourin-tmpfiles.js";
import te from "../../src/lib/ourin-error.js";
const pluginConfig = {
  name: "fakedev2",
  alias: [],
  category: "canvas",
  description: "Membuat fake developer profile card",
  usage: ".fakedev2 <nama> (reply/kirim foto)",
  example: ".fakedev2 Misaki",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};
let fontRegistered = false;
async function handler(m, { sock }) {
  const name = m.text?.trim();
  if (!name) {
    return m.reply(
      `🎮 *ꜰᴀᴋᴇ ᴅᴇᴠᴇʟᴏᴘᴇʀ 2*\n\n` +
        `> Masukkan nama untuk profile\n\n` +
        `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
        `> 1. Kirim foto + caption \`${m.prefix}fakedev2 <nama>\`\n` +
        `> 2. Reply foto dengan \`${m.prefix}fakedev2 <nama>\``,
    );
  }
  let buffer = null;
  if (
    m.quoted &&
    (m.quoted.type === "imageMessage" || m.quoted.mtype === "imageMessage")
  ) {
    try {
      buffer = await m.quoted.download();
    } catch (e) {
      m.reply(te(m.prefix, m.command, m.pushName));
    }
  } else if (m.isMedia && m.type === "imageMessage") {
    try {
      buffer = await m.download();
    } catch (e) {
      m.reply(te(m.prefix, m.command, m.pushName));
    }
  } else {
    try {
      let te = await sock.profilePictureUrl(m.sender, "image");
      buffer = Buffer.from(
        (await axios.get(te, { responseType: "arraybuffer" })).data,
      );
    } catch (error) {
      buffer = fs.readFileSync("./assets/images/pp-kosong.jpg");
    }
  }
  if (!buffer) {
    return m.reply(`❌ Kirim/reply gambar untuk dijadikan avatar!`);
  }
  m.react("🕕");
  try {
    const gmbr = await uploadTo0x0(buffer, {
      filename: "image.jpg",
      contentType: "image/jpeg",
    });
    await sock.sendMedia(
      m.chat,
      `https://api.ourin.my.id/api/fake-developer-2?text=${encodeURIComponent(name)}&image=${gmbr.directUrl}`,
      null,
      m,
      {
        type: "image",
      },
    );
    m.react("✅");
  } catch (error) {
    m.react("❌");
    m.reply(`Coba lagi`);
  }
}
export { pluginConfig as config, handler };

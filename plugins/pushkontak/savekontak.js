import { getDatabase } from "../../src/lib/ourin-database.js";
import { getGroupMode } from "../group/botmode.js";
import {
  resolveAnyLidToJid,
  isLid,
  isLidConverted,
  getCachedJid,
} from "../../src/lib/ourin-lid.js";
import te from "../../src/lib/ourin-error.js";
const pluginConfig = {
  name: "savekontak",
  alias: ["svkontak", "savecontact"],
  category: "pushkontak",
  description: "Simpan semua kontak grup ke file VCF",
  usage: ".savekontak <namakontak>",
  example: ".savekontak CustomerList",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 30,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const db = getDatabase();
  const groupMode = getGroupMode(m.chat, db);

  if (groupMode !== "pushkontak" && groupMode !== "all") {
    return m.reply(
      `❌ *ᴍᴏᴅᴇ ᴛɪᴅᴀᴋ sᴇsᴜᴀɪ*\n\n> Aktifkan mode pushkontak terlebih dahulu\n\n\`${m.prefix}botmode pushkontak\``,
    );
  }

  const namaKontak = m.text?.trim();
  if (!namaKontak) {
    return m.reply(
      `📥 *sᴀᴠᴇ ᴋᴏɴᴛᴀᴋ*\n\n> Masukkan nama untuk kontak\n\n\`Contoh: ${m.prefix}savekontak CustomerList\``,
    );
  }

  m.react("📥");

  try {
    const metadata = m.groupMetadata;
    const botJid = sock.user.id.split(":")[0] + "@s.whatsapp.net";
    const participants = metadata.participants
      .map((p) => {
        if (p.phoneNumber) return p.phoneNumber;
        if (p.jid && !p.jid.endsWith("@lid")) return p.jid;
        if (p.id && !p.id.endsWith("@lid")) return p.id;
        const resolved = resolveAnyLidToJid(
          p.jid || p.id,
          metadata.participants,
        );
        if (resolved && !resolved.endsWith("@lid") && !isLidConverted(resolved))
          return resolved;
        const cached = getCachedJid(p.jid || p.id || p.lid || "");
        if (cached && !cached.endsWith("@lid") && !isLidConverted(cached))
          return cached;
        return null;
      })
      .filter((id) => id && id !== botJid);

    if (participants.length === 0) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak ada kontak untuk disimpan`);
    }

    const vcards = participants.map((contact, index) => {
      const phone = contact.split("@")[0];
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${namaKontak} - ${index + 1}`,
        `TEL;type=CELL;type=VOICE;waid=${phone}:+${phone}`,
        "END:VCARD",
      ].join("\n");
    });

    const BATCH = 100;
    const totalBatches = Math.ceil(vcards.length / BATCH);

    for (let i = 0; i < totalBatches; i++) {
      const batch = vcards.slice(i * BATCH, (i + 1) * BATCH);
      const contacts = batch.map((vcard) => ({ vcard }));

      await sock.sendMessage(m.chat, {
        // kalau mau ke private tinggal m.chat ganti ke m.sender
        contacts: {
          displayName: `${namaKontak} (${batch.length})`,
          contacts,
        },
      });

      if (totalBatches > 1 && i < totalBatches - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    m.react("✅");

    if (m.chat !== m.sender) {
      await m.reply(
        `✅ *ᴋᴏɴᴛᴀᴋ ᴅɪsɪᴍᴘᴀɴ*\n\n> ${participants.length} kontak berhasil di dapetyn\ndari Grup: \`${metadata.subject}\``,
      );
    }
  } catch (error) {
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };

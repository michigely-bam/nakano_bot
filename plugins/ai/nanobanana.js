import FormData from "form-data";
import axios from "axios";
import ourinApi from "../../src/lib/ourin-apimanager.js";

const pluginConfig = {
  name: "nanobanana",
  alias: ["nano", "imgedit"],
  category: "ai",
  description: "Edit gambar dengan AI menggunakan prompt",
  usage: ".nanobanana <prompt>",
  example: ".nanobanana make it anime style",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

async function uploadTmpfiles(buffer) {
  const form = new FormData();
  form.append("file", buffer, {
    filename: "image.png",
    contentType: "image/png",
  });

  const res = await axios.post(
    "https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk",
    form,
    {
      headers: form.getHeaders(),
      timeout: 30000,
    },
  );

  if (!res.data?.status || !res.data?.path)
    throw new Error("Upload gagal: " + JSON.stringify(res.data));

  return res.data.path;
}

async function handler(m, { sock }) {
  const prompt = m.text;
  if (!prompt) {
    return m.reply(
      `🍌 *ɴᴀɴᴏ ʙᴀɴᴀɴᴀ*\n\n` +
        `> Edit gambar dengan AI\n\n` +
        `\`Contoh: ${m.prefix}nanobanana make it anime style\`\n\n` +
        `> Reply atau kirim gambar dengan caption`,
    );
  }

  const isImage = m.isImage || (m.quoted && m.quoted.isImage);
  if (!isImage) {
    return m.reply(
      `🍌 *ɴᴀɴᴏ ʙᴀɴᴀɴᴀ*\n\n> Reply atau kirim gambar dengan caption`,
    );
  }

  m.react("🕕");
  try {
    let mediaBuffer;
    if (m.isImage && m.download) {
      mediaBuffer = await m.download();
    } else if (m.quoted && m.quoted.isImage && m.quoted.download) {
      mediaBuffer = await m.quoted.download();
    }

    if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Gagal mengunduh gambar`);
    }

    const imageUrl = await uploadTmpfiles(mediaBuffer);

    const data = await ourinApi.covenant.geminiImage(
      {
        prompt,
        model: "gemini-flash-edit",
        imageUrl,
      },
      {
        timeout: 60000,
      },
    );

    console.log(data);

    if (!data.status) {
      m.react("❌");
      return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak dapat mengedit gambar`);
    }

    m.react("✅");

    await sock.sendMedia(m.chat, data?.data?.url, null, m, {
      type: "image",
    });
  } catch (error) {
    console.log(error?.response?.data || error.message);
    m.react("❌");
    m.reply(`🍀 *Waduhh, sepertinya ini ada kendala*
Silahkan coba lagi nanti, dimohon jangan spam, atau coba Opsi lain: ${m.prefix}ourinbanana ${m.text} ( reply gambar )`);
  }
}

export { pluginConfig as config, handler };

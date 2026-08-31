import ourinApi from "../../src/lib/ourin-apimanager.js";

const pluginConfig = {
  name: "seedream",
  alias: ["editimg"],
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
  form.append("file", new Blob([buffer]), "image.png");

  const res = await fetch(
    "https://c.termai.cc/api/upload?key=AIzaBj7z2z3xBjsk",
    {
      method: "POST",
      body: form,
    },
  );

  const data = await res.json();
  if (!data?.status || !data?.path)
    throw new Error("Upload gagal: " + JSON.stringify(data));

  return data.path;
}

async function handler(m, { sock }) {
  const prompt = m.text;
  if (!prompt) {
    return m.reply(
      `🍌 *SEE DREAM 4*\n\n` +
        `> Edit gambar dengan AI\n\n` +
        `\`Contoh: ${m.prefix}seedream4 make it anime style\`\n\n` +
        `> Reply atau kirim gambar dengan caption`,
    );
  }

  const isImage = m.isImage || (m.quoted && m.quoted.isImage);
  if (!isImage) {
    return m.reply(
      `🍌 *SEE DREAM*\n\n> Reply atau kirim gambar dengan caption`,
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

    const data = await ourinApi.covenant.seedream(
      {
        prompt,
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

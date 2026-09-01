import { default as axios } from "axios";
import fs from "fs";
import path from "path";
import te from "../../src/lib/ourin-error.js";
import { uploadImage } from "../../src/lib/ourin-uploader.js";
import ImgUpscaler from "../../src/scraper/imglarger.js";

const pluginConfig = {
  name: "remini",
  alias: ["hd", "enhance", "upscale"],
  category: "tools",
  description: "Enhance/upscale gambar menjadi HD",
  usage: ".remini (reply gambar)",
  example: ".remini",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 15,
  energi: 1,
  isEnabled: true,
};

async function upscaleWithOotaizumi(buffer) {
  const form = new FormData();
  form.append("image", buffer, {
    filename: "image.jpg",
    contentType: "image/jpeg",
  });

  const res = await axios.post(
    "https://api.ootaizumi.web.id/tools/upscale",
    form,
    {
      headers: {
        ...form.getHeaders(),
        accept: "*/*",
      },
      timeout: 120000,
    },
  );

  if (!res.data?.status || !res.data?.result?.imageUrl) {
    throw new Error("Ootaizumi gagal enhance gambar");
  }

  return res.data.result.imageUrl;
}

async function upscaleWithAzbryHdimage(imageUrl) {
  const res = await axios.get(
    `https://api.azbry.com/api/tools/hdimage?url=${encodeURIComponent(imageUrl)}`,
    {
      timeout: 120000,
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );

  if (!res.data?.status || !res.data?.result?.url) {
    throw new Error("Azbry hdimage gagal enhance gambar");
  }

  return res.data.result.url;
}

async function upscaleWithAzbryRemini(imageUrl) {
  const res = await axios.get(
    `https://api.azbry.com/api/tools/remini?url=${encodeURIComponent(imageUrl)}`,
    {
      responseType: "arraybuffer",
      timeout: 120000,
      headers: {
        "user-agent": "Mozilla/5.0",
      },
    },
  );

  if (!res.data || !Buffer.isBuffer(Buffer.from(res.data))) {
    throw new Error("Azbry remini gagal enhance gambar");
  }

  return Buffer.from(res.data);
}

async function upscaleWithImgLarger(buffer) {
  const tempDir = path.join(process.cwd(), "temp");
  const tempFile = path.join(tempDir, `hd-layer3-${Date.now()}.jpg`);
  const client = new ImgUpscaler();

  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(tempFile, buffer);

  try {
    const response = await client.process(tempFile);
    const resultData = response?.result?.data || {};
    const downloadUrl = Array.isArray(resultData.downloadUrls)
      ? resultData.downloadUrls[0]
      : resultData.download_url || resultData.img_url || null;

    if (!downloadUrl) {
      throw new Error("ImgLarger gagal enhance gambar");
    }

    return downloadUrl;
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

async function enhanceImage(buffer) {
  try {
    const result = await upscaleWithOotaizumi(buffer);
    return { source: result, isBuffer: false };
  } catch {}

  const imageUrl = await uploadImage(buffer, "image.jpg");

  try {
    const result = await upscaleWithAzbryHdimage(imageUrl);
    return { source: result, isBuffer: false };
  } catch {}

  try {
    const result = await upscaleWithImgLarger(buffer);
    return { source: result, isBuffer: false };
  } catch {}

  const result = await upscaleWithAzbryRemini(imageUrl);
  return { source: result, isBuffer: true };
}

async function handler(m, { sock }) {
  const isImage = m.isImage || (m.quoted && m.quoted.type === "imageMessage");

  if (!isImage) {
    return m.reply(
      `✨ *REMINI ENHANCE*\n\nKirim/reply gambar untuk di-enhance\n\n\`${m.prefix}remini\``,
    );
  }

  m.react("🕕");

  try {
    let buffer;
    if (m.quoted && m.quoted.isMedia) {
      buffer = await m.quoted.download();
    } else if (m.isMedia) {
      buffer = await m.download();
    }

    if (!buffer) {
      m.react("❌");
      return m.reply(`❌ Gagal mendownload gambar`);
    }

    const enhanced = await enhanceImage(buffer);

    m.react("✅");

    await sock.sendMedia(m.chat, enhanced.source, null, m, {
      type: "image",
    });
  } catch (error) {
    console.log(error);
    m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };

import config from "../../config.js";
import te from "../../src/lib/ourin-error.js";
import ourinApi from "../../src/lib/ourin-apimanager.js";

const pluginConfig = {
  name: "flux-pro",
  alias: ["fluxpro", "flux"],
  category: "ai",
  description: "Generate atau edit gambar dengan Covenant Flux",
  usage: ".flux-pro <prompt> --model=flux-dev --ratio=1:1",
  example: ".flux-pro buat gambar anime --model=flux-dev --ratio=1:1",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 30,
  energi: 1,
  isEnabled: true,
};

function extractFlag(text, flagNames) {
  let output = String(text || "");
  let value = "";
  const names = Array.isArray(flagNames) ? flagNames : [flagNames];

  for (const name of names) {
    const regex = new RegExp(`--${name}=("[^"]+"|'[^']+'|\\S+)`, "i");
    const match = output.match(regex);
    if (!match) continue;
    value = String(match[1] || "")
      .trim()
      .replace(/^['"]|['"]$/g, "");
    output = output.replace(match[0], " ");
    break;
  }

  return {
    value,
    text: output.replace(/\s+/g, " ").trim(),
  };
}

function parseFluxInput(input) {
  const modelResult = extractFlag(input, "model");
  const ratioResult = extractFlag(modelResult.text, "ratio");
  const urlResult = extractFlag(ratioResult.text, ["url", "imageUrl", "img"]);

  return {
    prompt: urlResult.text,
    model: modelResult.value || "flux-dev",
    ratio: ratioResult.value || "1:1",
    imageUrl: urlResult.value || "",
  };
}

async function getImageBuffer(m) {
  if (m.isImage && m.download) return await m.download();
  if (m.quoted?.isImage && m.quoted.download) return await m.quoted.download();
  return null;
}

function buildCaption(result, usage, fallbackPrompt) {
  const lines = [
    "🎨 *FLUX PRO*",
    "",
    `> Model: ${result?.model || "-"}`,
    `> Mode: ${result?.mode || "-"}`,
    `> Resolusi: ${result?.resolution || "-"}`,
    `> Cost: ${usage?.cost ?? result?.cost_credits ?? "-"}`,
    `> Sisa Credit: ${usage?.remaining ?? "-"}`,
    "",
    `> Prompt: ${result?.prompt || fallbackPrompt || "-"}`,
  ];

  if (result?.reference_image) {
    lines.push(`> Reference: ${result.reference_image}`);
  }

  return lines.join("\n").trim();
}

async function handler(m, { sock }) {
  const rawText = m.text?.trim() || "";
  const parsed = parseFluxInput(rawText);
  const hasImage = m.isImage || m.quoted?.isImage;

  if (!parsed.prompt) {
    return m.reply(
      `🎨 *FLUX PRO*\n\n` +
        `> Buat atau edit gambar dengan AI\n\n` +
        `\`Contoh text: ${m.prefix}flux-pro buat gambar anime --model=flux-dev --ratio=1:1\`\n` +
        `\`Contoh edit: reply gambar + ${m.prefix}flux-pro ubah jadi anime --model=flux-dev --ratio=1:1\`\n\n` +
        `> Kamu juga bisa pakai \`--url=https://...\``,
    );
  }

  if (!config.APIkey?.covenant) {
    return m.reply("❌ API key covenant tidak dikonfigurasi!");
  }

  m.react("🕕");

  try {
    const fields = {
      prompt: parsed.prompt,
      model: parsed.model,
      ratio: parsed.ratio,
    };
    const files = [];

    if (parsed.imageUrl) {
      fields.imageUrl = parsed.imageUrl;
    }

    if (hasImage) {
      const mediaBuffer = await getImageBuffer(m);
      if (!mediaBuffer || !Buffer.isBuffer(mediaBuffer)) {
        m.react("❌");
        return m.reply("❌ Gagal mengunduh gambar referensi");
      }
      files.push({
        name: "file",
        value: mediaBuffer,
        filename: "flux-pro.jpg",
        contentType: "image/jpeg",
      });
    }

    const data = await ourinApi.covenant.multipart(
      "/api/ai/flux",
      fields,
      files,
      {
        timeout: 120000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    if (!data?.status || !data?.data?.url) {
      throw new Error(data?.message || "Gagal memproses Flux Pro");
    }

    m.react("✅");
    await sock.sendMedia(
      m.chat,
      data.data.url,
      buildCaption(data.data, data.usage, parsed.prompt),
      m,
      {
        type: "image",
      },
    );
  } catch (error) {
    m.react("☢");
    const message = error?.response?.data?.message || error?.message;
    if (message) {
      return m.reply(`❌ ${message}`);
    }
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };

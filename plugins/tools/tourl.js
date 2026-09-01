import FormData from "form-data";
import fetch from "node-fetch";
import fs from "fs";
import mime from "mime-types";
import { fileTypeFromBuffer } from "file-type";
import { downloadMediaMessage, getContentType } from "ourin";
import te from "../../src/lib/ourin-error.js";
import config from "../../config.js";
const pluginConfig = {
  name: "tourl",
  alias: ["upload", "catbox", "url"],
  category: "tools",
  description: "Upload media ke multiple host dan dapatkan URL",
  usage: ".tourl (reply/kirim media)",
  example: ".tourl",
  cooldown: 10,
  energi: 1,
  isEnabled: true,
};

const termaiKey = "AIzaBj7z2z3xBjsk";
const termaiDomain = "https://c.termai.cc";

async function detectExt(buffer, fallback = "bin") {
  try {
    const type = await fileTypeFromBuffer(buffer);
    return type?.ext || fallback;
  } catch {
    return fallback;
  }
}

async function uploadToCatbox(buffer, filename) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  });

  const res = await fetch("https://catbox.moe/user/api.php", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 30000,
  });

  if (!res.ok) throw new Error("Catbox gagal");
  const url = await res.text();
  if (!url.startsWith("http")) throw new Error("Invalid response");
  return { host: "Catbox", url, expires: "Permanent" };
}

async function uploadToLitterbox(buffer, filename) {
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("time", "72h");
  form.append("fileToUpload", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  });

  const res = await fetch(
    "https://litterbox.catbox.moe/resources/internals/api.php",
    {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
      timeout: 30000,
    },
  );

  if (!res.ok) throw new Error("Litterbox gagal");
  const url = await res.text();
  if (!url.startsWith("http")) throw new Error("Invalid response");
  return { host: "Litterbox", url, expires: "72 jam" };
}

async function uploadTo0x0_alt(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  });

  const res = await fetch("https://0x0.st", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 30000,
  });

  if (!res.ok) throw new Error("Uguu gagal");
  const data = await res.json();
  if (!data?.data?.url) throw new Error("Invalid response");

  let url = data.files[0].url;
  const idMatch = url.match(/\/(\d+)(?:\/|$)/);
  if (idMatch) {
    url = url;
  } else {
    url = url;
  }

  return { host: "Uguu", url, expires: "60 menit" };
}

async function uploadToGofile(buffer, filename) {
  const serverRes = await fetch("https://api.gofile.io/servers", {
    timeout: 10000,
  });
  const serverData = await serverRes.json();
  if (!serverData?.data?.servers?.[0]?.name)
    throw new Error("Gofile server gagal");

  const server = serverData.data.servers[0].name;
  const form = new FormData();
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  });

  const res = await fetch(`https://${server}.gofile.io/uploadFile`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 60000,
  });

  if (!res.ok) throw new Error("Gofile upload gagal");
  const data = await res.json();
  if (!data?.data?.downloadPage) throw new Error("Invalid response");
  return { host: "Gofile", url: data.data.downloadPage, expires: "Permanent" };
}

async function uploadToQuax(buffer, filename) {
  const form = new FormData();
  form.append("file", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  });

  const res = await fetch("https://qu.ax/upload.php", {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 60000,
  });

  if (!res.ok) throw new Error("Qu.ax gagal");
  const data = await res.json();

  if (!data?.success || !Array.isArray(data.files) || !data.files[0]?.url) {
    throw new Error("Invalid response");
  }

  return { host: "Qu.ax", url: data.files[0].url, expires: "Permanent" };
}

async function uploadToYpnk(buffer, filename) {
  const form = new FormData();
  form.append("files", buffer, {
    filename,
    contentType: mime.lookup(filename) || "application/octet-stream",
  });

  const res = await fetch("https://cdn.ypnk.biz.id/upload", {
    method: "POST",
    body: form,
    headers: {
      ...form.getHeaders(),
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
    },
    timeout: 120000,
  });

  if (!res.ok) throw new Error("YPNK gagal");
  const data = await res.json();

  if (!data?.success || !data?.files?.[0]?.url) {
    throw new Error("Invalid response");
  }

  return {
    host: "YPNK",
    url: `https://cdn.ypnk.biz.id${data.files[0].url}`,
    expires: "Unknown",
  };
}

async function uploadToPutIcu(buffer, filename) {
  const res = await fetch("https://put.icu/upload/", {
    method: "PUT",
    body: buffer,
    headers: {
      Accept: "application/json",
      "Content-Type": mime.lookup(filename) || "application/octet-stream",
    },
    timeout: 120000,
  });

  if (!res.ok) throw new Error("Put.icu gagal");
  const data = await res.json();

  if (data?.direct_url) {
    return { host: "Put.icu", url: data.direct_url, expires: "1 hari" };
  }

  if (data?.url) {
    return { host: "Put.icu", url: data.url, expires: "1 hari" };
  }

  throw new Error("Invalid response");
}

async function uploadToTermai(buffer) {
  const ext = await detectExt(buffer, "bin");
  const form = new FormData();
  form.append("file", buffer, { filename: `file.${ext}` });

  const res = await fetch(`${termaiDomain}/api/upload?key=${termaiKey}`, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
    timeout: 120000,
  });

  if (!res.ok) throw new Error("Termai gagal");
  const data = await res.json();

  if (!data?.status || !data?.path) {
    throw new Error("Invalid response");
  }

  return { host: "Termai", url: data.path, expires: "Unknown" };
}

const UPLOADERS = [
  { name: "Catbox", fn: uploadToCatbox },
  { name: "Litterbox", fn: uploadToLitterbox },
  { name: "0x0_Backup", fn: uploadTo0x0_alt },
  { name: "Gofile", fn: uploadToGofile },
  { name: "Qu.ax", fn: uploadToQuax },
  { name: "YPNK", fn: uploadToYpnk },
  { name: "Put.icu", fn: uploadToPutIcu },
  { name: "Termai", fn: uploadToTermai },
];

function getFileExtension(mimetype) {
  const mimeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/3gpp": "3gp",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/mp4": "m4a",
    "application/pdf": "pdf",
    "application/zip": "zip",
  };
  return mimeMap[mimetype] || "bin";
}

async function handler(m, { sock }) {
  let media = null;
  let mimetype = null;
  let filename = "file";

  if (m.quoted?.message) {
    const type = getContentType(m.quoted.message);
    if (!type || type === "conversation" || type === "extendedTextMessage") {
      return m.reply("⚠️ Reply media (gambar/video/audio/file)!");
    }

    try {
      media = await downloadMediaMessage(
        { key: m.quoted.key, message: m.quoted.message },
        "buffer",
        {},
      );
      const content = m.quoted.message[type];
      mimetype = content?.mimetype || "application/octet-stream";
      filename = content?.fileName || `file.${getFileExtension(mimetype)}`;
    } catch (e) {
      m.reply(te(m.prefix, m.command, m.pushName));
    }
  } else if (m.message) {
    const type = getContentType(m.message);
    if (!type || type === "conversation" || type === "extendedTextMessage") {
      return m.reply("⚠️ Kirim media + caption `.tourl` atau reply media");
    }

    try {
      media = await downloadMediaMessage(
        { key: m.key, message: m.message },
        "buffer",
        {},
      );
      const content = m.message[type];
      mimetype = content?.mimetype || "application/octet-stream";
      filename = content?.fileName || `file.${getFileExtension(mimetype)}`;
    } catch (e) {
      m.reply(te(m.prefix, m.command, m.pushName));
    }
  }

  if (!media || media.length === 0) {
    return m.reply("⚠️ Media tidak ditemukan!");
  }

  m.react("🕕");

  const results = [];
  const failed = [];

  for (const uploader of UPLOADERS) {
    try {
      const result = await uploader.fn(media, filename);
      results.push(result);
    } catch (e) {
      failed.push(uploader.name);
    }
  }

  if (results.length === 0) {
    m.react("❌");
    return m.reply(`❌ Semua upload gagal!\n\n> Failed: ${failed.join(", ")}`);
  }

  let text = `*UPLOADER*\n\n- 🌿 kalian bisa pilih yang kalian suka :b`;
  const links = [];

  results.forEach((r, i) => {
    const status = r.expires === "Permanent" ? "∞ Non-Expired" : r.expires;
    text += `${i + 1} *${r.host}*\n⏳ *Berakhir pada:* ${status}\n🔗 Linknya: {{IE_${i}}}link disini{{/IE_${i}}}\n\n`;
    links.push({
      url: r.url,
      displayName: config.bot.name,
      sourceDisplayName: `Uploader by ${r.host}`,
      sourceSubtitle: status,
    });
  });

  if (failed.length > 0) {
    text += `❌ Gagal: ${failed.join(", ")}`;
  }

  await sock.sendLinkV2(m.chat, text, links, m, {
    footer: `✨ *Selesai!*`,
  });

  m.react("✅");
}

export { pluginConfig as config, handler };

import * as botmodePlugin from "../group/botmode.js";
import { getCasesByCategory } from "../../case/ourin.js";
import { generateWAMessageFromContent, proto } from "ourin";
import config from "../../config.js";
import {
  getCommandsByCategory,
  getCategories,
} from "../../src/lib/ourin-plugins.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import fs from "fs";
import path from "path";
const pluginConfig = {
  name: "menucat",
  alias: ["mc", "category", "cat"],
  category: "main",
  description: "Menampilkan commands dalam kategori tertentu",
  usage: ".menucat <kategori>",
  example: ".menucat tools",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};
const CATEGORY_EMOJIS = {
  owner: "👑",
  main: "🏠",
  utility: "🔧",
  fun: "🎮",
  group: "👥",
  download: "📥",
  search: "🔍",
  tools: "🛠️",
  sticker: "🖼️",
  ai: "🤖",
  game: "🎯",
  media: "🎬",
  info: "ℹ️",
  religi: "☪️",
  panel: "🖥️",
  user: "📊",
  jpm: "📢",
  pushkontak: "📱",
  ephoto: "🎨",
  store: "🛒",
};
function toMonoUpperBold(text) {
  return text.toUpperCase();
}
function toSmallCaps(text) {
  return text.toUpperCase();
}
let cachedThumb = null;
try {
  const thumbPath = path.join(process.cwd(), "assets", "images", "ourin2.jpg");
  if (fs.existsSync(thumbPath)) cachedThumb = fs.readFileSync(thumbPath);
} catch (e) {}
function getContextInfo() {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";
  const botName = config.bot?.name || "Ourin-AI";
  return {
    forwardingScore: 9999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
    externalAdReply: {
      title: `Kategori Menu`,
      body: botName,
      sourceUrl: config.saluran?.link || "",
      mediaType: 1,
      renderLargerThumbnail: false,
      thumbnail: cachedThumb,
    },
  };
}
async function handler(m, { sock, db }) {
  const prefix = config.command?.prefix || ".";
  const args = m.args || [];
  const categoryArg = args[0]?.toLowerCase();
  const categories = getCategories();
  const commandsByCategory = getCommandsByCategory();
  const casesByCategory = getCasesByCategory();
  const savedVariant = db.setting("menucatVariant");
  const menucatVariant = savedVariant || config.ui?.menucatVariant || 2;
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";
  const saluranLink = config.saluran?.link || "";
  const botName = config.bot?.name || "Ourin-AI";
  const imagePath = path.join(process.cwd(), "assets", "images", "ourin.jpg");
  const thumbPath = path.join(process.cwd(), "assets", "images", "ourin2.jpg");
  let imageBuffer = fs.existsSync(imagePath)
    ? fs.readFileSync(imagePath)
    : null;
  let thumbBuffer = fs.existsSync(thumbPath)
    ? fs.readFileSync(thumbPath)
    : null;
  function buildFullContextInfo(title, body) {
    return {
      mentionedJid: [m.sender],
      forwardingScore: 9999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: saluranId,
        newsletterName: saluranName,
        serverMessageId: 127,
      },
      externalAdReply: {
        title: title || "Kategori Menu",
        body: body || botName,
        sourceUrl: saluranLink,
        mediaType: 1,
        renderLargerThumbnail: false,
        thumbnail: thumbBuffer || cachedThumb,
      },
    };
  }
  if (!categoryArg) {
    const groupData = m.isGroup ? db.getGroup(m.chat) || {} : {};
    const botMode = groupData.botMode || "md";
    let modeExcludeMap = {
      md: ["panel", "pushkontak", "store"],
      store: ["panel", "pushkontak", "jpm", "ephoto", "cpanel"],
      pushkontak: ["panel", "store", "jpm", "ephoto", "cpanel"],
      cpanel: ["pushkontak", "store", "jpm", "ephoto"],
    };
    try {
      if (botmodePlugin && botmodePlugin.MODES) {
        const modes = botmodePlugin.MODES;
        modeExcludeMap = {};
        for (const [key, val] of Object.entries(modes)) {
          if (val.excludeCategories)
            modeExcludeMap[key] = val.excludeCategories;
        }
      }
    } catch (e) {}
    const excludeCategories = modeExcludeMap[botMode] || modeExcludeMap.md;
    let txt = `📂 *${toMonoUpperBold("DAFTAR KATEGORI")}*\n\n`;
    txt += `> Ketik \`${prefix}menucat <kategori>\`\n\n`;
    const categoryOrder = [
      "owner",
      "main",
      "utility",
      "tools",
      "fun",
      "game",
      "download",
      "search",
      "sticker",
      "media",
      "ai",
      "group",
      "religi",
      "info",
      "cek",
      "economy",
      "user",
      "canvas",
      "random",
      "premium",
      "jpm",
      "pushkontak",
      "panel",
      "ephoto",
      "store",
    ];
    const allCats = [
      ...new Set([...categories, ...Object.keys(casesByCategory)]),
    ];
    const sortedCats = allCats.sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
    const visibleCats = sortedCats.filter((cat) => {
      if (cat === "owner" && !m.isOwner) return false;
      if (excludeCategories.includes(cat.toLowerCase())) return false;
      const total =
        (commandsByCategory[cat] || []).length +
        (casesByCategory[cat] || []).length;
      return total > 0;
    });
    txt += `╭─〔 📋 *KATEGORI* 〕───⬣\n`;
    for (const cat of visibleCats) {
      const pluginCmds = commandsByCategory[cat] || [];
      const caseCmds = casesByCategory[cat] || [];
      const totalCmds = pluginCmds.length + caseCmds.length;
      const emoji = CATEGORY_EMOJIS[cat] || "📁";
      txt += ` │ ${emoji} ${cat.toUpperCase()} │ \`${totalCmds}\` cmds\n`;
    }
    txt += `╰───────⬣\n\n`;
    txt += `_Contoh: \`${prefix}menucat tools\`_`;
    try {
      switch (menucatVariant) {
        case 1:
          return await m.reply(txt);
        case 2:
          return await sock.sendMessage(
            m.chat,
            {
              text: txt,
              contextInfo: buildFullContextInfo(
                "Daftar Kategori",
                `${visibleCats.length} kategori tersedia`,
              ),
            },
            { quoted: m },
          );
        case 3:
          if (imageBuffer) {
            return await sock.sendMessage(
              m.chat,
              {
                image: imageBuffer,
                caption: txt,
                contextInfo: buildFullContextInfo(
                  "Daftar Kategori",
                  `${visibleCats.length} kategori tersedia`,
                ),
              },
              { quoted: m },
            );
          }
          return await sock.sendMessage(
            m.chat,
            {
              text: txt,
              contextInfo: buildFullContextInfo(
                "Daftar Kategori",
                `${visibleCats.length} kategori tersedia`,
              ),
            },
            { quoted: m },
          );
        case 4: {
          const catRows = visibleCats.map((cat) => {
            const total =
              (commandsByCategory[cat] || []).length +
              (casesByCategory[cat] || []).length;
            const emoji = CATEGORY_EMOJIS[cat] || "📁";
            return {
              title: `${emoji} ${cat.toUpperCase()}`,
              description: `${total} commands`,
              id: `${prefix}menucat ${cat}`,
            };
          });
          const buttons = [
            {
              name: "single_select",
              buttonParamsJson: JSON.stringify({
                title: "📂 ᴘɪʟɪʜ ᴋᴀᴛᴇɢᴏʀɪ",
                sections: [{ title: "📋 PILIH KATEGORI", rows: catRows }],
              }),
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🏠 ᴋᴇᴍʙᴀʟɪ ᴋᴇ ᴍᴇɴᴜ",
                id: `${prefix}menu`,
              }),
            },
          ];
          const msg = generateWAMessageFromContent(
            m.chat,
            {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                  },
                  interactiveMessage:
                    proto.Message.InteractiveMessage.fromObject({
                      body: proto.Message.InteractiveMessage.Body.fromObject({
                        text: txt,
                      }),
                      footer:
                        proto.Message.InteractiveMessage.Footer.fromObject({
                          text: `© ${botName}`,
                        }),
                      header:
                        proto.Message.InteractiveMessage.Header.fromObject({
                          title: "📂 Daftar Kategori",
                          subtitle: `${visibleCats.length} kategori`,
                          hasMediaAttachment: false,
                        }),
                      nativeFlowMessage:
                        proto.Message.InteractiveMessage.NativeFlowMessage.fromObject(
                          {
                            buttons,
                          },
                        ),
                      contextInfo: buildFullContextInfo(
                        "Daftar Kategori",
                        `${visibleCats.length} kategori tersedia`,
                      ),
                    }),
                },
              },
            },
            { userJid: m.sender, quoted: m },
          );
          return await sock.relayMessage(m.chat, msg.message, {
            messageId: msg.key.id,
          });
        }
        default:
          return await sock.sendMessage(
            m.chat,
            {
              text: txt,
              contextInfo: buildFullContextInfo(
                "Daftar Kategori",
                `${visibleCats.length} kategori tersedia`,
              ),
            },
            { quoted: m },
          );
      }
    } catch (err) {
      console.error("[MenuCat] List error:", err.message);
      return await sock.sendMessage(
        m.chat,
        {
          text: txt,
          contextInfo: getContextInfo(),
        },
        { quoted: m },
      );
    }
  }
  const allCategories = [
    ...new Set([...categories, ...Object.keys(casesByCategory)]),
  ];
  const matchedCat = allCategories.find((c) => c.toLowerCase() === categoryArg);
  if (!matchedCat) {
    return m.reply(
      `❌ *KATEGORI TIDAK DITEMUKAN*\n\n> Kategori \`${categoryArg}\` tidak ada.\n> Ketik \`${prefix}menucat\` untuk list kategori.`,
    );
  }
  if (matchedCat === "owner" && !m.isOwner) {
    return m.reply(`❌ *AKSES DITOLAK*\n\n> Kategori ini hanya untuk owner.`);
  }
  const pluginCommands = commandsByCategory[matchedCat] || [];
  const caseCommands = casesByCategory[matchedCat] || [];
  const allCommands = [...pluginCommands, ...caseCommands];
  if (allCommands.length === 0) {
    return m.reply(
      `❌ *KOSONG*\n\n> Kategori \`${matchedCat}\` tidak memiliki command.`,
    );
  }
  const emoji = CATEGORY_EMOJIS[matchedCat] || "📁";
  let txt = `╭─〔 ${emoji} *${matchedCat.toUpperCase()}* 〕───⬣\n`;
  for (const cmd of allCommands) {
    txt += ` │ \`${prefix}${cmd}\`\n`;
  }
  txt += `╰───────⬣\n\n`;
  txt += `Total: \`${allCommands.length}\` commands\n`;
  if (caseCommands.length > 0) {
    txt += `(${pluginCommands.length} plugin + ${caseCommands.length} case)`;
  }
  try {
    switch (menucatVariant) {
      case 1:
        await m.reply(txt);
        break;
      case 2:
        await sock.sendMessage(
          m.chat,
          {
            text: txt,
            contextInfo: buildFullContextInfo(
              `${emoji} ${matchedCat}`,
              `${allCommands.length} commands`,
            ),
          },
          { quoted: m },
        );
        break;
      case 3:
        if (imageBuffer) {
          await sock.sendMessage(
            m.chat,
            {
              image: imageBuffer,
              caption: txt,
              contextInfo: buildFullContextInfo(
                `${emoji} ${matchedCat}`,
                `${allCommands.length} commands`,
              ),
            },
            { quoted: m },
          );
        } else {
          await sock.sendMessage(
            m.chat,
            {
              text: txt,
              contextInfo: buildFullContextInfo(
                `${emoji} ${matchedCat}`,
                `${allCommands.length} commands`,
              ),
            },
            { quoted: m },
          );
        }
        break;
      case 4: {
        const cmdRows = allCommands.map((cmd) => ({
          title: `${prefix}${toSmallCaps(cmd)}`,
          description: `Command ${matchedCat}`,
          id: `${prefix}${cmd}`,
        }));
        const chunkSize = 10;
        const sections = [];
        for (let i = 0; i < cmdRows.length; i += chunkSize) {
          const chunk = cmdRows.slice(i, i + chunkSize);
          const partNum = Math.floor(i / chunkSize) + 1;
          sections.push({
            title: `${emoji} ${matchedCat.toUpperCase()} — Part ${partNum}`,
            rows: chunk,
          });
        }
        const buttons = [
          ...sections.map((sec) => ({
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: `${emoji} ᴘɪʟɪʜ ᴄᴏᴍᴍᴀɴᴅ`,
              sections: [sec],
            }),
          })),
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "📂 ᴋᴇᴍʙᴀʟɪ ᴋᴇ ᴋᴀᴛᴇɢᴏʀɪ",
              id: `${prefix}menucat`,
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🏠 ᴋᴇᴍʙᴀʟɪ ᴋᴇ ᴍᴇɴᴜ",
              id: `${prefix}menu`,
            }),
          },
        ];
        const msg = generateWAMessageFromContent(
          m.chat,
          {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2,
                },
                interactiveMessage: proto.Message.InteractiveMessage.fromObject(
                  {
                    body: proto.Message.InteractiveMessage.Body.fromObject({
                      text: txt,
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({
                      text: `© ${botName}`,
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                      title: `${emoji} ${matchedCat.toUpperCase()}`,
                      subtitle: `${allCommands.length} commands`,
                      hasMediaAttachment: false,
                    }),
                    nativeFlowMessage:
                      proto.Message.InteractiveMessage.NativeFlowMessage.fromObject(
                        {
                          buttons,
                        },
                      ),
                    contextInfo: buildFullContextInfo(
                      `${emoji} ${matchedCat}`,
                      `${allCommands.length} commands`,
                    ),
                  },
                ),
              },
            },
          },
          { userJid: m.sender, quoted: m },
        );
        await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
        break;
      }
      default:
        await sock.sendMessage(
          m.chat,
          {
            text: txt,
            contextInfo: buildFullContextInfo(
              `${emoji} ${matchedCat}`,
              `${allCommands.length} commands`,
            ),
          },
          { quoted: m },
        );
    }
  } catch (err) {
    console.error("[MenuCat] Detail error:", err.message);
    await sock.sendMessage(
      m.chat,
      {
        text: txt,
        contextInfo: getContextInfo(),
      },
      { quoted: m },
    );
  }
}
export { pluginConfig as config, handler };

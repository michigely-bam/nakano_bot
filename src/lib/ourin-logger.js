import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import * as timeHelper from "./ourin-time.js";
import { getCachedJid, isLidConverted } from "./ourin-lid.js";
const g = gradient(["#22d3ee", "#38bdf8", "#818cf8", "#a855f7"]);
const borderFx = gradient(["#22d3ee", "#3b82f6", "#818cf8", "#a855f7"]);
const mintFx = gradient(["#10b981", "#2dd4bf", "#38bdf8"]);
const warmFx = gradient(["#f59e0b", "#f97316", "#ef4444"]);
const CATEGORY_PALETTE = [
  chalk.hex("#22d3ee"),
  chalk.hex("#38bdf8"),
  chalk.hex("#60a5fa"),
  chalk.hex("#818cf8"),
  chalk.hex("#a855f7"),
  chalk.hex("#34d399"),
  chalk.hex("#14b8a6"),
  chalk.hex("#c084fc"),
  chalk.hex("#93c5fd"),
];
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const ANSI = {
  clearLine: "\u001B[2K",
  cursorHome: "\r",
  hideCursor: "\u001B[?25l",
  showCursor: "\u001B[?25h",
};

const k = {
  p: chalk.hex("#A855F7"),
  s: chalk.hex("#22D3EE"),
  a: chalk.hex("#F59E0B"),
  t: chalk.white,
  d: chalk.hex("#94A3B8"),
  m: chalk.hex("#64748B"),
  ok: chalk.hex("#34D399"),
  no: chalk.hex("#FB7185"),
  wn: chalk.hex("#FBBF24"),
  in: chalk.hex("#60A5FA"),
  db: chalk.hex("#94A3B8"),
  bd: chalk.hex("#475569"),
  tg: chalk.hex("#C084FC"),
  cy: chalk.hex("#22D3EE"),
  pk: chalk.hex("#F472B6"),
  or: chalk.hex("#FB923C"),
  lm: chalk.hex("#A3E635"),
};

const SYM = {
  ok: k.ok("✓"),
  no: k.no("✕"),
  wn: k.wn("▲"),
  info: k.in("◈"),
  dot: k.d("•"),
  arr: k.p("»"),
  bar: k.d("│"),
  cmd: k.cy("⚡"),
};

function ts(fmt = "HH:mm:ss") {
  return k.d(timeHelper.formatTime(fmt));
}
function dt() {
  return k.d(timeHelper.formatTime("DD/MM/YYYY"));
}
function pad(label, n = 13) {
  return String(label).toLowerCase().padEnd(n);
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function isIdeTerminal() {
  return Boolean(
    process.env.WT_SESSION ||
    process.env.VSCODE_GIT_IPC_HANDLE ||
    process.env.VSCODE_INJECTION ||
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.JETBRAINS_IDE ||
    process.env.TERMINUS_SUBLIME ||
    process.env.WINDSURF_SESSION ||
    process.env.CURSOR_TRACE_ID,
  );
}
function supportsInlineAnimation() {
  if (process.env.OURIN_FORCE_ANIMATION === "true") return true;
  if (process.env.OURIN_NO_ANIMATION === "true") return false;
  if (process.env.CI) return false;
  if (!process.stdout.isTTY || !process.stdin?.isTTY) return false;
  if (process.env.TERM === "dumb") return false;
  if (isIdeTerminal()) return false;
  return (
    typeof process.stdout.clearLine === "function" &&
    typeof process.stdout.cursorTo === "function"
  );
}
function clearCurrentLine() {
  if (!supportsInlineAnimation()) return;
  process.stdout.cursorTo(0);
  process.stdout.clearLine(0);
}
function setCursorHidden(hidden) {
  if (!supportsInlineAnimation()) return;
  process.stdout.write(hidden ? ANSI.hideCursor : ANSI.showCursor);
}
function pill(text, tone = "info") {
  const tones = {
    info: ["#0f172a", "#67e8f9"],
    success: ["#052e16", "#6ee7b7"],
    warn: ["#3f2305", "#fcd34d"],
    error: ["#3b0a15", "#fda4af"],
    system: ["#111827", "#cbd5e1"],
    debug: ["#1e293b", "#93c5fd"],
    primary: ["#2e1065", "#d8b4fe"],
    accent: ["#312e81", "#c7d2fe"],
  };
  const [bg, fg] = tones[tone] || tones.info;
  return chalk
    .bgHex(bg)
    .hex(fg)
    .bold(` ${String(text).toLowerCase()} `);
}
function colorizeCategory(text, index = 0) {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length](text);
}
function renderDetail(kind, detail = "") {
  const text = String(detail);
  if (!text) return "";
  if (kind === "warn") return k.wn(text);
  if (kind === "error") return k.no(text);
  if (kind === "system") return k.d(text);
  if (kind === "debug") return k.db(text);
  return chalk.whiteBright(text);
}
function writeLog(kind, label, detail = "") {
  const map = {
    info: { icon: SYM.info, tone: "info" },
    success: { icon: SYM.ok, tone: "success" },
    warn: { icon: SYM.wn, tone: "warn" },
    error: { icon: SYM.no, tone: "error" },
    system: { icon: SYM.dot, tone: "system" },
    debug: { icon: k.cy("◌"), tone: "debug" },
  };
  const meta = map[kind] || map.info;
  const detailText = detail ? ` ${renderDetail(kind, detail)}` : "";
  console.log(`  ${meta.icon} ${pill(label, meta.tone)}${detailText}`);
}
const logger = {
  info: (label, detail = "") => writeLog("info", label, detail),
  success: (label, detail = "") => writeLog("success", label, detail),
  warn: (label, detail = "") => writeLog("warn", label, detail),
  error: (label, detail = "") => writeLog("error", label, detail),
  system: (label, detail = "") => writeLog("system", label, detail),
  debug: (label, detail = "") => writeLog("debug", label, detail),
  tag: (label, msg, detail = "") =>
    console.log(
      `  ${SYM.info} ${pill(label, "accent")} ${chalk.whiteBright(msg)}${detail ? ` ${k.d(detail)}` : ""}`,
    ),
};
function createSpinner(label = "system", text = "loading", options = {}) {
  let frame = 0;
  let timer = null;
  let active = false;
  let inline = false;
  let currentText = String(text);
  const interval = options.interval || 80;
  const tone = options.tone || "info";
  const render = () => {
    if (!inline) return;
    const glyph = g(SPINNER_FRAMES[frame % SPINNER_FRAMES.length]);
    clearCurrentLine();
    process.stdout.write(
      `  ${glyph} ${pill(label, tone)} ${chalk.whiteBright(currentText)} ${k.d("·")} ${borderFx("live")}`,
    );
    frame += 1;
  };
  return {
    start() {
      if (active) return;
      inline = supportsInlineAnimation();
      if (!inline) {
        logger.info(label, currentText);
        return;
      }
      active = true;
      setCursorHidden(true);
      render();
      timer = setInterval(render, interval);
    },
    update(nextText) {
      currentText = String(nextText);
      if (active && inline) render();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      if (inline) {
        clearCurrentLine();
        setCursorHidden(false);
      }
      active = false;
      inline = false;
    },
    succeed(detail = currentText) {
      this.stop();
      logger.success(label, detail);
    },
    warn(detail = currentText) {
      this.stop();
      logger.warn(label, detail);
    },
    fail(detail = currentText) {
      this.stop();
      logger.error(label, detail);
    },
    isActive() {
      return active;
    },
  };
}
async function spinText(label, text, options = {}) {
  const spinner = createSpinner(label, text, options);
  spinner.start();
  await sleep(options.duration || 700);
  spinner.stop();
}
async function typeLine(text, options = {}) {
  const indent = options.indent || "  ";
  const delay = options.delay ?? 12;
  const colorize = options.colorize || ((value) => value);
  const full = String(text);
  if (!supportsInlineAnimation() || delay <= 0) {
    console.log(indent + colorize(full));
    return;
  }
  setCursorHidden(true);
  let current = "";
  for (const ch of full) {
    current += ch;
    clearCurrentLine();
    process.stdout.write(indent + colorize(current));
    await sleep(delay);
  }
  process.stdout.write("\n");
  setCursorHidden(false);
}
async function runLoader(text = "memuat sistem", options = {}) {
  const label = options.label || "boot";
  const duration = options.duration || 900;
  const steps = Math.max(10, options.steps || 18);
  const width = Math.max(16, options.width || 24);
  if (!supportsInlineAnimation()) {
    logger.info(label, `${text} · 100%`);
    return;
  }
  setCursorHidden(true);
  for (let step = 0; step <= steps; step++) {
    const ratio = step / steps;
    const filled = Math.round(width * ratio);
    const empty = Math.max(0, width - filled);
    const bar = `${mintFx("█".repeat(filled))}${chalk.hex("#1e293b")("█".repeat(empty))}`;
    clearCurrentLine();
    process.stdout.write(
      `  ${k.cy("⚡")} ${pill(label, "accent")} ${chalk.whiteBright(text)} ${bar} ${chalk.hex("#a3e635").bold(String(Math.round(ratio * 100)).padStart(3) + "%")}`,
    );
    if (step < steps) await sleep(Math.max(20, Math.floor(duration / steps)));
  }
  process.stdout.write("\n");
  setCursorHidden(false);
}
async function playBootSequence(info = {}) {
  const { name = "OURIN AI", version = "1.0.0", mode = "public" } = info;
  console.clear();
  console.log("");
  await spinText("render", "mengkalibrasi gradient terminal", {
    duration: 520,
    tone: "accent",
  });
  await runLoader("menyiapkan startup renderer", {
    label: "boot",
    duration: 720,
    steps: 20,
    width: 28,
  });
  printBanner();
  await typeLine(`${name}        v${version} · ${mode}`, {
    indent: "  ",
    delay: 10,
    colorize: (value) => mintFx(value),
  });
  await typeLine("neon startup aktif · aurora gradient · typing stream", {
    indent: "  ",
    delay: 3,
    colorize: (value) => k.d(value),
  });
  console.log("");
}

const TYPE_MAP = {
  imageMessage: ["Gambar", "#34D399"],
  videoMessage: ["Video", "#60A5FA"],
  audioMessage: ["Audio", "#C084FC"],
  stickerMessage: ["Stiker", "#FBBF24"],
  documentMessage: ["Dokumen", "#F87171"],
  contactMessage: ["Kontak", "#A855F7"],
  locationMessage: ["Lokasi", "#10B981"],
  liveLocationMessage: ["Lokasi Saat Ini", "#10B981"],
  viewOnceMessageV2: ["1x Lihat", "#F59E0B"],
  extendedTextMessage: ["Pesan Extended", "#9CA3AF"],
  conversation: ["Pesan", "#9CA3AF"],
  interactiveResponseMessage: ["Menekan Tombol", "#22D3EE"],
  pollCreationMessage: ["Pesan Poll", "#FB923C"],
  reactionMessage: ["Reaksi", "#F472B6"],
};

function getTypeTag(msgType, isNewsletter) {
  if (isNewsletter) return chalk.hex("#F59E0B")("CH");
  const entry = TYPE_MAP[msgType];
  if (entry) return chalk.hex(entry[1])(entry[0]);
  return k.d("Pesan Biasa");
}

function getRoleTag(info) {
  if (info.isOwner) return chalk.hex("#F87171").bold("OWNER");
  if (info.isPartner) return chalk.hex("#FB923C").bold("PARTNER");
  if (info.isPremium) return chalk.hex("#FBBF24").bold("PREMIUM");
  if (info.isAdmin) return chalk.hex("#60A5FA").bold("ADMIN");
  return k.d("MEMBER");
}

function getDeviceTag(device) {
  if (!device) return k.d("???");
  const d = device.toLowerCase();
  if (d.includes("android") || d.includes("smba")) return k.lm("Android");
  if (d.includes("iphone") || d.includes("ios")) return k.t("iPhone");
  if (d.includes("web") || d.includes("multi")) return k.cy("Web");
  if (d.includes("desktop") || d.includes("windows")) return k.in("Desktop");
  return k.d(device);
}

function logMessage(info) {
  if (typeof info === "string") {
    const [chatType, sender, message] = arguments;
    info = {
      chatType,
      sender,
      message,
      pushName: sender,
      groupName: chatType === "group" ? "Unknown" : "Private",
    };
  }

  const {
    chatType,
    groupName,
    pushName,
    sender,
    message,
    messageType,
    isNewsletter,
    isOwner,
    isPremium,
    isPartner,
    isAdmin,
    device,
  } = info;
  if (!message || message.trim() === "" || !sender) return;

  const isGroup = chatType === "group";
  const isNL = chatType === "newsletter";
  const num = sender.replace("@s.whatsapp.net", "");
  let msg =
    message.replace(/\n/g, " ").substring(0, 70) +
    (message.length > 70 ? "..." : "");
  msg = msg.replace(/@(\d{10,})/g, (match, num) => {
    const lidJid = num + "@lid";
    const resolved = getCachedJid(lidJid);
    if (resolved && !isLidConverted(resolved)) {
      return "@" + resolved.replace(/@.+/g, "");
    }
    const swJid = num + "@s.whatsapp.net";
    const resolved2 = getCachedJid(swJid);
    if (resolved2 && !isLidConverted(resolved2)) {
      return "@" + resolved2.replace(/@.+/g, "");
    }
    return match;
  });
  const time = timeHelper.formatTime("HH:mm:ss");
  const date = timeHelper.formatTime("DD/MM/YYYY");

  const typeTag = getTypeTag(messageType, isNewsletter || isNL);
  const roleTag = getRoleTag(info);
  const devTag = getDeviceTag(device);

  const chatTag = isNL
    ? chalk.bold.white("Ini pesan dari saluran ") +
      chalk.hex("#F59E0B").bold(groupName || "Channel")
    : isGroup
      ? chalk.bold.white("Ini pesan dari grup ") +
        chalk.hex("#9000ffff").bold(groupName || "Group")
      : chalk.bold.white("Ini pesan dari private chat ") +
        chalk.hex("#ff0000ff").bold(pushName || "User");

  const br = borderFx;
  console.log("");
  console.log(`  ${br("╭─〔")} ${chatTag} ${br("〕───⬣")}`);
  console.log(
    `  ${k.bd("│")} ${k.t("👤")} Nama: ${chalk.whiteBright(pushName || "User")}`,
  );
  console.log(
    `  ${k.bd("│")} ${k.t("📞")} Nomor: +${chalk.hex("#67e8f9")(num)}`,
  );
  console.log(
    `  ${k.bd("│")} ${k.t("📅")} Tanggal/Waktu: ${k.d(date)} ${chalk.whiteBright(time)}`,
  );
  console.log(`  ${k.bd("│")} ${k.t("📱")} Device: ${devTag}`);
  console.log(
    `  ${k.bd("│")} ${k.t("💬")} Tipe Pesan: ${k.d("[")}${typeTag}${k.d("]")}`,
  );
  console.log(`  ${k.bd("│")} ${k.t("🏷")} Role: ${roleTag}`);
  console.log(`  ${k.bd("│")} ${k.t("💬")} ${chalk.whiteBright(msg)}`);
  console.log(`  ${br("╰───────⬣")}`);
}

function logPlugin(name, category) {
  console.log(
    `  ${k.bd("├─")} ${chalk.whiteBright(name)} ${pill(category, "primary")}`,
  );
}

function logConnection(status, info = "") {
  const w = 52;
  const label =
    status === "connected"
      ? chalk.hex("#34D399").bold("● Connected")
      : status === "connecting"
        ? warmFx("◐ Connecting")
        : chalk.hex("#FB7185").bold("○ Disconnected");
  const line = borderFx("═".repeat(w));
  const detail = info ? chalk.whiteBright(info) : k.d("-");

  console.log("");
  console.log(line);
  console.log(`  ${label} ${k.d("—")} ${detail}`);
  console.log(line);
}

function logErrorBox(title, message) {
  console.log("");
  console.log(
    `  ${pill("error", "error")} ${chalk.hex("#fda4af").bold(title)}`,
  );
  console.log(`  ${k.bd("│")} ${chalk.gray(message)}`);
  console.log("");
}

function printBanner(mini = false) {
  if (mini) {
    console.log("");
    return;
  }
  console.log("");
  const ascii = figlet.textSync("OURIN", {
    font: "ANSI Shadow",
    horizontalLayout: "fitted",
  });
  console.log(g(ascii));
  console.log(
    `  ${borderFx("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`,
  );
  console.log("");
}

function printStartup(info = {}) {
  const { name, version, mode } = info;
  console.log(
    `  ${pill(name, "primary")} ${k.d("v" + version)} ${k.d("·")} ${mintFx(String(mode))}`,
  );
  console.log("");
}

const CODES = {
  reset: "",
  bold: "",
  dim: "",
  italic: "",
  underline: "",
  green: "",
  purple: "",
  white: "",
  gray: "",
  phantom: "",
  lime: "",
  silver: "",
  red: "",
  yellow: "",
  blue: "",
  cyan: "",
  magenta: "",
  bgBlack: "",
  bgGray: "",
};

const c = {
  green: chalk.green,
  purple: chalk.hex("#9B30FF"),
  white: chalk.white,
  gray: chalk.gray,
  bold: chalk.bold,
  dim: chalk.dim,
  greenBold: (v) => chalk.green.bold(v),
  purpleBold: (v) => chalk.hex("#9B30FF").bold(v),
  whiteBold: (v) => chalk.white.bold(v),
  grayDim: (v) => chalk.gray.dim(v),
  red: chalk.red,
  yellow: chalk.yellow,
  cyan: chalk.cyan,
  blue: chalk.blue,
  magenta: chalk.magenta,
};

function divider() {
  console.log(borderFx("─".repeat(54)));
}

function createBanner(lines, color = "green") {
  const maxLen = Math.max(...lines.map((l) => l.length));
  const padded = lines.map((l) => l.padEnd(maxLen));
  let res = borderFx(`╭${"─".repeat(maxLen + 2)}╮`) + "\n";
  for (const line of padded)
    res += k.bd("│") + " " + chalk.whiteBright(line) + " " + k.bd("│") + "\n";
  res += borderFx(`╰${"─".repeat(maxLen + 2)}╯`);
  return res;
}

function getTimestamp() {
  return k.d(timeHelper.formatTime("HH:mm:ss"));
}

const theme = {
  ...k,
  primary: k.p,
  secondary: k.s,
  accent: k.a,
  text: k.t,
  dim: k.d,
  muted: k.m,
  success: k.ok,
  error: k.no,
  warning: k.wn,
  info: k.in,
  debug: k.db,
  border: k.bd,
  tag: k.tg,
  pill,
  rainbow: g,
  borderFx,
  mintFx,
  warmFx,
  colorizeCategory,
};
export {
  c,
  CODES,
  logger,
  createSpinner,
  spinText,
  typeLine,
  runLoader,
  playBootSequence,
  logMessage,
  logPlugin,
  logConnection,
  logErrorBox,
  printBanner,
  printStartup,
  createBanner,
  getTimestamp,
  divider,
  theme,
  chalk,
  gradient,
};

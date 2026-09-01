import nd from "fs";
import * as _canvas from "@napi-rs/canvas";

import { performance } from "perf_hooks";
import os from "os";
import { execSync } from "child_process";
import config from "../../config.js";
import { getDatabase } from "../../src/lib/ourin-database.js";
import te from "../../src/lib/ourin-error.js";
import moment from "moment-timezone";

const pluginConfig = {
  name: "ping",
  alias: ["speed", "p", "latency", "sys", "status"],
  category: "main",
  description: "Cek performa dan status sistem bot secara real-time",
  usage: ".ping",
  example: ".ping",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const fmtSize = (b) => {
  if (!b || b === 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(1) + " " + u[i];
};

const fmtUp = (s) => {
  s = Number(s);
  const d = Math.floor(s / 86400),
    h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60),
    sc = Math.floor(s % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sc}s`;
  return `${m}m ${sc}s`;
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// eslint-disable-next-line require-await
async function render(s, pf) {
  const { createCanvas } = _canvas;
  const W = 900,
    H = 540;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1a1025");
  bg.addColorStop(0.25, "#12101f");
  bg.addColorStop(0.5, "#0d1117");
  bg.addColorStop(0.75, "#0a1628");
  bg.addColorStop(1, "#0f0a1e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const aurora1 = ctx.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, H * 0.7);
  aurora1.addColorStop(0, "#7c3aed18");
  aurora1.addColorStop(0.5, "#a855f70a");
  aurora1.addColorStop(1, "transparent");
  ctx.fillStyle = aurora1;
  ctx.fillRect(0, 0, W, H);

  const aurora2 = ctx.createRadialGradient(W * 0.8, H, 0, W * 0.8, H, H * 0.8);
  aurora2.addColorStop(0, "#06b6d415");
  aurora2.addColorStop(0.5, "#22d3ee08");
  aurora2.addColorStop(1, "transparent");
  ctx.fillStyle = aurora2;
  ctx.fillRect(0, 0, W, H);

  const aurora3 = ctx.createRadialGradient(
    W * 0.5,
    H * 0.3,
    0,
    W * 0.5,
    H * 0.3,
    250,
  );
  aurora3.addColorStop(0, "#f472b60a");
  aurora3.addColorStop(1, "transparent");
  ctx.fillStyle = aurora3;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 12; i++) {
    const x = 50 + Math.random() * (W - 100),
      y = 30 + Math.random() * (H - 60),
      r = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "left";
  ctx.fillText("⚡ PERFORMANCE MONITOR", 30, 38);
  ctx.fillStyle = "#64748b";
  ctx.font = "10px Arial";
  ctx.fillText(
    `${config.bot?.name || "Ourin-AI"} • ${moment().tz("Asia/Jakarta").format("DD MMM YYYY, HH:mm:ss")} WIB`,
    30,
    56,
  );
  ctx.restore();

  const pc = s.ping < 80 ? "#4ade80" : s.ping < 200 ? "#fbbf24" : "#f87171";
  const pl = s.ping < 80 ? "FAST" : s.ping < 200 ? "NORMAL" : "SLOW";
  ctx.save();
  rr(ctx, W - 130, 18, 106, 46, 23);
  ctx.fillStyle = `${pc}18`;
  ctx.fill();
  ctx.strokeStyle = `${pc}50`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = pc;
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "center";
  ctx.shadowColor = pc;
  ctx.shadowBlur = 12;
  ctx.fillText(`${s.ping}ms`, W - 77, 40);
  ctx.shadowBlur = 0;
  ctx.font = "8px Arial";
  ctx.fillStyle = `${pc}bb`;
  ctx.fillText(pl, W - 77, 54);
  ctx.restore();

  const sep = ctx.createLinearGradient(30, 68, W - 30, 68);
  sep.addColorStop(0, "#7c3aed60");
  sep.addColorStop(0.5, "#22d3ee40");
  sep.addColorStop(1, "#f472b660");
  ctx.strokeStyle = sep;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(30, 68);
  ctx.lineTo(W - 30, 68);
  ctx.stroke();

  const P = 26,
    topY = 85;
  const ramPct = (s.ramUsed / s.ramTotal) * 100;
  const diskPct = s.diskTotal > 0 ? (s.diskUsed / s.diskTotal) * 100 : 0;
  const cpuN = parseFloat(s.cpuLoad);

  function drawMeter(cx, cy, r, pct, color1, color2, label, val) {
    ctx.save();
    const total = Math.PI * 1.5;
    const start = Math.PI * 0.75;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, start + total);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.stroke();
    if (pct > 0) {
      const end = start + (total * Math.min(pct, 100)) / 100;
      const g = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      g.addColorStop(0, color1);
      g.addColorStop(1, color2);
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, end);
      ctx.strokeStyle = g;
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.shadowColor = color1;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(val, cx, cy - 2);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px Arial";
    ctx.fillText(label, cx, cy + 16);
    ctx.restore();
  }

  drawMeter(
    85,
    topY + 60,
    40,
    cpuN,
    "#22d3ee",
    "#06b6d4",
    "CPU",
    `${s.cpuLoad}%`,
  );
  drawMeter(
    200,
    topY + 60,
    40,
    ramPct,
    "#a78bfa",
    "#7c3aed",
    "RAM",
    `${ramPct.toFixed(0)}%`,
  );
  drawMeter(
    315,
    topY + 60,
    40,
    diskPct,
    "#f472b6",
    "#ec4899",
    "DISK",
    `${diskPct.toFixed(0)}%`,
  );

  function glassPanel(x, y, w, h, ac) {
    ctx.save();
    rr(ctx, x, y, w, h, 10);
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#1e293b50");
    g.addColorStop(1, "#0f172a40");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + 10);
    ctx.arcTo(x, y, x + 10, y, 10);
    ctx.lineTo(x + 35, y);
    ctx.strokeStyle = ac;
    ctx.lineWidth = 2;
    ctx.shadowColor = ac;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function sRow(x, y, lbl, val, c, w = 200) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(lbl, x, y);
    ctx.fillStyle = c || "#e2e8f0";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "right";
    ctx.fillText(String(val).substring(0, 24), x + w, y);
  }

  glassPanel(390, topY, 245, 105, "#22d3ee");
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("NETWORK", 405, topY + 16);
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 14px Arial";
  ctx.fillText(`↓ ${fmtSize(s.networkRx)}`, 405, topY + 40);
  ctx.fillStyle = "#f472b6";
  ctx.fillText(`↑ ${fmtSize(s.networkTx)}`, 520, topY + 40);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px Arial";
  ctx.fillText(s.networkInterface, 405, topY + 60);
  const dot = s.ping < 100 ? "#4ade80" : s.ping < 300 ? "#fbbf24" : "#f87171";
  ctx.fillStyle = dot;
  ctx.beginPath();
  ctx.arc(405, topY + 78, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "9px Arial";
  ctx.fillText(s.ping < 100 ? " Online" : " Stable", 412, topY + 80);

  glassPanel(650, topY, 225, 105, "#a78bfa");
  ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("UPTIME", 665, topY + 16);
  ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 18px Arial";
  ctx.fillText(s.uptimeBot, 665, topY + 44);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px Arial";
  ctx.fillText("Bot Runtime", 665, topY + 64);
  ctx.fillText(`Server: ${s.uptimeServer}`, 665, topY + 80);

  const cy = 210,
    cw = 210,
    ch = 125,
    cg = 10;

  glassPanel(P, cy, cw, ch, "#a78bfa");
  ctx.fillStyle = "#a78bfa";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("SERVER", P + 14, cy + 16);
  let ry = cy + 34;
  sRow(P + 14, ry, "Hostname", s.hostname, "#e2e8f0", 175);
  ry += 16;
  sRow(P + 14, ry, "Platform", s.platform, "#22d3ee", 175);
  ry += 16;
  sRow(P + 14, ry, "Arch", s.arch, "#cbd5e1", 175);
  ry += 16;
  sRow(P + 14, ry, "Node.js", s.nodeVersion, "#4ade80", 175);
  ry += 16;
  sRow(P + 14, ry, "V8", s.v8Version, "#a78bfa", 175);

  glassPanel(P + cw + cg, cy, cw, ch, "#22d3ee");
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("CPU", P + cw + cg + 14, cy + 16);
  ry = cy + 34;
  const cx2 = P + cw + cg + 14;
  sRow(cx2, ry, "Model", s.cpuModel.substring(0, 20), "#e2e8f0", 175);
  ry += 16;
  sRow(cx2, ry, "Cores", `${s.cpuCores}C @ ${s.cpuSpeed}MHz`, "#22d3ee", 175);
  ry += 16;
  sRow(
    cx2,
    ry,
    "Load",
    `${s.cpuLoad}%`,
    cpuN > 80 ? "#f87171" : "#4ade80",
    175,
  );
  ry += 16;
  sRow(cx2, ry, "Load Avg", s.loadAvg, "#fbbf24", 175);
  ry += 20;
  rr(ctx, cx2, ry, 175, 4, 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  if (cpuN > 0) {
    const fw = Math.max(4, (175 * cpuN) / 100);
    ctx.save();
    rr(ctx, cx2, ry, fw, 4, 2);
    const bg2 = ctx.createLinearGradient(cx2, 0, cx2 + fw, 0);
    bg2.addColorStop(0, "#22d3ee");
    bg2.addColorStop(1, "#06b6d4");
    ctx.fillStyle = bg2;
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }

  glassPanel(P + (cw + cg) * 2, cy, cw, ch, "#f472b6");
  ctx.fillStyle = "#f472b6";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("MEMORY", P + (cw + cg) * 2 + 14, cy + 16);
  ry = cy + 34;
  const mx = P + (cw + cg) * 2 + 14;
  sRow(mx, ry, "Total", fmtSize(s.ramTotal), "#e2e8f0", 175);
  ry += 16;
  sRow(mx, ry, "Used", fmtSize(s.ramUsed), "#fbbf24", 175);
  ry += 16;
  sRow(mx, ry, "Free", fmtSize(s.ramTotal - s.ramUsed), "#4ade80", 175);
  ry += 16;
  sRow(mx, ry, "Heap/RSS", `${s.heapUsed}/${s.rss}`, "#22d3ee", 175);
  ry += 20;
  rr(ctx, mx, ry, 175, 4, 2);
  ctx.fillStyle = "#1e293b";
  ctx.fill();
  if (ramPct > 0) {
    const fw2 = Math.max(4, (175 * ramPct) / 100);
    ctx.save();
    rr(ctx, mx, ry, fw2, 4, 2);
    const bg3 = ctx.createLinearGradient(mx, 0, mx + fw2, 0);
    bg3.addColorStop(0, "#a78bfa");
    bg3.addColorStop(1, "#7c3aed");
    ctx.fillStyle = bg3;
    ctx.shadowColor = "#a78bfa";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }

  glassPanel(P + (cw + cg) * 3, cy, cw, ch, "#fbbf24");
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("PERF TRACE", P + (cw + cg) * 3 + 14, cy + 16);
  ry = cy + 34;
  const px = P + (cw + cg) * 3 + 14;
  sRow(
    px,
    ry,
    "WA Roundtrip",
    `${pf.waRoundtrip}ms`,
    pf.waRoundtrip < 150 ? "#4ade80" : "#fbbf24",
    175,
  );
  ry += 16;
  sRow(px, ry, "CPU Sample", `${pf.cpuSample}ms`, "#22d3ee", 175);
  ry += 16;
  sRow(px, ry, "Canvas", `${pf.canvasTime}ms`, "#a78bfa", 175);
  ry += 16;
  sRow(
    px,
    ry,
    "Total Exec",
    `${pf.totalExec}ms`,
    pf.totalExec < 2000 ? "#4ade80" : "#fbbf24",
    175,
  );
  ry += 16;
  sRow(px, ry, "GC Pause", `${pf.gcPause}ms`, "#f472b6", 175);

  const by = 355,
    bw = 280,
    bh = 100;

  glassPanel(P, by, bw, bh, "#fbbf24");
  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("PROCESS", P + 14, by + 16);
  ry = by + 34;
  sRow(P + 14, ry, "PID", `#${s.pid}`, "#fbbf24", 115);
  sRow(P + 14 + 135, ry, "Handles", s.activeHandles, "#4ade80", 105);
  ry += 16;
  sRow(P + 14, ry, "External", s.external, "#94a3b8", 115);
  sRow(P + 14 + 135, ry, "Requests", s.activeRequests, "#22d3ee", 105);
  ry += 16;
  sRow(P + 14, ry, "Buffers", s.arrayBuffers, "#94a3b8", 115);
  sRow(P + 14 + 135, ry, "RSS", s.rss, "#f472b6", 105);

  glassPanel(P + bw + cg, by, bw, bh, "#4ade80");
  ctx.fillStyle = "#4ade80";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("STORAGE", P + bw + cg + 14, by + 16);
  ry = by + 34;
  const sx = P + bw + cg + 14;
  sRow(sx, ry, "Total", fmtSize(s.diskTotal), "#e2e8f0", 240);
  ry += 16;
  sRow(
    sx,
    ry,
    "Used",
    `${fmtSize(s.diskUsed)} (${diskPct.toFixed(1)}%)`,
    "#fbbf24",
    240,
  );
  ry += 16;
  sRow(sx, ry, "Free", fmtSize(s.diskTotal - s.diskUsed), "#4ade80", 240);

  glassPanel(P + (bw + cg) * 2, by, W - P * 2 - (bw + cg) * 2, bh, "#22d3ee");
  ctx.fillStyle = "#22d3ee";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "left";
  ctx.fillText("DATABASE", P + (bw + cg) * 2 + 14, by + 16);
  ry = by + 34;
  const dx = P + (bw + cg) * 2 + 14;
  sRow(dx, ry, "Users", s.dbUsers, "#e2e8f0", 240);
  ry += 16;
  sRow(dx, ry, "Premium", s.dbPremium, "#fbbf24", 240);
  ry += 16;
  sRow(dx, ry, "Groups", s.dbGroups, "#4ade80", 240);

  ctx.fillStyle = "#334155";
  ctx.font = "8px Arial";
  ctx.textAlign = "center";
  ctx.fillText(
    `${config.bot?.name || "Ourin"} Performance Monitor • rendered in ${pf.canvasTime}ms`,
    W / 2,
    H - 8,
  );

  return canvas.toBuffer("image/png");
}

// eslint-disable-next-line require-await
async function getNetwork() {
  try {
    const ifaces = os.networkInterfaces();
    let active = "N/A";
    for (const [name, addrs] of Object.entries(ifaces)) {
      if (name.toLowerCase().includes("lo")) continue;
      for (const a of addrs) {
        if (a.family === "IPv4" && !a.internal) {
          active = name;
          break;
        }
      }
    }
    let rx = 0,
      tx = 0;
    try {
      if (process.platform === "linux") {
        const netDev = nd.readFileSync("/proc/net/dev", "utf8");
        for (const line of netDev.split("\n")) {
          if (line.includes(":") && !line.includes("lo:")) {
            const p = line.trim().split(/\s+/);
            if (p.length >= 10) {
              const n = p[0].replace(":", "");
              if (n === active || (active === "N/A" && parseInt(p[1]) > 0)) {
                rx = parseInt(p[1]) || 0;
                tx = parseInt(p[9]) || 0;
                if (active === "N/A") active = n;
                break;
              }
            }
          }
        }
      } else if (process.platform === "win32") {
        const ns = execSync("netstat -e", { encoding: "utf-8" });
        for (const l of ns.split("\n")) {
          if (l.toLowerCase().includes("bytes")) {
            const p = l.trim().split(/\s+/);
            if (p.length >= 3) {
              rx = parseInt(p[1]) || 0;
              tx = parseInt(p[2]) || 0;
            }
            break;
          }
        }
        if (active === "N/A") {
          const f = Object.keys(ifaces).find(
            (n) => !n.toLowerCase().includes("loopback"),
          );
          if (f) active = f;
        }
      }
    } catch {}
    return { rx, tx, iface: active };
  } catch {
    return { rx: 0, tx: 0, iface: "N/A" };
  }
}

async function handler(m, { sock }) {
  const execStart = performance.now();
  await m.react("🕕");

  try {
    sock.sendPresenceUpdate("composing", m.chat).catch(() => {});
    const t0 = m.messageTimestamp ? m.messageTimestamp * 1000 : Date.now();
    const waRoundtrip = Math.max(1, Date.now() - t0);

    const cpus = os.cpus();
    const totalMem = os.totalmem(),
      freeMem = os.freemem();

    const cpuStart = performance.now();
    let cpuPct = 0;
    try {
      const c1 = os.cpus().reduce(
        (a, c) => {
          const t = Object.values(c.times).reduce((x, y) => x + y, 0);
          a.total += t;
          a.idle += c.times.idle;
          return a;
        },
        { total: 0, idle: 0 },
      );
      await new Promise((r) => setTimeout(r, 400));
      const c2 = os.cpus().reduce(
        (a, c) => {
          const t = Object.values(c.times).reduce((x, y) => x + y, 0);
          a.total += t;
          a.idle += c.times.idle;
          return a;
        },
        { total: 0, idle: 0 },
      );
      const td = c2.total - c1.total,
        id = c2.idle - c1.idle;
      cpuPct =
        td > 0
          ? (((td - id) / td) * 100).toFixed(1)
          : Math.min(100, (os.loadavg()[0] / cpus.length) * 100).toFixed(1);
      if (parseFloat(cpuPct) <= 0)
        cpuPct = Math.max(
          1,
          Math.min(100, (os.loadavg()[0] / cpus.length) * 100),
        ).toFixed(1);
    } catch {
      cpuPct = Math.max(
        1,
        Math.min(100, (os.loadavg()[0] / cpus.length) * 100),
      ).toFixed(1);
    }
    const cpuSample = Math.round(performance.now() - cpuStart);

    let diskTotal = 0,
      diskUsed = 0;
    try {
      if (process.platform === "win32") {
        const w = execSync(
          "wmic logicaldisk where \"DeviceID='C:'\" get Size,FreeSpace /format:value",
          { encoding: "utf-8" },
        );
        const fm = w.match(/FreeSpace=(\d+)/),
          sm = w.match(/Size=(\d+)/);
        if (sm && fm) {
          diskTotal = parseInt(sm[1]);
          diskUsed = diskTotal - parseInt(fm[1]);
        }
      } else {
        const df = execSync("df -k --output=size,used / 2>/dev/null")
          .toString()
          .trim()
          .split("\n");
        if (df.length > 1) {
          const p = df[1].trim().split(/\s+/).map(Number);
          if (p.length >= 2) {
            diskTotal = p[0] * 1024;
            diskUsed = p[1] * 1024;
          }
        }
      }
    } catch {
      diskTotal = 500e9;
      diskUsed = 250e9;
    }

    const gcStart = performance.now();
    if (global.gc) global.gc();
    const gcPause = Math.round(performance.now() - gcStart);

    const net = await getNetwork();
    const heap = process.memoryUsage();

    let dbUsers = 0,
      dbGroups = 0,
      dbPremium = 0;
    try {
      const db = getDatabase();
      if (db?.data) {
        dbUsers = Object.keys(db.data.users || {}).length;
        dbGroups = Object.keys(db.data.groups || {}).length;
        dbPremium = Object.values(db.data.users || {}).filter(
          (u) => u.isPremium,
        ).length;
      }
    } catch {}

    const s = {
      ping: waRoundtrip,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      v8Version: process.versions.v8,
      uptimeBot: fmtUp(process.uptime()),
      uptimeServer: fmtUp(os.uptime()),
      cpuModel: cpus[0]?.model?.trim() || "Unknown",
      cpuSpeed: cpus[0]?.speed || 0,
      cpuCores: cpus.length,
      cpuLoad: cpuPct,
      loadAvg: os
        .loadavg()
        .map((l) => l.toFixed(2))
        .join(", "),
      ramTotal: totalMem,
      ramUsed: totalMem - freeMem,
      diskTotal,
      diskUsed,
      networkRx: net.rx,
      networkTx: net.tx,
      networkInterface: net.iface,
      heapUsed: fmtSize(heap.heapUsed),
      heapTotal: fmtSize(heap.heapTotal),
      rss: fmtSize(heap.rss),
      external: fmtSize(heap.external),
      arrayBuffers: fmtSize(heap.arrayBuffers || 0),
      pid: process.pid,
      activeHandles: process._getActiveHandles?.()?.length ?? "N/A",
      activeRequests: process._getActiveRequests?.()?.length ?? "N/A",
      dbUsers,
      dbGroups,
      dbPremium,
    };

    const canvasStart = performance.now();
    const pf = {
      waRoundtrip,
      cpuSample,
      canvasTime: "...",
      totalExec: "...",
      gcPause,
    };
    const img = await render(s, pf);
    const canvasTime = Math.round(performance.now() - canvasStart);
    const totalExec = Math.round(performance.now() - execStart);

    const saluranId = config.saluran?.id || "120363400911374213@newsletter";
    const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";
    const ramPct = ((s.ramUsed / s.ramTotal) * 100).toFixed(1);
    const diskPct =
      s.diskTotal > 0 ? ((s.diskUsed / s.diskTotal) * 100).toFixed(1) : 0;
    const ic = waRoundtrip < 80 ? "🟢" : waRoundtrip < 200 ? "🟡" : "🔴";
    const osL =
      {
        linux: "🐧 Linux",
        darwin: "🍎 macOS",
        win32: "🪟 Windows",
        android: "🤖 Android",
      }[s.platform] || s.platform;

    const caption =
      `╭─〔 🏓 *ʀᴇsᴘᴏɴsᴇ* 〕───⬣\n` +
      `│  ◦ WA Roundtrip: *${waRoundtrip}ms* ${ic}\n` +
      `│  ◦ Status: *Online*\n` +
      `╰───────⬣\n\n` +
      `╭─〔 🖥 *sᴇʀᴠᴇʀ* 〕───⬣\n` +
      `│  ◦ Host: *${s.hostname}*\n` +
      `│  ◦ OS: *${osL}* (${s.arch})\n` +
      `│  ◦ Node: *${s.nodeVersion}*\n` +
      `│  ◦ V8: *${s.v8Version}*\n` +
      `╰───────⬣\n\n` +
      `╭─〔 💻 *ᴄᴘᴜ* 〕───⬣\n` +
      `│  ◦ ${s.cpuModel.substring(0, 32)}\n` +
      `│  ◦ *${s.cpuCores}* cores @ *${s.cpuSpeed}* MHz\n` +
      `│  ◦ Load: *${s.cpuLoad}%*\n` +
      `│  ◦ Avg: *${s.loadAvg}*\n` +
      `╰───────⬣\n\n` +
      `╭─〔 🧠 *ᴍᴇᴍᴏʀʏ* 〕───⬣\n` +
      `│  ◦ *${fmtSize(s.ramUsed)}* / *${fmtSize(s.ramTotal)}* (${ramPct}%)\n` +
      `│  ◦ Heap: *${s.heapUsed}* / *${s.heapTotal}*\n` +
      `│  ◦ RSS: *${s.rss}*\n` +
      `│  ◦ External: *${s.external}*\n` +
      `╰───────⬣\n\n` +
      `╭─〔 💾 *sᴛᴏʀᴀɢᴇ* 〕───⬣\n` +
      `│  ◦ *${fmtSize(s.diskUsed)}* / *${fmtSize(s.diskTotal)}*\n` +
      `│  ◦ Free: *${fmtSize(s.diskTotal - s.diskUsed)}* (${diskPct}%)\n` +
      `╰───────⬣\n\n` +
      `╭─〔 🌐 *ɴᴇᴛᴡᴏʀᴋ* 〕───⬣\n` +
      `│  ◦ ${s.networkInterface}\n` +
      `│  ◦ ↓ *${fmtSize(s.networkRx)}* │ ↑ *${fmtSize(s.networkTx)}*\n` +
      `╰───────⬣\n\n` +
      `╭─〔 🗄 *ᴅᴀᴛᴀʙᴀsᴇ* 〕───⬣\n` +
      `│  ◦ Users: *${dbUsers}* │ Premium: *${dbPremium}*\n` +
      `│  ◦ Groups: *${dbGroups}*\n` +
      `╰───────⬣\n\n` +
      `╭─〔 ⏱ *ᴜᴘᴛɪᴍᴇ* 〕───⬣\n` +
      `│  ◦ Bot: *${s.uptimeBot}*\n` +
      `│  ◦ Server: *${s.uptimeServer}*\n` +
      `╰───────⬣\n\n` +
      `╭─〔 📈 *ᴘᴇʀꜰ ᴛʀᴀᴄᴇ* 〕───⬣\n` +
      `│  ◦ WA Roundtrip: *${waRoundtrip}ms*\n` +
      `│  ◦ CPU Sample: *${cpuSample}ms*\n` +
      `│  ◦ Canvas Render: *${canvasTime}ms*\n` +
      `│  ◦ GC Pause: *${gcPause}ms*\n` +
      `│  ◦ Total Exec: *${totalExec}ms*\n` +
      `│  ◦ Handles: *${s.activeHandles}* │ Req: *${s.activeRequests}*\n` +
      `╰───────⬣`;

    await sock.sendMessage(
      m.chat,
      {
        image: img,
        caption,
        contextInfo: {
          forwardingScore: 9999,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: saluranName,
            serverMessageId: 127,
          },
        },
      },
      { quoted: m },
    );

    await m.react("✅");
  } catch (error) {
    console.log(error);
    await m.react("☢");
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };

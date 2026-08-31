import axios from "axios";
import FormData from "form-data";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractToken(payload = {}) {
  return (
    payload?.token?.result?.token ||
    payload?.result?.token ||
    payload?.data?.result?.token ||
    payload?.data?.token ||
    payload?.result ||
    payload?.token ||
    null
  );
}

async function bypassCloudflare({
  url,
  mode = "turnstile-min",
  siteKey,
  timeout = 60000,
} = {}) {
  const endpoint = "https://kyuurzy.dev/tools/turnstile-min";
  const payload = {
    url: String(url),
    siteKey,
  };

  const { data } = await axios.get(endpoint, {
    params: payload,
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    },
    timeout,
  });

  return data;
}

async function live3d(
  imageBuffer,
  prompt = "Make this person the skin is very black, but skin tone still natural",
) {
  const bypassPayload = await bypassCloudflare({
    url: "https://www.createimg.com/change-skin-color/",
    siteKey: "0x4AAAAAABggkaHPwa2n_WBx",
  });

  const token = extractToken(bypassPayload);
  const cookies = bypassPayload?.result?.cookies || [];
  const cfClearance = cookies.find((c) => c.name === "cf_clearance")?.value;

  if (!token) throw new Error("Gagal mendapatkan Token.");

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
    Accept: "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://www.createimg.com",
    Referer: "https://www.createimg.com/change-skin-color/",
    Cookie: `pll_language=en${cfClearance ? `; cf_clearance=${cfClearance}` : ""}`,
    "X-Requested-With": "XMLHttpRequest",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    Priority: "u=4",
    Pragma: "no-cache",
    "Cache-Control": "no-cache",
  };

  const uuid = "d8ca3b2fce8fd289718953aa11a34682";

  const form = new FormData();
  form.append("token", token);
  form.append("uuid", uuid);
  form.append("prompt", prompt);
  form.append("negative", "");
  form.append("seed", "190703539");
  form.append("resolution", "hd");
  form.append("dimension", "portrait");
  form.append("image", imageBuffer, {
    filename: "blob",
    contentType: "image/webp",
  });
  form.append("module", "edit");

  const generateRes = await axios.post(
    "https://www.createimg.com/?generate=v1",
    form,
    { headers: { ...headers, ...form.getHeaders() } },
  );

  if (!generateRes.data.success) {
    throw new Error(generateRes.data.message || "Invalid Request");
  }

  const taskId = generateRes.data.id;

  let base64Result = null;
  for (let i = 0; i < 20; i++) {
    await sleep(5000);

    const outForm = new FormData();
    outForm.append("id", taskId);
    outForm.append("uuid", uuid);

    const outRes = await axios.post(
      "https://www.createimg.com/?output=v1",
      outForm,
      { headers: { ...headers, ...outForm.getHeaders() } },
    );

    if (outRes.data.success && outRes.data.message) {
      base64Result = outRes.data.message;
      break;
    }
  }

  if (!base64Result) throw new Error("Render timeout.");

  const base64Data = base64Result.replace(/^data:image\/\w+;base64,/, "");
  const image = Buffer.from(base64Data, "base64");

  return { image };
}

async function fluxImage(message, ratio = "1:1") {
  const response = await fetch("https://api.yuulabs.web.id/api/ai/flux-img", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      ratio,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.status || !data?.result?.url) {
    throw new Error(data?.message || data?.error || "Gagal membuat gambar");
  }

  return data.result;
}

export { live3d, fluxImage };

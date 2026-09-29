console.log("[BG] iniciou");
/* global XLSX */
importScripts("xlsx.full.min.js");

// Link de download da planilha de controle da contagem no SharePoint.
// Ajuste para o endereço do seu ambiente.
const DOWNLOAD_URL =
  "https://SEU-TENANT.sharepoint.com/sites/SEU-SITE/_layouts/15/download.aspx?SourceUrl=%2FShared%20Documents%2FCONTROLE_CONTAGEM_INVENTARIO.xlsx";

const CACHE_MINUTES = 30;

let cache = {
  builtAt: 0,
  set: null, // Set("ITEM|CONTAGEM")
};

function norm(v) {
  return String(v ?? "")
    .trim()
    .toUpperCase();
}

async function buildCache(force = false) {
  const now = Date.now();
  if (!force && cache.set && now - cache.builtAt < CACHE_MINUTES * 60 * 1000) {
    return cache.set;
  }

  const resp = await fetch(DOWNLOAD_URL, {
    method: "GET",
    credentials: "include", // usa sua sessão logada no SharePoint
  });
  console.log("[BG] status download:", resp.status, resp.ok);
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      `Falha ao baixar XLSX (${resp.status}). ${text.slice(0, 120)}`,
    );
  }

  const buf = await resp.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // tente achar a aba mais provável
  const preferred = [
    "Controle",
    "CONTROLE",
    "1° Contagem",
    "1º Contagem",
    "1ª Contagem",
  ];
  const wsName =
    preferred.find((n) => wb.SheetNames.includes(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[wsName];

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  if (!rows.length) throw new Error("Aba do Excel está vazia.");

  const header = rows[0].map((h) => norm(h));
  const idxItem = header.indexOf("ITEM");
  const idxCont = header.findIndex((h) =>
    [
      "1° CONTAGEM",
      "1º CONTAGEM",
      "1ª CONTAGEM",
      "1°CONTAGEM",
      "1ºCONTAGEM",
      "1ªCONTAGEM",
    ].includes(norm(h)),
  );

  if (idxItem < 0 || idxCont < 0) {
    throw new Error(
      `Não achei as colunas ITEM e 1° Contagem na aba "${wsName}".`,
    );
  }

  const s = new Set();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const item = norm(r[idxItem]);
    const cont = norm(r[idxCont]);
    if (item && cont) s.add(`${item}|${cont}`);
  }

  cache = { builtAt: now, set: s };
  return s;
}
console.log("[BG] cache pronto. linhas:", cache.set?.size);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "PING") return sendResponse({ ok: true, at: new Date().toISOString() });

      if (msg?.type === "REFRESH_CACHE") {
        await buildCache(true);
        return sendResponse({ ok: true });
      }

      if (msg?.type === "VALIDATE_PAIR") {
        const set = await buildCache(false);
        const key = `${norm(msg.item)}|${norm(msg.contagem)}`;
        return sendResponse({ ok: set.has(key) });
      }

      return sendResponse({ ok: false, reason: "Tipo inválido" });
    } catch (e) {
      return sendResponse({ ok: false, reason: e.message || String(e) });
    }
  })();

  return true;
});

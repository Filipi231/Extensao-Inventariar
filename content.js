;(() => {
  // Evita rodar duas vezes
  if (window.__INV_PAINTER__) return;
  window.__INV_PAINTER__ = true;

  const KEY_ENABLED = "invPainterEnabled";

  const COL_SALDO = 6; // [C:6]
  const COL_NOVA  = 7; // [C:7]

  const STYLE_ID = "__inv_painter_style__";
  let enabled = true;

  function parsePtNumber(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim();
    if (!s) return NaN;
    s = s.replace(/\s+/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function isNovaInput(el) {
    return (
      el &&
      el.tagName === "INPUT" &&
      typeof el.id === "string" &&
      el.id.includes(`[C:${COL_NOVA}]`) &&
      el.id.includes("[R:")
    );
  }

  function getSaldoInput(doc, novaInput) {
    const saldoId = novaInput.id.replace(`[C:${COL_NOVA}]`, `[C:${COL_SALDO}]`);
    return doc.getElementById(saldoId);
  }

  function ensureStyle(doc) {
    if (!doc || !doc.head) return;
    if (doc.getElementById(STYLE_ID)) return;

    const st = doc.createElement("style");
    st.id = STYLE_ID;
    st.textContent = `
      td[data-invpaint="ok"]{
        background-color: rgba(10,122,10,.15) !important;
        outline: 2px solid rgba(10,122,10,.90) !important;
        outline-offset: -2px !important;
      }
      td[data-invpaint="bad"]{
        background-color: rgba(176,0,32,.15) !important;
        outline: 2px solid rgba(176,0,32,.90) !important;
        outline-offset: -2px !important;
      }
      /* evita o input “lavar” o fundo do TD quando foca */
      td[data-invpaint] input,
      td[data-invpaint] input:focus{
        background: transparent !important;
      }
    `;
    doc.head.appendChild(st);
  }

  function clearPaintInDoc(doc) {
    if (!doc) return;
    doc.querySelectorAll('td[data-invpaint]').forEach((td) => {
      td.removeAttribute("data-invpaint");
      td.style.removeProperty("background-color");
      td.style.removeProperty("outline");
      td.style.removeProperty("outline-offset");
    });
  }

  function clearAllPaint() {
    const docs = getAllDocs();
    for (const doc of docs) clearPaintInDoc(doc);
    console.log(`[EXT] clearAll -> docs=${docs.length}`);
  }

  function setTd(td, state) {
    if (!td) return;
    if (!state) {
      td.removeAttribute("data-invpaint");
      td.style.removeProperty("background-color");
      td.style.removeProperty("outline");
      td.style.removeProperty("outline-offset");
      return;
    }
    td.setAttribute("data-invpaint", state); // ok | bad
  }

  function paintOne(doc, novaInput) {
    if (!enabled) return;
    if (!novaInput?.id) return;

    const td = novaInput.closest("td");
    if (!td) return;

    const v = (novaInput.value || "").trim();
    if (!v) return setTd(td, null);

    const saldoEl = getSaldoInput(doc, novaInput);
    const saldoRaw = saldoEl?.value ?? saldoEl?.getAttribute?.("value") ?? "";

    const nNova  = parsePtNumber(v);
    const nSaldo = parsePtNumber(saldoRaw);

    if (!Number.isFinite(nNova) || !Number.isFinite(nSaldo)) return setTd(td, null);

    const equal = Math.abs(nNova - nSaldo) < 0.0001;
    setTd(td, equal ? "ok" : "bad");
  }

  // pega documento principal + iframes same-origin
  function getAllDocs() {
    const docs = [];
    const push = (d) => d && !docs.includes(d) && docs.push(d);

    push(document);

    const iframes = Array.from(document.querySelectorAll("iframe"));
    for (const f of iframes) {
      try {
        const d = f.contentDocument;
        if (d) push(d);
      } catch (_) {}
    }
    return docs;
  }

  function paintAll() {
    if (!enabled) return;
    const docs = getAllDocs();
    let total = 0;

    for (const doc of docs) {
      ensureStyle(doc);

      const list = doc.querySelectorAll(`input[id*="[C:${COL_NOVA}]"][id*="[R:"]`);
      for (const el of list) {
        if (!isNovaInput(el)) continue;
        paintOne(doc, el);
        total++;
      }
    }
    console.log(`[EXT] paintAll -> ${total} inputs (docs=${docs.length})`);
  }

  // listeners em cada doc (principal + iframes)
  function bindListeners(doc) {
    if (!doc || doc.__INV_PAINTER_BINDED__) return;
    doc.__INV_PAINTER_BINDED__ = true;

    ensureStyle(doc);

    const evts = ["input", "change", "keyup", "focusin", "click"];
    for (const type of evts) {
      doc.addEventListener(
        type,
        (e) => {
          if (!enabled) return;

          const t = e.target;

          if (isNovaInput(t)) {
            paintOne(doc, t);
            setTimeout(() => paintOne(doc, t), 0);
            setTimeout(() => paintOne(doc, t), 50);
            return;
          }

          const td = t?.closest?.("td");
          const inside = td?.querySelector?.(`input[id*="[C:${COL_NOVA}]"][id*="[R:"]`);
          if (inside && isNovaInput(inside)) {
            paintOne(doc, inside);
            setTimeout(() => paintOne(doc, inside), 0);
            setTimeout(() => paintOne(doc, inside), 50);
          }
        },
        true
      );
    }

    // re-render do sistema: repinta com debounce
    let timer = null;
    const mo = new MutationObserver(() => {
      if (!enabled) return;
      clearTimeout(timer);
      timer = setTimeout(paintAll, 80);
    });
    mo.observe(doc.documentElement, { childList: true, subtree: true });
  }

  function bindAllDocs() {
    const docs = getAllDocs();
    for (const d of docs) bindListeners(d);
  }

  function setEnabled(next) {
    enabled = !!next;
    console.log(`[EXT] enabled = ${enabled}`);
    if (!enabled) {
      clearAllPaint();
    } else {
      bindAllDocs();
      paintAll();
    }
    
    // Salva no storage quando muda
    chrome.storage.sync.set({ [KEY_ENABLED]: enabled });
  }

  // --- CORREÇÃO: Mensagens do popup ---
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log("[EXT] Mensagem recebida:", msg);
    
    if (msg.action === "getState") {
      sendResponse({ painterOn: enabled ? "1" : "0" });
    }
    
    else if (msg.action === "toggle") {
      setEnabled(msg.value);
      sendResponse({ success: true, enabled: enabled });
    }
    
    else if (msg.action === "repaint") {
      if (enabled) {
        paintAll();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: "Pintura não está ativa" });
      }
    }
    
    return true; // Necessário para resposta assíncrona
  });

  // boot: lê storage e inicia
  console.log("[EXT] Inventario Painter carregado ✅");
  
  chrome.storage.sync.get([KEY_ENABLED], (res) => {
    const startEnabled = res[KEY_ENABLED] !== false; // default ON
    setEnabled(startEnabled);
  });

  bindAllDocs();

  // se novos iframes aparecerem depois, rebinda
  let raf = false;
  const moTop = new MutationObserver(() => {
    if (!enabled) return;
    if (raf) return;
    raf = true;
    requestAnimationFrame(() => {
      raf = false;
      bindAllDocs();
      paintAll();
    });
  });
  moTop.observe(document.documentElement, { childList: true, subtree: true });

  // debug útil no console
  window.__invPainter = {
    paintAll,
    clearAllPaint,
    setEnabled: (v) => setEnabled(v),
    get enabled() { return enabled; }
  };
})();
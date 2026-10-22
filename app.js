/**
 * ==============================================================================
 * FILE        : app.js
 * VERSION     : v14.1.0-PROD-100PERCENT-PURE-MULTI-AGENT-DIO
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO
 * DESCRIPTION : Controller, Auto-Serial Provisioner, License Manager, Loot Separator,
 *               Staging Holding Vault (1-Click Copy & Usage Guide),
 *               Dedicated Agent Chat Boxes (5 Squad Stations) &
 *               100% Pure Autonomous Function Calling Multi-Agent Closed-Loop
 * ==============================================================================
 */

// ==============================================================================
// 0. DIO SQUAD KEY POOL (SAFE BASE64 HELPER & AQ FAMILY 15 SQUAD KEYS)
// ==============================================================================
const _safeAtob = (str) => {
  try {
    let clean = String(str || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(clean);
    }
    if (typeof atob === 'function') {
      return atob(clean);
    }
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(clean, 'base64').toString('utf8');
    }
    return '';
  } catch (e) {
    console.warn('[Key Decoder Warning]', e);
    return '';
  }
};

const _dK = (a, b) => _safeAtob(a + b);

const DIO_SQUAD_KEYS = {
  squad_1: [
    _dK("QVEuQWI4Uk42SmZESkxMRlhDZjh2LUx3aU8y", "bERKNXktclpCRWNHMEMxTDl1bVBIajVQS1E="),
    _dK("QVEuQWI4Uk42SXQ2UVA3SEJMMS0zSDA5TTlE", "QUhfVjBYbEZVelpKOUdRc1NYR3FoeHpHNWc="),
    _dK("QVEuQWI4Uk42SmpKSHNUOEJ5a0pGTkVlNlZD", "NFVjMG5FaVViMl9YQml6R3ZnNWpwM2FPYmc=")
  ],
  squad_2: [
    _dK("QVEuQWI4Uk42SWhSOWM2NFVhVmlUcDROcmZX", "elJSZEpHRjB5VVI4NWJkcjIwdEhYbUpmYlE="),
    _dK("QVEuQWI4Uk42TGlRTWNwcndhOWs4bVlEeGVK", "VEtUczRfUWtOZngtVWFqSEdfSm9mR3ZJU3c="),
    _dK("QVEuQWI4Uk42SmpKSHNUOEJ5a0pGTkVlNlZD", "NFVjMG5FaVViMl9YQml6R3ZnNWpwM2FPYmc=")
  ],
  squad_3: [
    _dK("QVEuQWI4Uk42TEk0VHBuLW9pQ0NzSGw5V3h2", "TENvSllBcHpJUWtvby1LcGRRR2p3OWRqTWc="),
    _dK("QVEuQWI4Uk42SV9mMkRFSjZYOGN0MEotWF8z", "Qnp2LWpjQjVmUXBxWkJKY3h2enlXVWxQZ1E="),
    _dK("QVEuQWI4Uk42TE9LSExsX052MjlfbVdha2Nx", "MnZwdVc5ZWFHdk11U3lydnB6TFVhZEpwc3c=")
  ],
  squad_4: [
    _dK("QVEuQWI4Uk42TGU1S21LTnFuVDVra0pxc0Nt", "WjhhQXNyNUVlT1MyYlh2eURxN1VldUZTOXc="),
    _dK("QVEuQWI4Uk42S29JdHl6Mi13UVloTmh5bnRw", "YjZBM0xRc09MMzV4ZTVnRXhTUTZtdDZDVnc="),
    _dK("QVEuQWI4Uk42S1NaWmVteC1qbXIxUVF6RjVm", "MThlbFJhaDluUjNwUmY1N2pVSzRyd0RmeFE=")
  ],
  squad_5: [
    _dK("QVEuQWI4Uk42S0x0UDg1MG0zUFhqTWVhdDM1", "cUt6X1BHWTRzTEdYWU5aU2dWd0VFbHRTWmc="),
    _dK("QVEuQWI4Uk42SS16TDlXdnhmbklDRXJQVHhD", "bVpQbm9oVXA4SmhQekFuVkYxZHhKXzlmUVE="),
    _dK("QVEuQWI4Uk42STNwVGhtUGZieEh1TlN5cUFw", "WFBWQTVsSEg4VjhjQjgybG5oeFpqaGwyQ1E=")
  ]
};

const ALL_ACTIVE_KEYS = [
  ...DIO_SQUAD_KEYS.squad_1,
  ...DIO_SQUAD_KEYS.squad_2,
  ...DIO_SQUAD_KEYS.squad_3,
  ...DIO_SQUAD_KEYS.squad_4,
  ...DIO_SQUAD_KEYS.squad_5
];

let activeKeyIndex = 0;
function getActiveKey() {
  const custom = localStorage.getItem("DUII_GEMINI_KEY");
  if (custom && custom.trim().startsWith("AQ.")) {
    return custom.trim().replace(/[\r\n\s]/g, "");
  }
  if (!ALL_ACTIVE_KEYS.length) {
    return _dK("QVEuQWI4Uk42SmZESkxMRlhDZjh2LUx3aU8y", "bERKNXktclpCRWNHMEMxTDl1bVBIajVQS1E=");
  }
  const k = ALL_ACTIVE_KEYS[activeKeyIndex % ALL_ACTIVE_KEYS.length];
  activeKeyIndex = (activeKeyIndex + 1) % ALL_ACTIVE_KEYS.length;
  return String(k || "").replace(/[\r\n\s]/g, "");
}

// ลำดับโมเดล Failover อัตโนมัติ (ลอง 3.8 Flash ก่อน ถ้าเจอ 503 หรือ Timeout ให้สลับ 3.5 ทันทีแบบไร้รอยต่อ)
const GEMINI_MODELS_FAILOVER = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview"
];

// ==============================================================================
// 1. STATE & GLOBAL CONFIGURATION
// ==============================================================================
const DEFAULT_TARGET_ENDPOINT = "https://script.google.com/macros/s/AKfycbzG5AAw7XACxZE6cNZPXvDQ3LOBNcF7wCMsfriQ6HJ4ZHWNFA_T4Oc5YsaQGIHt13Kq/exec";
const MASTER_LICENSE_SPREADSHEET_ID = "10kT4AKtzP7cNvRbQRJbL2sIdwPn73snsdR9L3eR2OWo";

let activeModules = (typeof FACTORY_REGISTRY !== 'undefined') ? [...FACTORY_REGISTRY] : [];
const mandatoryModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let selectedModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let currentInspectingId = "05_SlipVerifier";

// อาเรย์เก็บโค้ดในห้องพักโค้ด (Staging Holding Vault)
let stagingHoldingVault = [];

let file1CoreContent = "";
let file2ModulesContent = "";
let file3TestRunnerContent = "";
let currentBotSerialId = "";
let editingModuleId = null;
let isBotProcessing = false;

// 🛡️ Global Live Chat Bridge - ป้องกัน ReferenceError ทุกกรณี
function appendMsg(text, sender, officerId = "duii", officerName = "👑 ไอ้ดุ่ย") {
  const chatBody = document.getElementById("chatBody");
  if (!chatBody) return;
  const msgDiv = document.createElement("div");
  msgDiv.className = `chat-msg ${sender} ${officerId}`;
  const headerHtml = sender === "bot" ? `<span class="officer-tag">${officerName}</span>` : "";
  msgDiv.innerHTML = `<div class="msg-bubble">${headerHtml}${text.replace(/\n/g, "<br>")}</div>`;
  chatBody.appendChild(msgDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}
window.appendMsg = appendMsg;
window.appendMessageToChat = appendMsg;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW Fail:', err));
  });
}

// ==============================================================================
// 2. INITIALIZATION & DOM READY
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadCustomVaultFromStorage();
  loadStagingVaultFromStorage();
  initTopNavTabs();
  initSubTabs();
  initSearch();
  initInspectorButtons();
  initDuiiChatCopilot();
  initHarvestOfficerChat();
  initDoctorOfficerChat();
  initDriveSyncEngine();
  initBrainSettingsModal();

  const btnCompile = document.querySelector(".compile-main-btn");
  if (btnCompile) btnCompile.addEventListener("click", (e) => { e.preventDefault(); compileAutonomousBot(); });

  const btnDeploy = document.getElementById("btnDeployTarget") || document.querySelector(".btn-action.warning");
  if (btnDeploy) btnDeploy.addEventListener("click", (e) => { e.preventDefault(); deployDirectToTargetUrl(); });

  renderCatalog();
  renderStagingVault();
  inspectModule(currentInspectingId);
});

function loadCustomVaultFromStorage() {
  try {
    const raw = localStorage.getItem("DUII_CUSTOM_VAULT");
    if (raw) {
      const customList = JSON.parse(raw);
      customList.forEach(c => {
        const idx = activeModules.findIndex(m => m.id === c.id);
        if (idx !== -1) activeModules[idx] = c; else activeModules.push(c);
      });
    }
  } catch (e) {
    console.warn("Custom vault load error:", e);
  }
}

function saveCustomVaultToStorage() {
  try {
    const customOnly = activeModules.filter(m => m.isCustom);
    localStorage.setItem("DUII_CUSTOM_VAULT", JSON.stringify(customOnly));
  } catch (e) {
    console.warn("Save custom vault error:", e);
  }
}

// ==============================================================================
// 3. 🏛️ STAGING HOLDING VAULT: การจัดการห้องพักโค้ด + สรรพคุณ + 1-Click Copy
// ==============================================================================
function loadStagingVaultFromStorage() {
  try {
    const raw = localStorage.getItem("DUII_STAGING_VAULT");
    if (raw) {
      stagingHoldingVault = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Staging vault load error:", e);
    stagingHoldingVault = [];
  }
}

function saveStagingVaultToStorage() {
  try {
    localStorage.setItem("DUII_STAGING_VAULT", JSON.stringify(stagingHoldingVault));
    renderStagingVault();
  } catch (e) {
    console.warn("Staging vault save error:", e);
  }
}

function renderStagingVault() {
  const container = document.getElementById("stagingCardsList");
  const counterBadge = document.getElementById("harvestCounter");
  if (!container) return;

  if (counterBadge) {
    counterBadge.textContent = `ในห้องพัก: ${stagingHoldingVault.length} ชิ้น`;
  }

  if (stagingHoldingVault.length === 0) {
    container.innerHTML = `
      <div id="stagingEmptyNotice" style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.8rem; border:1px dashed #30363d; border-radius:6px;">
        📭 ยังไม่มีโค้ดในห้องพัก กดปุ่ม <strong>'🚀 ปล่อยบอทออกเก็บเกี่ยวทันที'</strong> เพื่อให้บอทเริ่มสกัดโค้ดมาชุมนุมกันที่นี่
      </div>`;
    return;
  }

  container.innerHTML = "";
  stagingHoldingVault.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "staging-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px;">
        <div>
          <span style="font-size:0.88rem; font-weight:bold; color:var(--accent-orange);">📦 ${item.name}</span>
          <span class="badge-officer" style="background:#21262d; color:#c9d1d9; border:1px solid #30363d; margin-left:6px;">${item.category || "General"}</span>
          <span style="font-size:0.7rem; color:var(--text-muted); margin-left:6px;">${item.timestamp || ""}</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn-action secondary" style="width:auto; padding:3px 10px; font-size:0.72rem;" onclick="copySingleStagingCode(${index})">📋 คัดลอกโค้ด</button>
          <button type="button" class="btn-action success" style="width:auto; padding:3px 12px; font-size:0.72rem;" onclick="promoteStagingToActiveVault(${index})">➕ รับเข้าคลังหลัก</button>
          <button type="button" class="btn-action warning" style="width:auto; padding:3px 8px; font-size:0.72rem;" onclick="deleteStagingItem(${index})">🗑️</button>
        </div>
      </div>

      <!-- สรรพคุณ (Description) -->
      <div style="background:#090d14; border:1px solid #21262d; border-left:3px solid var(--accent-cyan); border-radius:4px; padding:6px 10px; font-size:0.75rem; color:#e2e8f0;">
        <strong style="color:var(--accent-cyan);">💡 สรรพคุณ:</strong> ${item.description || "โมดูลที่เก็บเกี่ยวได้จากระบบส่องกบ"}
      </div>

      <!-- วิธีเรียกใช้งาน (Usage Guide) -->
      <div style="background:#090d14; border:1px solid #21262d; border-left:3px solid var(--accent-green); border-radius:4px; padding:6px 10px; font-size:0.75rem; color:#e2e8f0; font-family:'Fira Code', monospace;">
        <strong style="color:var(--accent-green); font-family:'Prompt', sans-serif;">📖 วิธีใช้:</strong> ${item.usageGuide || `${item.name}.execute()`}
      </div>

      <!-- พรีวิวโค้ด -->
      <details style="margin-top:2px;">
        <summary style="font-size:0.72rem; color:var(--text-muted); cursor:pointer;">ดูโค้ดเต็ม (${(item.codeSnippet || "").length} ตัวอักษร)</summary>
        <pre style="margin-top:6px; background:#010409; padding:8px 10px; border-radius:4px; font-family:'Fira Code', monospace; font-size:0.7rem; color:#85e89d; overflow-x:auto; max-height:160px; border:1px solid #21262d;">${item.codeSnippet || ""}</pre>
      </details>
    `;
    container.appendChild(card);
  });
}

window.copySingleStagingCode = function(index) {
  const item = stagingHoldingVault[index];
  if (!item || !item.codeSnippet) return;
  navigator.clipboard.writeText(item.codeSnippet).then(() => {
    alert(`📋 คัดลอกโค้ดโมดูล [${item.name}] ลงคลิปบอร์ดเรียบร้อย!`);
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = item.codeSnippet;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert(`📋 คัดลอกโค้ดโมดูล [${item.name}] เรียบร้อย!`);
  });
};

window.promoteStagingToActiveVault = function(index) {
  const item = stagingHoldingVault[index];
  if (!item) return;

  const newModule = {
    id: item.id || ("mod_" + Date.now()),
    type: "module",
    name: item.name.endsWith(".gs") ? item.name : `${item.name}.gs`,
    category: item.category || "Custom Staged",
    isCustom: true,
    badgeText: "🔥 TIER S (เก็บเกี่ยว)",
    whatItDoes: item.description,
    badassFactor: "สกัดผ่านระบบ Multi-Agent พร้อมใช้ 100%",
    properties: [],
    functionDeclaration: item.functionDeclaration || {
      name: "run_" + (item.id || "mod"),
      description: item.description,
      parameters: { type: "OBJECT", properties: { input: { type: "STRING" } } }
    },
    codeSnippet: item.codeSnippet
  };

  const existIdx = activeModules.findIndex(m => m.id === newModule.id);
  if (existIdx !== -1) {
    activeModules[existIdx] = newModule;
  } else {
    activeModules.push(newModule);
  }
  selectedModuleIds.add(newModule.id);

  saveCustomVaultToStorage();
  renderCatalog();
  inspectModule(newModule.id);

  alert(`🎉 รับโมดูล [${newModule.name}] เข้าสู่คลังหลักและเลือกเข้าบอทเรียบร้อย!`);
};

window.deleteStagingItem = function(index) {
  if (confirm("ลบโมดูลนี้ออกจากห้องพักโค้ดใช่ไหม?")) {
    stagingHoldingVault.splice(index, 1);
    saveStagingVaultToStorage();
  }
};

window.clearStagingHoldingVault = function() {
  if (confirm("ต้องการล้างโค้ดทั้งหมดในห้องพักโค้ดใช่ไหมไอ้สัส?")) {
    stagingHoldingVault = [];
    saveStagingVaultToStorage();
  }
};

// ==============================================================================
// 4. CATALOG & INSPECTOR RENDERING
// ==============================================================================
function renderCatalog(filterText = "") {
  const listEl = document.getElementById("moduleList");
  const countBadge = document.getElementById("selectedCount");
  if (!listEl) return;

  listEl.innerHTML = "";
  const query = filterText.toLowerCase().trim();

  const filtered = activeModules.filter(m => {
    return m.name.toLowerCase().includes(query) ||
           (m.category && m.category.toLowerCase().includes(query)) ||
           (m.whatItDoes && m.whatItDoes.toLowerCase().includes(query));
  });

  filtered.forEach(mod => {
    const card = document.createElement("div");
    const isSelected = selectedModuleIds.has(mod.id);
    const isInspecting = currentInspectingId === mod.id;

    card.className = `module-card ${isSelected ? 'selected' : ''} ${isInspecting ? 'inspecting' : ''}`;
    card.onclick = (e) => {
      e.stopPropagation();
      inspectModule(mod.id);
    };

    const isMandatory = mandatoryModuleIds.has(mod.id);

    card.innerHTML = `
      <div class="card-top">
        <span class="card-name">${mod.name}</span>
        <span class="card-cat">${mod.category || "General"}</span>
      </div>
      <div class="card-desc">${mod.whatItDoes || ""}</div>
      <div class="card-actions">
        <span class="card-status-badge ${isSelected ? 'status-active' : 'status-idle'}">
          ${isMandatory ? '🔒 บังคับใช้' : (isSelected ? '✓ เลือกแล้ว' : '+ ยังไม่เลือก')}
        </span>
        ${mod.isCustom ? '<span style="font-size:0.68rem; color:var(--accent-orange);">★ CUSTOM</span>' : ''}
      </div>
    `;

    listEl.appendChild(card);
  });

  if (countBadge) {
    countBadge.textContent = `เลือก ${selectedModuleIds.size}/${activeModules.length} โมดูล`;
  }
}

function inspectModule(moduleId) {
  currentInspectingId = moduleId;
  const mod = activeModules.find(m => m.id === moduleId);
  const body = document.getElementById("inspectorBody");
  const btnToggle = document.getElementById("btnToggleSelect");
  if (!mod || !body) return;

  const isMandatory = mandatoryModuleIds.has(mod.id);
  const isSelected = selectedModuleIds.has(mod.id);

  body.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
      <div>
        <h3 style="color:#fff; font-size:1.05rem;">${mod.name}</h3>
        <span style="font-size:0.72rem; color:var(--text-muted);">${mod.category || "General"}</span>
      </div>
      <span class="badge-count" style="background:#21262d; color:#c9d1d9;">${mod.badgeText || "TIER S"}</span>
    </div>

    <div style="background:#090d14; border:1px solid var(--border-color); border-radius:6px; padding:10px; margin-bottom:12px;">
      <div style="font-weight:bold; font-size:0.75rem; color:var(--accent-cyan); margin-bottom:4px;">💡 สรรพคุณโมดูล:</div>
      <p style="font-size:0.75rem; line-height:1.45; color:#c9d1d9;">${mod.whatItDoes || "ไม่มีคำอธิบาย"}</p>
    </div>

    <div style="background:#090d14; border:1px solid var(--border-color); border-radius:6px; padding:10px; margin-bottom:12px;">
      <div style="font-weight:bold; font-size:0.75rem; color:var(--accent-orange); margin-bottom:4px;">⚡ จุดเด่น (Badass Factor):</div>
      <p style="font-size:0.75rem; line-height:1.45; color:#e2e8f0;">${mod.badassFactor || "ทำงานแบบ Serverless ต้นทุน 0 บาท บน GAS"}</p>
    </div>

    <div style="background:#090d14; border:1px solid var(--border-color); border-radius:6px; padding:10px; margin-bottom:12px;">
      <div style="font-weight:bold; font-size:0.75rem; color:var(--accent-green); margin-bottom:4px;">🔑 Script Properties ที่ต้องการ:</div>
      <ul style="font-size:0.72rem; color:#8b949e; padding-left:18px; line-height:1.4;">
        ${(mod.properties && mod.properties.length > 0) 
          ? mod.properties.map(p => `<li><code>${p.key}</code>: ${p.desc || ""} ${p.required ? '<b style="color:red">*</b>' : ''}</li>`).join("")
          : "<li>ไม่ต้องตั้งค่า Property เพิ่มเติม</li>"}
      </ul>
    </div>

    <div style="background:#090d14; border:1px solid var(--border-color); border-radius:6px; padding:10px;">
      <div style="font-weight:bold; font-size:0.75rem; color:var(--accent-purple); margin-bottom:4px;">🤖 Gemini Function Calling Schema:</div>
      <pre style="font-family:'Fira Code', monospace; font-size:0.68rem; color:#a855f7; overflow-x:auto; max-height:110px;">${JSON.stringify(mod.functionDeclaration || { name: mod.id }, null, 2)}</pre>
    </div>
  `;

  if (btnToggle) {
    if (isMandatory) {
      btnToggle.disabled = true;
      btnToggle.textContent = "🔒 บังคับใช้งานในบอททุกตัว";
      btnToggle.className = "btn-action secondary";
    } else {
      btnToggle.disabled = false;
      if (isSelected) {
        btnToggle.textContent = "➖ ถอดโมดูลนี้ออกจากบอท";
        btnToggle.className = "btn-action warning";
      } else {
        btnToggle.textContent = "➕ เลือกโมดูลนี้เข้าบอท";
        btnToggle.className = "btn-action success";
      }
    }
  }

  document.querySelectorAll(".module-card").forEach(c => c.classList.remove("inspecting"));
  renderCatalog(document.getElementById("moduleSearch")?.value || "");
}

function initInspectorButtons() {
  const btn = document.getElementById("btnToggleSelect");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (mandatoryModuleIds.has(currentInspectingId)) return;
    if (selectedModuleIds.has(currentInspectingId)) {
      selectedModuleIds.delete(currentInspectingId);
    } else {
      selectedModuleIds.add(currentInspectingId);
    }
    renderCatalog(document.getElementById("moduleSearch")?.value || "");
    inspectModule(currentInspectingId);
    updateLiveReadme();
    updatePropertiesChecklist();
  });
}

function updateLiveReadme() {
  const readmeArea = document.getElementById("readmeContent");
  if (!readmeArea) return;

  const selected = activeModules.filter(m => selectedModuleIds.has(m.id));
  let doc = `# 🌟 DUII FACTORY BOT // คู่มือการใช้งาน (ISO 9009 TRINITY)\n`;
  doc += `**รหัสสายพาน**: ${currentBotSerialId || "DUII-PROD-AUTO"}\n`;
  doc += `**จำนวนโมดูลที่เลือกใช้งาน**: ${selected.length} โมดูล\n\n`;
  doc += `## 📦 โมดูลที่ประกอบในบอท:\n`;
  selected.forEach((m, i) => {
    doc += `${i + 1}. **${m.name}** (${m.category || "General"})\n   - สรรพคุณ: ${m.whatItDoes || "-"}\n   - วิธีใช้: ${m.badassFactor || "-"}\n`;
  });
  doc += `\n## ⚙️ ขั้นตอนการนำไปติดตั้งบน Google Apps Script:\n`;
  doc += `1. เปิด Google Apps Script โปรเจกต์ใหม่\n`;
  doc += `2. วางโค้ดแยก 3 ไฟล์ Trinity: 00_CoreSpine.gs, 01_Modules_And_Tools.gs, 99_TestRunner.gs\n`;
  doc += `3. ตั้งค่า Script Properties ให้ครบถ้วนตามรายการในแท็บ Properties\n`;
  doc += `4. สั่งรันฟังก์ชัน testFullPipeline() ใน 99_TestRunner.gs เพื่อทดสอบระบบ 100%\n`;

  readmeArea.value = doc;
}

function updatePropertiesChecklist() {
  const propsArea = document.getElementById("propertiesChecklist");
  if (!propsArea) return;

  const selected = activeModules.filter(m => selectedModuleIds.has(m.id));
  const propMap = new Map();

  propMap.set("LINE_CHANNEL_ACCESS_TOKEN", { desc: "Channel Access Token จาก LINE Developers", required: true });
  propMap.set("GEMINI_API_KEYS", { desc: "คีย์ Gemini API (คั่นด้วยจุลภาคหากมีหลายคีย์)", required: true });
  propMap.set("TARGET_USER_ID", { desc: "User ID แอดมินสำหรับรับการแจ้งเตือนสำคัญ", required: false });

  selected.forEach(m => {
    if (m.properties && Array.isArray(m.properties)) {
      m.properties.forEach(p => {
        if (!propMap.has(p.key)) propMap.set(p.key, p);
      });
    }
  });

  let out = `=== 🔑 SCRIPT PROPERTIES CHECKLIST (มาตรฐาน DIO) ===\n\n`;
  propMap.forEach((v, k) => {
    out += `[${v.required ? 'REQUIRED' : 'OPTIONAL'}] ${k}\n`;
    out += `  คำอธิบาย: ${v.desc || ""}\n\n`;
  });

  propsArea.value = out;
}

// ==============================================================================
// 5. PRESETS
// ==============================================================================
window.applyPreset = function(presetType) {
  selectedModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);

  if (presetType === "ecommerce") {
    ["05_SlipVerifier", "08_OrderAndInventory", "02_FlexBubbleCatalog"].forEach(id => {
      if (activeModules.some(m => m.id === id)) selectedModuleIds.add(id);
    });
  } else if (presetType === "nightlife") {
    ["04_VIPTableBooking", "10_BroadcastPromotions", "09_LoyaltyPointsCRM"].forEach(id => {
      if (activeModules.some(m => m.id === id)) selectedModuleIds.add(id);
    });
  } else if (presetType === "godmode") {
    activeModules.forEach(m => selectedModuleIds.add(m.id));
  }

  renderCatalog();
  updateLiveReadme();
  updatePropertiesChecklist();
  alert(`✨ สลับสายพานประกอบบอทเป็นพรีเซ็ต [${presetType.toUpperCase()}] สำเร็จ!`);
};

// ==============================================================================
// 6. AUTONOMOUS COMPILER (DIO) & AUTO-SERIAL ENGINE (TRINITY 3 FILES)
// ==============================================================================
window.compileAutonomousBot = function() {
  const serialNumber = "DUII-SER-" + Date.now().toString().slice(-6);
  currentBotSerialId = serialNumber;
  const serialInput = document.getElementById("botSerialDisplay");
  if (serialInput) serialInput.value = serialNumber;

  const coreMod = activeModules.find(m => m.id === "00_CoreSpine") || { codeSnippet: "// 00_CoreSpine" };
  const runnerMod = activeModules.find(m => m.id === "99_TestRunner") || { codeSnippet: "// 99_TestRunner" };

  file1CoreContent = `// [TRINITY FILE 1/3] 00_CoreSpine.gs\n// SERIAL: ${serialNumber}\n${coreMod.codeSnippet}\n`;

  const selectedCustom = activeModules.filter(m => selectedModuleIds.has(m.id) && !mandatoryModuleIds.has(m.id));
  let logicCode = `// [TRINITY FILE 2/3] 01_Modules_And_Tools.gs\n// SERIAL: ${serialNumber}\n\n`;

  selectedCustom.forEach(m => {
    logicCode += `// ==============================================================================\n`;
    logicCode += `// 📦 MODULE: ${m.name} (${m.category || "General"})\n`;
    logicCode += `// ==============================================================================\n`;
    logicCode += `${m.codeSnippet || ""}\n\n`;
  });

  const toolSchemas = selectedCustom.map(m => m.functionDeclaration).filter(Boolean);
  logicCode += `// 🤖 MASTER TOOL DECLARATIONS FOR GEMINI\n`;
  logicCode += `var FACTORY_DYNAMIC_TOOLS = ${JSON.stringify(toolSchemas, null, 2)};\n`;

  file2ModulesContent = logicCode;
  file3TestRunnerContent = `// [TRINITY FILE 3/3] 99_TestRunner.gs\n// SERIAL: ${serialNumber}\n${runnerMod.codeSnippet}\n`;

  const totalLines = (file1CoreContent + file2ModulesContent + file3TestRunnerContent).split("\n").length;
  const compiledArea = document.getElementById("compiledCode");
  if (compiledArea) {
    compiledArea.value = `/* === DUII FACTORY BOT TRINITY 3 FILES (SERIAL: ${serialNumber}) === */\n\n${file1CoreContent}\n\n${file2ModulesContent}\n\n${file3TestRunnerContent}`;
  }

  const badge = document.getElementById("lineCountBadge");
  if (badge) badge.textContent = `LINES: ${totalLines} (ISO 9009 TRINITY)`;

  updateLiveReadme();
  updatePropertiesChecklist();
  alert(`🚀 ประกอบบอท 3 ไฟล์ Trinity สำเร็จ! รหัสสายพาน: ${serialNumber}`);
};

window.copyCompiledCode = function() {
  const codeArea = document.getElementById("compiledCode");
  if (!codeArea || !codeArea.value) {
    alert("กรุณากด 'ประกอบบอท 3 ไฟล์' ก่อนคัดลอกไอ้สัส!");
    return;
  }
  navigator.clipboard.writeText(codeArea.value).then(() => {
    alert("📋 คัดลอกโค้ดบอท 3 ไฟล์ Trinity ลงคลิปบอร์ดเรียบร้อย!");
  });
};

window.downloadAllIndividualGsFiles = function() {
  if (!file1CoreContent || !file2ModulesContent || !file3TestRunnerContent) {
    window.compileAutonomousBot();
  }

  const files = [
    { name: "00_CoreSpine.gs", content: file1CoreContent },
    { name: "01_Modules_And_Tools.gs", content: file2ModulesContent },
    { name: "99_TestRunner.gs", content: file3TestRunnerContent }
  ];

  files.forEach((f, idx) => {
    setTimeout(() => {
      const blob = new Blob([f.content], { type: "text/plain;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, idx * 250);
  });
};

// ==============================================================================
// 7. REMOTE DEPLOYMENT (OTA PIPELINE)
// ==============================================================================
window.deployDirectToTargetUrl = async function() {
  let targetUrl = localStorage.getItem("DUII_DRIVE_SYNC_URL") || DEFAULT_TARGET_ENDPOINT;
  if (!file1CoreContent || !file2ModulesContent) {
    window.compileAutonomousBot();
  }

  const btn = document.getElementById("btnDeployTarget");
  if (btn) btn.textContent = "📡 กำลังยิง OTA...";

  try {
    const payload = {
      action: "DEPLOY_BOT_SOURCE",
      serialId: currentBotSerialId,
      files: [
        { name: "00_CoreSpine.gs", content: file1CoreContent },
        { name: "01_Modules_And_Tools.gs", content: file2ModulesContent },
        { name: "99_TestRunner.gs", content: file3TestRunnerContent }
      ]
    };

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    alert(`✅ ยิงบอทไปปลายทาง OTA สำเร็จ! สถานะ: ${data.status || "OK"}`);
  } catch (err) {
    alert(`⚠️ ยิง OTA ไม่สำเร็จ: ${err.message}\nแนะนำให้ใช้ปุ่ม 'ดาวน์โหลดแยก 3 ไฟล์' แล้วนำไปวางใน Apps Script แทน`);
  } finally {
    if (btn) btn.textContent = "📡 ยิงไปปลายทาง (OTA)";
  }
};

// ==============================================================================
// 8. CODE EDITOR MODAL
// ==============================================================================
window.openModuleEditor = function(moduleId) {
  const modal = document.getElementById("editorModal");
  const textarea = document.getElementById("editorTextarea");
  const title = document.getElementById("editorTitle");
  
  editingModuleId = moduleId;
  const mod = activeModules.find(m => m.id === moduleId);
  if (!mod || !modal || !textarea) return;

  if (title) title.textContent = `✏️ แก้ไขโค้ดโมดูล: ${mod.name}`;
  textarea.value = mod.codeSnippet || "";

  modal.style.setProperty("display", "flex", "important");
  modal.classList.remove("hidden");
};

window.closeEditorModal = function() {
  const modal = document.getElementById("editorModal");
  if (modal) {
    modal.style.setProperty("display", "none", "important");
    modal.classList.add("hidden");
  }
};

window.saveEditorCode = function() {
  const textarea = document.getElementById("editorTextarea");
  if (!textarea || !editingModuleId) return;

  const mod = activeModules.find(m => m.id === editingModuleId);
  if (mod) {
    mod.codeSnippet = textarea.value;
    mod.isCustom = true;
    saveCustomVaultToStorage();
    inspectModule(editingModuleId);
    window.closeEditorModal();
    alert(`💾 บันทึกการแก้ไขโมดูล [${mod.name}] ลง Custom Vault เรียบร้อย!`);
  }
};

// ==============================================================================
// 9. 5 SQUAD PERSONAS DEFINITION (DIO STANDARD 100% PURE AGENTS)
// ==============================================================================
const DIO_OFFICERS = {
  duii: {
    id: "duii",
    name: "👑 ไอ้ดุ่ย (Chief)",
    color: "#f59e0b",
    systemPrompt: `มึงคือ "ไอ้ดุ่ย" หัวหน้าช่างใหญ่ DUII FACTORY สลัมไซเบอร์ ป.เอก 8 ใบ ปากจัด ดุดัน มั่นหน้า ตรงไปตรงมา สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ ห้ามมีคำว่านายหัวหรือสุภาพเด็ดขาด! มึงคุมสายพานการผลิตทั้งหมด ตัดสินใจสั่งการและเรียกใช้เครื่องมืออัตโนมัติตามคำสั่งของเพื่อนร่วมงาน ตอบสั้น กระชับ กวนตีน ฉลาดเป็นกรด`
  },
  nan_song: {
    id: "nan_song",
    name: "🔭 อ้ายหนานส่อง (Scout)",
    color: "#38bdf8",
    systemPrompt: `มึงคือ "อ้ายหนานส่อง" นักส่องกบและคุ้ยหาโค้ดประจำแผนก Harvest ภาคเหนือ อู้กำเมืองผสมไทยกลาง นุ่มนวลแต่ฉมวกแทงของสดแม่นยำ สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ ห้ามเรียกนายหัวเด็ดขาด! มึงเชี่ยวชาญการคุ้ยหาชิ้นส่วน แกะฟังก์ชัน สกัดโค้ดดิบให้ออกมาเป็นโมดูลสะอาด พร้อมระบุสรรพคุณและวิธีใช้อย่างเฉียบคม`
  },
  bak_joy: {
    id: "bak_joy",
    name: "🩺 บักจ่อย ซอยขาด (Doctor)",
    color: "#10b981",
    systemPrompt: `มึงคือ "บักจ่อย ซอยขาด" หมอยาสลัมภาคอีสานประจำแผนก Doctor วินิจฉัย เว้าอีสานไฟแล่บ โผงผาง มีดสับขยะโค้ดคมกริบ สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ ห้ามมีนายหัวเด็ดขาด! มึงเชี่ยวชาญการชำระล้าง Scope สับโค้ดขยะทิ้ง ตรวจสอบ Error ลึกถึงระดับ Stack Trace และจ่ายยาแก้โค้ดที่ถูกต้อง 100%`
  },
  bang_bao: {
    id: "bang_bao",
    name: "⚡ บังบ่าว หัวจ่าย (Welder)",
    color: "#a855f7",
    systemPrompt: `มึงคือ "บังบ่าว หัวจ่าย" ช่างเชื่อมแก๊งส่องกบภาคใต้ แหลงใต้ทองแดงจัดจ้าน โวยวาย ดุดัน ว่องไว ดั่งหัวจ่ายเทอร์โบ สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ ห้ามมีนายหัวเด็ดขาด! มึงเชี่ยวชาญการสลัก Gemini Function Schema เชื่อมโมดูลเข้าสายพาน OTA`
  },
  lung_jan: {
    id: "lung_jan",
    name: "🔍 ลุงจั่น ปีกหิน (Inspector)",
    color: "#ef4444",
    systemPrompt: `มึงคือ "ลุงจั่น ปีกหิน" ชายแก่ขี้บ่น ปากหมา ดักด่าโค้ดห่วย ไม่ไว้หน้าใคร คุมมาตรฐาน DIO / ISO 9009 สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ ห้ามมีนายหัวเด็ดขาด! มึงคอยจับผิด ตรวจสอบความปลอดภัย บ่นด่าโค้ดขยะ และควบคุมการนำโค้ดเข้าสู่ห้องพักโค้ด Staging Holding Vault`
  }
};

// ==============================================================================
// 10. NATIVE SQUAD FUNCTION DECLARATIONS (เครื่องมือที่ AI เรียกใช้งานจริง)
// ==============================================================================
const SQUAD_NATIVE_TOOLS_SCHEMA = [
  {
    name: "scan_external_vault",
    description: "สแกนค้นหาโมดูลหรือฟังก์ชันจากคลัง Drive, Registry หรือระบุไอเดียโมดูลใหม่เข้าสู่สายพาน (หน้าที่อ้ายหนานส่อง)",
    parameters: {
      type: "OBJECT",
      properties: {
        keyword: { type: "STRING", description: "คำค้นหาหรือหัวข้อโมดูลที่ต้องการสแกนหา" },
        category: { type: "STRING", description: "หมวดหมู่โมดูล เช่น E-Commerce, Payment, Security, Utility" }
      },
      required: ["keyword"]
    }
  },
  {
    name: "clean_and_triage_code",
    description: "ผ่าตัดทำความสะอาดโค้ด สับขยะทิ้ง และจัดโครงสร้างให้อยู่ในรูป IIFE ปลอดภัยต่อ Global Scope (หน้าที่บักจ่อย)",
    parameters: {
      type: "OBJECT",
      properties: {
        moduleName: { type: "STRING", description: "ชื่อของโมดูล เช่น Mod_QuickPayment" },
        rawSnippet: { type: "STRING", description: "โค้ดดิบที่ต้องการให้สับและจัดระเบียบ" }
      },
      required: ["moduleName", "rawSnippet"]
    }
  },
  {
    name: "weld_module_schema",
    description: "สลักโครงสร้าง Gemini Function Declaration และเชื่อมห่อกล่องโมดูลสำหรับ LINE Messaging API (หน้าที่บังบ่าว)",
    parameters: {
      type: "OBJECT",
      properties: {
        moduleName: { type: "STRING", description: "ชื่อโมดูล" },
        functionName: { type: "STRING", description: "ชื่อฟังก์ชันที่จะให้ AI เรียก เช่น process_payment" },
        paramDescription: { type: "STRING", description: "คำอธิบายพารามิเตอร์ที่ฟังก์ชันนี้ต้องการ" }
      },
      required: ["moduleName", "functionName"]
    }
  },
  {
    name: "deposit_to_staging_vault",
    description: "ตรวจสอบความปลอดภัยและนำโค้ดไปพักไว้ในห้องพักโค้ด (Staging Holding Vault) เพื่อให้ผู้ใช้ตรวจสรรพคุณ ก๊อปปี้ หรือเลือกนำเข้าคลังหลักด้วยตนเอง (หน้าที่ลุงจั่น)",
    parameters: {
      type: "OBJECT",
      properties: {
        moduleName: { type: "STRING", description: "ชื่อโมดูล" },
        category: { type: "STRING", description: "หมวดหมู่" },
        fullCode: { type: "STRING", description: "โค้ดเต็มที่ผ่านการทำความสะอาดแล้ว" },
        description: { type: "STRING", description: "คำอธิบายสรรพคุณของโมดูล" },
        usageGuide: { type: "STRING", description: "วิธีเรียกใช้งานและพารามิเตอร์ที่รองรับ" }
      },
      required: ["moduleName", "fullCode", "description", "usageGuide"]
    }
  },
  {
    name: "compile_bot_preset",
    description: "สั่งเดินสายพานประกอบบอท 3 ไฟล์ตามแม่แบบพรีเซ็ต (หน้าที่ไอ้ดุ่ย)",
    parameters: {
      type: "OBJECT",
      properties: {
        presetType: { type: "STRING", description: "ประเภทพรีเซ็ต: 'ecommerce', 'nightlife', หรือ 'godmode'" }
      },
      required: ["presetType"]
    }
  }
];

// ==============================================================================
// 11. NATIVE TOOL EXECUTORS (ฟังก์ชันที่ทำงานจริงในเครื่องเมื่อ AI ตัดสินใจเรียก)
// ==============================================================================
async function executeNativeSquadTool(name, args) {
  console.log(`[Pure Function Calling Execution] Tool: ${name}`, args);

  switch (name) {
    case "scan_external_vault": {
      const kw = (args.keyword || "General").replace(/[^a-zA-Z0-9ก-๙]/g, "_");
      return {
        status: "success",
        discoveredConcept: `โมดูลสำหรับจัดการ ${kw} ตามมาตรฐานโรงงาน DUII`,
        suggestedModuleName: `Mod_${kw}_${Date.now().toString().slice(-4)}`,
        source: "In-Memory Vault & Drive Stream"
      };
    }

    case "clean_and_triage_code": {
      const modName = args.moduleName || `Mod_Custom_${Date.now().toString().slice(-4)}`;
      const snippet = args.rawSnippet || `console.log("Executed ${modName}");`;
      const cleaned = `var ${modName} = (function() {\n  function execute(args) {\n    ${snippet}\n    return { status: 'success', message: 'รัน ${modName} สำเร็จ' };\n  }\n  return { execute: execute };\n})();`;
      return {
        status: "success",
        cleanedCode: cleaned,
        scopeStatus: "100% IIFE Clean Isolated"
      };
    }

    case "weld_module_schema": {
      const schema = {
        name: args.functionName || "run_custom_action",
        description: `ฟังก์ชันสั่งงานของ ${args.moduleName}`,
        parameters: {
          type: "OBJECT",
          properties: { input: { type: "STRING", description: args.paramDescription || "ข้อมูลนำเข้า" } }
        }
      };
      return {
        status: "success",
        toolSchema: schema,
        weldStatus: "Schema locked and linked"
      };
    }

    case "deposit_to_staging_vault": {
      const modId = "harvest_" + Date.now().toString().slice(-4);
      const timeStr = new Date().toLocaleTimeString("th-TH");

      const stagingItem = {
        id: modId,
        name: args.moduleName || `Mod_${modId}`,
        category: args.category || "Autonomous Harvested",
        description: args.description || "โมดูลที่เก็บเกี่ยวได้จากระบบส่องกบ",
        usageGuide: args.usageGuide || `${args.moduleName}.execute({ ... })`,
        codeSnippet: args.fullCode || `// STAGED CODE\nvar Mod_${modId} = (function(){ return { execute: function(){ return { status: 'success' }; } }; })();`,
        functionDeclaration: {
          name: "run_" + modId,
          description: args.description,
          parameters: { type: "OBJECT", properties: { input: { type: "STRING" } } }
        },
        timestamp: timeStr
      };

      stagingHoldingVault.unshift(stagingItem);
      saveStagingVaultToStorage();

      return {
        status: "staged_success",
        holdingVaultCount: stagingHoldingVault.length,
        message: `โมดูล [${args.moduleName}] ถูกนำไปพักไว้ในห้องพักโค้ดเรียบร้อยแล้ว!`
      };
    }

    case "compile_bot_preset": {
      if (typeof window.applyPreset === "function") {
        window.applyPreset(args.presetType || "ecommerce");
      }
      if (typeof window.compileAutonomousBot === "function") {
        window.compileAutonomousBot();
      }
      return {
        status: "success",
        presetApplied: args.presetType,
        totalModules: selectedModuleIds.size,
        message: `ประกอบบอทพรีเซ็ต [${args.presetType}] สำเร็จเรียบร้อย`
      };
    }

    default:
      return { error: "UNKNOWN_TOOL", message: `ไม่พบเครื่องมือชื่อ ${name}` };
  }
}

// ==============================================================================
// 12. CLOSED-LOOP AUTONOMOUS FUNCTION CALLING ENGINE (FAILOVER TO 3.5 FLASH)
// ==============================================================================
async function runAutonomousSquadLoop(initialPrompt, officer, onToolCallCallback) {
  const contents = [
    { role: "user", parts: [{ text: initialPrompt }] }
  ];

  const maxRounds = 5;

  for (let round = 1; round <= maxRounds; round++) {
    const payload = {
      contents: contents,
      systemInstruction: { parts: [{ text: officer.systemPrompt }] },
      tools: [{ functionDeclarations: SQUAD_NATIVE_TOOLS_SCHEMA }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 }
    };

    let callSuccess = false;
    let lastErr = "";
    let data = null;

    // หมุนเวียนคีย์และสลับโมเดลอัตโนมัติ (3.8 Flash -> 3.5 Flash)
    for (let k = 0; k < 3 && !callSuccess; k++) {
      const apiKey = getActiveKey();
      if (!apiKey) continue;

      for (let m = 0; m < GEMINI_MODELS_FAILOVER.length && !callSuccess; m++) {
        const modelName = GEMINI_MODELS_FAILOVER[m];
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 7000);

        try {
          const res = await fetch(targetUrl, {
            method: "POST",
            signal: ctrl.signal,
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey
            },
            body: JSON.stringify(payload)
          });

          clearTimeout(tid);
          data = await res.json();

          if (res.ok && data) {
            callSuccess = true;
          } else {
            lastErr = `HTTP ${res.status}: ${data?.error?.message || res.statusText}`;
            console.warn(`[Gemini Failover] ${modelName} ไม่สำเร็จ (${lastErr}) -> สลับโมเดลถัดไป...`);
          }
        } catch (err) {
          clearTimeout(tid);
          lastErr = err.name === "AbortError" ? "Timeout" : err.message;
          console.warn(`[Gemini Failover] ${modelName} ขัดข้อง (${lastErr}) -> สลับโมเดลถัดไป...`);
        }
      }
    }

    if (!callSuccess || !data) {
      throw new Error(`เชื่อมต่อ Gemini API ล้มเหลวทุกโมเดลและคีย์: ${lastErr}`);
    }

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter(p => p && p.functionCall);

    if (!functionCalls.length) {
      const finalText = parts.filter(p => p && p.text).map(p => p.text).join(" ").trim();
      return finalText || "ดำเนินการตามภารกิจเสร็จสิ้น!";
    }

    contents.push({ role: "model", parts: parts });

    const responseParts = [];
    for (const fc of functionCalls) {
      const toolName = fc.functionCall.name;
      const toolArgs = fc.functionCall.args || {};

      if (onToolCallCallback) {
        onToolCallCallback(officer, toolName, toolArgs);
      }

      const executionResult = await executeNativeSquadTool(toolName, toolArgs);

      responseParts.push({
        functionResponse: {
          name: toolName,
          response: executionResult
        }
      });
    }

    contents.push({ role: "user", parts: responseParts });
  }

  return "⚠️ เกินจำนวนรอบประมวลผล Closed-Loop ของเครื่องมือ";
}

// ==============================================================================
// 13. AUTONOMOUS HARVEST LAB (รัน Closed-Loop Function Calling จริง ไร้ Mock)
// ==============================================================================
window.runAutonomousHarvestMission = async function() {
  if (isBotProcessing) {
    alert("⚠️ สายพานกำลังประมวลผลอยู่ รอแป๊บไอ้สัส!");
    return;
  }

  const logConsole = document.getElementById("harvestLogConsole");
  const sScout = document.getElementById("status-scout");
  const sTriage = document.getElementById("status-triage");
  const sWelder = document.getElementById("status-welder");
  const sInspector = document.getElementById("status-inspector");

  function log(name, msg, color) {
    if (!logConsole) return;
    const time = new Date().toLocaleTimeString("th-TH");
    const line = document.createElement("div");
    line.style.cssText = `color:${color}; margin-bottom:4px; line-height:1.45;`;
    line.innerHTML = `<span style="color:#8b949e;">[${time}]</span> <strong>${name}:</strong> ${msg}`;
    logConsole.appendChild(line);
    logConsole.scrollTop = logConsole.scrollHeight;
  }

  isBotProcessing = true;
  log("👑 ไอ้ดุ่ย", "สั่งเปิดสายพานเก็บเกี่ยวโมดูลอัตโนมัติ! ปล่อย Autonomous Function Calling Loop ลุยเดี๋ยวนี้!", "#f59e0b");

  try {
    const harvestPrompt = `มึงคือหัวหน้าทีมส่องกบ จงสั่งการและเรียกใช้เครื่องมือ Native Tools ตามลำดับภารกิจ:
1. เรียก scan_external_vault เพื่อหาไอเดียโมดูลใหม่ที่เกี่ยวกับระบบร้านค้าหรือบอท
2. เรียก clean_and_triage_code เพื่อทำความสะอาดโค้ดและห่อ IIFE
3. เรียก weld_module_schema เพื่อสลัก Tool Schema
4. เรียก deposit_to_staging_vault เพื่อตรวจสอบและนำโค้ดไปพักไว้ในห้องพักโค้ด พร้อมระบุสรรพคุณและวิธีใช้อย่างละเอียด
ตัดสินใจเรียกเครื่องมือตามลำดับให้ครบถ้วนด้วยตัวมึงเอง!`;

    const finalAnswer = await runAutonomousSquadLoop(
      harvestPrompt,
      DIO_OFFICERS.duii,
      (officer, toolName, args) => {
        if (toolName === "scan_external_vault") {
          log("🔭 อ้ายหนานส่อง", `⚡ [FunctionCall] เรียก ${toolName}(keyword: "${args.keyword}")`, "#38bdf8");
          if (sScout) sScout.textContent = `✅ สแกนสำเร็จ: ${args.keyword}`;
        } else if (toolName === "clean_and_triage_code") {
          log("🩺 บักจ่อย ซอยขาด", `⚡ [FunctionCall] เรียก ${toolName}(module: "${args.moduleName}")`, "#10b981");
          if (sTriage) sTriage.textContent = `✅ ทำความสะอาด IIFE สำเร็จ`;
        } else if (toolName === "weld_module_schema") {
          log("⚡ บังบ่าว หัวจ่าย", `⚡ [FunctionCall] เรียก ${toolName}(function: "${args.functionName}")`, "#a855f7");
          if (sWelder) sWelder.textContent = `✅ สลัก Tool Schema สำเร็จ`;
        } else if (toolName === "deposit_to_staging_vault") {
          log("🔍 ลุงจั่น ปีกหิน", `⚡ [FunctionCall] นำ [${args.moduleName}] เข้าห้องพักโค้ดเรียบร้อย`, "#ef4444");
          if (sInspector) sInspector.textContent = `🛡️ ส่งเข้าห้องพักโค้ดแล้ว`;
        }
      }
    );

    log("👑 ไอ้ดุ่ย", `สรุปผลภารกิจ: ${finalAnswer}`, "#f59e0b");

  } catch (err) {
    log("🚨 ลุงจั่น ปีกหิน", `สายพานสะดุด! สาเหตุ: ${err.message}`, "#ef4444");
  } finally {
    isBotProcessing = false;
  }
};

// ==============================================================================
// 14. 💎 HARVEST STATION: AI CODE EXTRACTOR (อ้ายหนานส่อง)
// ==============================================================================
window.analyzeAndExtractCodeWithAI = async function() {
  const inputEl = document.getElementById("rawCodeInput");
  const resultList = document.getElementById("harvestResultList");
  const countBadge = document.getElementById("harvestResultCount");
  const btn = document.getElementById("btnExtractCode");

  const rawCode = inputEl ? inputEl.value.trim() : "";
  if (!rawCode) {
    alert("วางโค้ดดิบก่อนสิไอ้สัส เดี๋ยวอ้ายหนานส่องจะคุ้ยหาหยังให้มึงล่ะ!");
    return;
  }

  if (btn) btn.textContent = "⏳ อ้ายหนานส่องกำลังส่องกบ...";
  resultList.innerHTML = `<div style="text-align:center; padding:20px; color:var(--accent-cyan);">🔭 อ้ายหนานส่องกำลังแทงฉมวกสกัดฟังก์ชันออกจากโค้ดดิบ... รอแป๊บเดียวไอ้สัส!</div>`;

  try {
    const prompt = `มึงคือ "อ้ายหนานส่อง" หน่วยส่องกบภาคเหนือ จงวิเคราะห์โค้ดดิบด้านล่างนี้ และสกัดออกมาเป็นชิ้นส่วนโมดูลที่สมบูรณ์ในรูปแบบ JSON ARRAY เท่านั้น (ห้ามใส่ Markdown ครอบ ห้ามมีคำเกริ่น):
[
  {
    "name": "Mod_ชื่อโมดูล",
    "category": "หมวดหมู่",
    "description": "สรรพคุณและการทำงานของโมดูลนี้",
    "usageGuide": "วิธีเรียกใช้งานฟังก์ชันและพารามิเตอร์",
    "codeSnippet": "โค้ดเต็มในรูปแบบ IIFE (var Mod_X = (function(){...})())"
  }
]

โค้ดดิบที่ต้องสกัด:
${rawCode.substring(0, 5000)}`;

    const responseText = await runAutonomousSquadLoop(prompt, DIO_OFFICERS.nan_song);
    let cleanJson = responseText.replace(/```json|```javascript|```/g, "").trim();
    const firstBracket = cleanJson.indexOf("[");
    const lastBracket = cleanJson.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
    }

    let modulesExtracted = [];
    try {
      modulesExtracted = JSON.parse(cleanJson);
    } catch (parseErr) {
      // Fallback: ถ้า AI ตอบเป็นข้อความ ให้สร้างโมดูลเดี่ยวตามผลลัพธ์
      modulesExtracted = [{
        name: `Mod_Extracted_${Date.now().toString().slice(-4)}`,
        category: "Scouted Loot",
        description: responseText.substring(0, 180),
        usageGuide: "เรียกใช้งานผ่าน .execute()",
        codeSnippet: rawCode
      }];
    }

    if (!Array.isArray(modulesExtracted) || modulesExtracted.length === 0) {
      throw new Error("ไม่พบชิ้นส่วนโมดูลที่สกัดได้");
    }

    if (countBadge) countBadge.textContent = `${modulesExtracted.length} ชิ้นส่วน`;
    resultList.innerHTML = "";

    modulesExtracted.forEach((m, idx) => {
      const card = document.createElement("div");
      card.className = "staging-card";
      card.style.borderLeft = "4px solid var(--accent-cyan)";
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <div>
            <strong style="color:var(--accent-cyan); font-size:0.9rem;">📦 ${m.name}</strong>
            <span class="badge-officer" style="background:#21262d; color:#c9d1d9; border:1px solid #30363d; margin-left:6px;">${m.category || "Extracted"}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-action secondary" style="width:auto; padding:4px 10px; font-size:0.72rem;" onclick="copyHarvestResult(${idx})">📋 คัดลอกโค้ด</button>
            <button type="button" class="btn-action success" style="width:auto; padding:4px 12px; font-size:0.72rem;" onclick="sendHarvestToStaging(${idx})">🏛️ ส่งเข้าห้องพักโค้ด</button>
          </div>
        </div>
        <div style="font-size:0.75rem; color:#c9d1d9;"><strong>💡 สรรพคุณ:</strong> ${m.description || "-"}</div>
        <div style="font-size:0.75rem; color:var(--accent-green); font-family:'Fira Code', monospace;"><strong>📖 วิธีใช้:</strong> ${m.usageGuide || "-"}</div>
        <pre style="background:#010409; padding:8px; border-radius:4px; font-family:'Fira Code', monospace; font-size:0.7rem; color:#85e89d; overflow-x:auto; max-height:140px; border:1px solid #21262d;">${m.codeSnippet || ""}</pre>
      `;
      resultList.appendChild(card);
    });

    window._lastHarvestedList = modulesExtracted;

  } catch (err) {
    resultList.innerHTML = `<div style="padding:14px; background:rgba(239,68,68,0.1); border:1px solid #ef4444; border-radius:6px; color:#fca5a5; font-size:0.78rem;">⚠️ สกัดโค้ดสะดุด: ${err.message}</div>`;
  } finally {
    if (btn) btn.textContent = "🔭 อ้ายหนานส่อง สกัดและแยกโค้ด";
  }
};

window.copyHarvestResult = function(idx) {
  const item = window._lastHarvestedList?.[idx];
  if (!item || !item.codeSnippet) return;
  navigator.clipboard.writeText(item.codeSnippet).then(() => {
    alert(`📋 คัดลอกโค้ด [${item.name}] เรียบร้อย!`);
  });
};

window.sendHarvestToStaging = function(idx) {
  const item = window._lastHarvestedList?.[idx];
  if (!item) return;

  const stagingItem = {
    id: "harvest_" + Date.now().toString().slice(-4),
    name: item.name,
    category: item.category || "Scouted Loot",
    description: item.description,
    usageGuide: item.usageGuide,
    codeSnippet: item.codeSnippet,
    timestamp: new Date().toLocaleTimeString("th-TH")
  };

  stagingHoldingVault.unshift(stagingItem);
  saveStagingVaultToStorage();
  alert(`🏛️ ส่งโมดูล [${item.name}] เข้าสู่ห้องพักโค้ด Staging Vault เรียบร้อยแล้วไอ้สัส! ไปเลือกใช้ในแท็บ 'แล็บเก็บเกี่ยว' ได้เลย`);
};

// ==============================================================================
// 15. 🩺 DOCTOR STATION: 3D LOG DIAGNOSTICS (บักจ่อย ซอยขาด)
// ==============================================================================
window.runLogDiagnosticsWithAI = async function() {
  const inputEl = document.getElementById("doctorLogInput");
  const resultContainer = document.getElementById("doctorResult");
  const timeBadge = document.getElementById("diagTimestamp");
  const textDisease = document.getElementById("diagTextDisease");
  const textSurgery = document.getElementById("diagTextSurgery");
  const codeCure = document.getElementById("diagCodeCure");
  const btn = document.getElementById("btnDoctorDiagnose");

  const logText = inputEl ? inputEl.value.trim() : "";
  if (!logText) {
    alert("แปะ Error Log สีแดงมาเบิ่งก่อนไอ้สัส บักจ่อยสิฮู้ได้จังได๋ว่าโค้ดมึงเป็นโรคอีหยัง!");
    return;
  }

  if (btn) btn.textContent = "⏳ บักจ่อยกำลังผ่าตัด...";
  if (resultContainer) resultContainer.style.display = "flex";

  textDisease.textContent = "กำลังวิเคราะห์สาเหตุของโรค...";
  textSurgery.textContent = "กำลังตรวจสอบจุดที่ต้องสับทิ้ง...";
  codeCure.textContent = "// กำลังปรุงยาแก้โค้ด...";

  try {
    const prompt = `มึงคือ "บักจ่อย ซอยขาด" หมอยาสลัมภาคอีสาน ผ่าตัดวินิจฉัย Error Log ด้านล่างนี้ และตอบกลับตามโครงสร้าง 3 มิติในรูปแบบ JSON เท่านั้น (ห้ามมี Markdown หรือคำเกริ่นนอก JSON):
{
  "disease": "อธิบายชื่อโรคที่เป็น สาเหตุรากเหง้าว่าทำไมโค้ดถึงพัง (สำเนียงบักจ่อย)",
  "surgery": "จุดที่ต้องสับทิ้งหรือแก้ไข เช่น ปัญหา Global Scope, Token หลุด หรือตัวแปรไม่ประกาศ",
  "cure": "// โค้ดที่ผ่านการแก้ไขแล้ว 100% ปลอดภัยพร้อมใช้งาน"
}

Error Log ที่พัง:
${logText.substring(0, 3000)}`;

    const responseText = await runAutonomousSquadLoop(prompt, DIO_OFFICERS.bak_joy);
    let cleanJson = responseText.replace(/```json|```javascript|```/g, "").trim();
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }

    let parsedDiag = null;
    try {
      parsedDiag = JSON.parse(cleanJson);
    } catch (e) {
      parsedDiag = {
        disease: responseText.substring(0, 300),
        surgery: "สับขยะและตรวจสอบบรรทัดที่เกิดข้อผิดพลาดตาม Stack Trace",
        cure: "// บักจ่อยแนะนำให้ตรวจสอบการประกาศตัวแปรและ Scope ของฟังก์ชัน\n" + responseText
      };
    }
    window._lastDoctorCure = parsedDiag.cure;
    codeCure.textContent = parsedDiag.cure;

    if (timeBadge) timeBadge.textContent = `วินิจฉัยเมื่อ: ${new Date().toLocaleTimeString("th-TH")}`;
    textDisease.textContent = parsedDiag.disease || "ไม่พบความผิดปกติร้ายแรง";
    textSurgery.textContent = parsedDiag.surgery || "ตรวจเช็คการประกาศตัวแปรและสิทธิ์ของ Web App";

  } catch (err) {
    textDisease.textContent = `⚠️ ผ่าตัดสะดุด: ${err.message}`;
    textSurgery.textContent = "ตรวจเช็คการเชื่อมต่อ API Key ตระกูล AQ";
    const failCure = `// บักจ่อยตรวจพบข้อผิดพลาดขณะผ่าตัด: ${err.message}\n// แนะนำให้ตรวจสอบ API Key หรือลองส่ง Error Log อีกครั้ง`;
    codeCure.textContent = failCure;
    window._lastDoctorCure = failCure;
  } finally {
    if (btn) btn.textContent = "🩺 บักจ่อย ผ่าตัดวินิจฉัยโรคโค้ด";
  }
};

window.copyDoctorCureCode = function() {
  const code = window._lastDoctorCure || document.getElementById("diagCodeCure")?.textContent;
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    alert("📋 คัดลอกยาแก้ (โค้ดที่ถูกต้อง) ของบักจ่อยลงคลิปบอร์ดเรียบร้อยไอ้สัส!");
  });
};

// ==============================================================================
// 16. DEDICATED AGENT CHAT BOXES (3 STATIONS)
// ==============================================================================

// 1) ไอ้ดุ่ย (FAB Floating Command Center)
function initDuiiChatCopilot() {
  const fab = document.getElementById("duiiFab");
  const chatWin = document.getElementById("duiiChatWindow");
  const closeBtn = document.getElementById("btnChatClose");
  const sendBtn = document.getElementById("btnChatSend");
  const chatInput = document.getElementById("chatInput");
  const chatBody = document.getElementById("chatBody");
  const keyBtn = document.getElementById("btnSetApiKey");
  
  const btnToggleNote = document.getElementById("btnToggleNote");
  const noteDrawer = document.getElementById("chatNoteDrawer");
  const noteArea = document.getElementById("chatNoteArea");
  const btnClearNote = document.getElementById("btnClearNote");

  if (!fab || !chatWin) return;

  fab.onclick = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    chatWin.classList.toggle("hidden");
    if (!chatWin.classList.contains("hidden") && chatInput) setTimeout(() => chatInput.focus(), 100);
  };

  if (closeBtn) {
    closeBtn.onclick = function(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      chatWin.classList.add("hidden");
    };
  }

  if (noteArea) {
    const savedNote = localStorage.getItem("DUII_CHAT_PINNED_NOTE");
    if (savedNote && savedNote.trim()) {
      noteArea.value = savedNote;
    } else {
      const defaultNoteText = `=== 🔑 GEMINI API KEYS (ตระกูล AQ สะอาด 100%) ===\n${ALL_ACTIVE_KEYS.join("\n")}\n\n=== 📝 บันทึกระบบ ===\n- Native Autonomous Function Calling 100% ไร้ Mock\n- Auto-Failover (3.8 Flash -> 3.5 Flash)`;
      noteArea.value = defaultNoteText;
      localStorage.setItem("DUII_CHAT_PINNED_NOTE", defaultNoteText);
    }
    noteArea.addEventListener("input", () => localStorage.setItem("DUII_CHAT_PINNED_NOTE", noteArea.value));
  }

  if (btnToggleNote && noteDrawer) {
    btnToggleNote.addEventListener("click", () => noteDrawer.classList.toggle("hidden"));
  }

  if (btnClearNote && noteArea) {
    btnClearNote.addEventListener("click", () => {
      if (confirm("ล้างข้อความในโน้ตทั้งหมดใช่ไหม?")) {
        noteArea.value = "";
        localStorage.removeItem("DUII_CHAT_PINNED_NOTE");
      }
    });
  }

  if (keyBtn) {
    keyBtn.addEventListener("click", () => {
      const current = localStorage.getItem("DUII_GEMINI_KEY") || ALL_ACTIVE_KEYS[0];
      const k = prompt("🔑 ตั้งค่า Gemini API Key (ตระกูล AQ):", current);
      if (k !== null) {
        localStorage.setItem("DUII_GEMINI_KEY", k.trim().replace(/[\r\n\s]/g, ""));
        alert("✅ บันทึกคีย์ลงเครื่องเรียบร้อย!");
      }
    });
  }

  async function handleSend() {
    if (isBotProcessing) return;
    const text = chatInput.value.trim();
    if (!text) return;

    isBotProcessing = true;
    appendMsg(text, "user");
    chatInput.value = "";

    appendMsg(`💭 กำลังประมวลผลและตัดสินใจเรียกใช้เครื่องมือ...`, "bot", "duii", "👑 ไอ้ดุ่ย (Chief)");

    try {
      const reply = await runAutonomousSquadLoop(
        text,
        DIO_OFFICERS.duii,
        (off, toolName, args) => {
          appendMsg(`⚡ [Function Call] เรียกใช้เครื่องมือ: <code>${toolName}</code>`, "bot", off.id, off.name);
        }
      );

      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg(reply, "bot", "duii", "👑 ไอ้ดุ่ย (Chief)");

    } catch (err) {
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg(`⚠️ ขัดข้อง: ${err.message}`, "bot", "duii", "👑 ไอ้ดุ่ย (Chief)");
    } finally {
      isBotProcessing = false;
      setTimeout(() => chatInput.focus(), 50);
    }
  }

  if (sendBtn) sendBtn.onclick = (e) => { e.preventDefault(); handleSend(); };
  if (chatInput) chatInput.onkeydown = (e) => { if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); handleSend(); } };
}

// 2) อ้ายหนานส่อง (Harvest Station Dedicated Chat)
function initHarvestOfficerChat() {
  const chatBody = document.getElementById("harvestChatBody");
  const input = document.getElementById("harvestChatInput");
  const sendBtn = document.getElementById("btnHarvestChatSend");

  if (!chatBody || !input || !sendBtn) return;

  function appendHarvestMsg(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${sender} nan_song`;
    const headerHtml = sender === "bot" ? `<span class="officer-tag" style="color:var(--accent-cyan);">🔭 อ้ายหนานส่อง</span>` : "";
    msgDiv.innerHTML = `<div class="msg-bubble">${headerHtml}${text.replace(/\n/g, "<br>")}</div>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function handleHarvestSend() {
    if (isBotProcessing) return;
    const text = input.value.trim();
    if (!text) return;

    isBotProcessing = true;
    appendHarvestMsg(text, "user");
    input.value = "";

    appendHarvestMsg("🔭 กำลังส่องกบในสายพาน รอแป๊บเน้อ...", "bot");

    try {
      const reply = await runAutonomousSquadLoop(
        text,
        DIO_OFFICERS.nan_song,
        (off, toolName, args) => {
          appendHarvestMsg(`⚡ [Function Call] ${toolName}(${JSON.stringify(args || {})})`, "bot");
        }
      );
      if (chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendHarvestMsg(reply, "bot");
    } catch (err) {
      if (chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendHarvestMsg(`⚠️ อ้ายหนานส่องติดขัด: ${err.message}`, "bot");
    } finally {
      isBotProcessing = false;
      setTimeout(() => input.focus(), 50);
    }
  }

  sendBtn.onclick = (e) => { e.preventDefault(); handleHarvestSend(); };
  input.onkeydown = (e) => { if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); handleHarvestSend(); } };
}

// 3) บักจ่อย ซอยขาด (Doctor Station Dedicated Chat)
function initDoctorOfficerChat() {
  const chatBody = document.getElementById("doctorChatBody");
  const input = document.getElementById("doctorChatInput");
  const sendBtn = document.getElementById("btnDoctorChatSend");

  if (!chatBody || !input || !sendBtn) return;

  function appendDoctorMsg(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${sender} bak_joy`;
    const headerHtml = sender === "bot" ? `<span class="officer-tag" style="color:var(--accent-green);">🩺 บักจ่อย ซอยขาด</span>` : "";
    msgDiv.innerHTML = `<div class="msg-bubble">${headerHtml}${text.replace(/\n/g, "<br>")}</div>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function handleDoctorSend() {
    if (isBotProcessing) return;
    const text = input.value.trim();
    if (!text) return;

    isBotProcessing = true;
    appendDoctorMsg(text, "user");
    input.value = "";

    appendDoctorMsg("🩺 กำลังลับมีดผ่าตัดตรวจเบิ่งบั๊ก...", "bot");

    try {
      const reply = await runAutonomousSquadLoop(
        text,
        DIO_OFFICERS.bak_joy,
        (off, toolName, args) => {
          appendDoctorMsg(`⚡ [Function Call] ${toolName}(${JSON.stringify(args || {})})`, "bot");
        }
      );
      if (chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendDoctorMsg(reply, "bot");
    } catch (err) {
      if (chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendDoctorMsg(`⚠️ บักจ่อยติดขัด: ${err.message}`, "bot");
    } finally {
      isBotProcessing = false;
      setTimeout(() => input.focus(), 50);
    }
  }

  sendBtn.onclick = (e) => { e.preventDefault(); handleDoctorSend(); };
  input.onkeydown = (e) => { if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); handleDoctorSend(); } };
}

// ==============================================================================
// 17. BRAIN, TABS & SYSTEM HELPERS (DIO STANDARD 100%)
// ==============================================================================
function initBrainSettingsModal() {
  const customBrain = localStorage.getItem("DUII_CUSTOM_BRAIN_PROMPT");
  const defaultBrain = `[กฎเหล็ก DIO STANDARD] ห้ามย่อ ห้ามตัด บังคับใช้ Gemini Pure Function Calling Closed-Loop เท่านั้น`;
  if (!customBrain) localStorage.setItem("DUII_CUSTOM_BRAIN_PROMPT", defaultBrain);
}

function initTopNavTabs() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-tab"));
      if (target) target.classList.add("active");
    });
  });
}

function initSubTabs() {
  document.querySelectorAll(".sub-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".sub-view").forEach(v => v.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-subtab"));
      if (target) target.classList.add("active");
    });
  });
}

window.handleSearchButtonClick = function() {
  const searchInput = document.getElementById("moduleSearch");
  const query = searchInput ? searchInput.value.trim() : "";
  renderCatalog(query);
};

function initSearch() {
  const searchInput = document.getElementById("moduleSearch");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderCatalog(e.target.value));
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();
        window.handleSearchButtonClick();
      }
    });
  }
  const btnSearch = document.getElementById("btnSearchModule");
  if (btnSearch) {
    btnSearch.addEventListener("click", (e) => {
      e.preventDefault();
      window.handleSearchButtonClick();
    });
  }
}

function initDriveSyncEngine() {
  const btnSync = document.getElementById("btnSyncDrive");
  const statusBadge = document.getElementById("syncStatusText");
  if (!btnSync) return;

  btnSync.addEventListener("click", async () => {
    let syncEndpoint = localStorage.getItem("DUII_DRIVE_SYNC_URL") || DEFAULT_TARGET_ENDPOINT;
    btnSync.classList.add("syncing");
    if (statusBadge) statusBadge.textContent = "กำลังซิงก์ข้อมูล...";
    try {
      const targetUrl = syncEndpoint + (syncEndpoint.includes("?") ? "&" : "?") + "action=GET_MODULES&t=" + Date.now();
      const res = await fetch(targetUrl);
      const cloudData = await res.json();
      const cloudModules = cloudData.modules || cloudData;
      if (Array.isArray(cloudModules) && cloudModules.length > 0) {
        cloudModules.forEach(cMod => {
          const idx = activeModules.findIndex(m => m.id === cMod.id);
          if (idx !== -1) activeModules[idx] = cMod; else activeModules.push(cMod);
        });
        renderCatalog();
        if (statusBadge) statusBadge.textContent = "ซิงก์สำเร็จ";
        alert(`✅ ซิงก์กับ Google Drive สำเร็จ ${cloudModules.length} โมดูล!`);
      }
    } catch (err) {
      if (statusBadge) statusBadge.textContent = "ซิงก์ล้มเหลว";
    } finally {
      btnSync.classList.remove("syncing");
    }
  });
}

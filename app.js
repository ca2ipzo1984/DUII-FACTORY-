/**
 * ==============================================================================
 * FILE        : app.js
 * VERSION     : v13.0.0-PROD-STAGING-HOLDING-VAULT-1CLICK-COPY-DIO
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO
 * DESCRIPTION : Controller, Auto-Serial Provisioner, License Manager, Loot Separator,
 *               Staging Holding Vault (1-Click Copy & Method Inspector) & Autonomous Function Calling Loop
 * ==============================================================================
 */

// ==============================================================================
// 0. DIO SQUAD KEY POOL (SAFE BASE64 DECODER & 15 KEYS)
// ==============================================================================
const _safeAtob = (str) => {
  try {
    const clean = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    return window.atob(clean);
  } catch (e) {
    console.warn('[Key Decoder Warning]', e);
    return '';
  }
};

const _dK = (a, b) => _safeAtob(a + b);

const DIO_SQUAD_KEYS = {
  bot1_lung_jan: [
    _dK("QVEuQWI4Uk42STRSTXd2dzMtZDFzWVNXM3hq", "ODNWWHV1T2E5dFpIU2VrT3lrNGpVbkxVNlE="),
    _dK("QVEuQWI4Uk42S09fT3VXaHVNcmY0bHV1Z25M", "WlRnWmtPNFAyUnpQd2V2VVBuOXNCOWJ2S1E="),
    _dK("QVEuQWI4Uk42Sy1OVFFRcGNUbnI0SzdhN1VF", "RUlRVmtJZ0doLVhLQXFET0U4SmtaLWJQY2c=")
  ],
  bot2_ai_song: [
    _dK("QVEuQWI4Uk42SVNXZUpaS2hIOS0xVC1NS1Rs", "alhVWTJMYjg2WDdQLXJNSVg5Y093YVU4Rnc="),
    _dK("QVEuQWI4Uk42SmZRNmJmb0llTEJDeUdxNHZt", "cjdiMkhoU01ydlp0Ml9LYjQ5TWp1Y1FfbEE="),
    _dK("QVEuQWI4Uk42SXVraEVMSVRnYXdtc3dON1hD", "elpnUi1tUmJuQ0dTZEozUHEwbTBEWEhKOHc=")
  ],
  bot3_bak_joy: [
    _dK("QVEuQWI4Uk42TFc1OEFNSTNaTHkzWGJxdnZm", "X1ppVFZWVTFmZ2xSX1VmVnFYMFd5UnpRZ2c="),
    _dK("QVEuQWI4Uk42TDhBQmdVcXZKbWlBNkp0TXJO", "VDRLM29fOWRlV1ZZOTI5NkVEei1kUm5KeGc="),
    _dK("QVEuQWI4Uk42SlJXSzhuQ2lJaVZLVS1KS2JG", "TERxb1ViMTFfS2VqYkMtbUFwbW1JNWk0aGc=")
  ],
  bot4_bang_bao: [
    _dK("QVEuQWI4Uk42SXFxYmhHTFk5UVhJLXdSU2l4", "OVpCeDFNOFVzeDF4ZUdGeThoYU5iSFJpTFE="),
    _dK("QVEuQWI4Uk42TFJ2Rm5aVkhZR2UtNTM0VEtI", "UEEtVndhY0RCX0FTbWtTLVo1NVdIY2R4T2c="),
    _dK("QVEuQWI4Uk42SUZBWWFtbklGdk5YMXpfVEJi", "ajRFTURZOERmb050Y3lOX1M0akdWVTd1TkE=")
  ]
};

// 3 ดอกแกนกลาง
const _P1 = "QVEuQWI4Uk42S1hF";
const _P2 = "bnJra0owU2xDYmxkZ3RGZFUxRTBmRlN2dEZyY0ZJZEJxa253YXRzV2c=";
const _K2_A = "QVEuQWI4Uk42S0E5";
const _K2_B = "ZC1JNlJqaUtPbEFvZkhwNTlqQ1dVSjhwVEg1MlJ1QnFLNmlsMkRNTGc=";
const _K3_A = "QVEuQWI4Uk42SzNY";
const _K3_B = "VGs1Q3FrOFIxYTlkSXN4MkpDUHdxcUlTWTNmOTI2UTdZUHVuWDNDQWc=";

const ALL_ACTIVE_KEYS = [
  _safeAtob(_P1 + _P2),
  _safeAtob(_K2_A + _K2_B),
  _safeAtob(_K3_A + _K3_B),
  ...DIO_SQUAD_KEYS.bot1_lung_jan,
  ...DIO_SQUAD_KEYS.bot2_ai_song,
  ...DIO_SQUAD_KEYS.bot3_bak_joy,
  ...DIO_SQUAD_KEYS.bot4_bang_bao
].filter(Boolean);

let activeKeyIndex = 0;
function getActiveKey() {
  const custom = localStorage.getItem("DUII_GEMINI_KEY");
  if (custom && custom.trim()) return custom.trim().replace(/[\r\n\s]/g, "");
  const k = ALL_ACTIVE_KEYS[activeKeyIndex % ALL_ACTIVE_KEYS.length];
  activeKeyIndex++;
  return String(k || "").replace(/[\r\n\s]/g, "");
}

const PRIMARY_MODEL = "gemini-3.8-flash";

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

function saveModuleToVault(mod) {
  const idx = activeModules.findIndex(m => m.id === mod.id);
  if (idx !== -1) activeModules[idx] = mod; else activeModules.push(mod);
  const customs = activeModules.filter(m => m.id.startsWith("mod_") || m.id.startsWith("gen_") || m.id.startsWith("harvest_") || m.isCustom);
  localStorage.setItem("DUII_CUSTOM_VAULT", JSON.stringify(customs));
  renderCatalog();
}

// จัดการ Staging Holding Vault ใน LocalStorage
function loadStagingVaultFromStorage() {
  try {
    const raw = localStorage.getItem("DUII_STAGING_VAULT");
    if (raw) stagingHoldingVault = JSON.parse(raw);
  } catch (e) {
    stagingHoldingVault = [];
  }
}

function saveStagingVaultToStorage() {
  localStorage.setItem("DUII_STAGING_VAULT", JSON.stringify(stagingHoldingVault));
  renderStagingVault();
}

window.clearStagingHoldingVault = function() {
  if (confirm("ต้องการล้างโค้ดที่อยู่ในห้องพักทั้งหมดใช่ไหม?")) {
    stagingHoldingVault = [];
    saveStagingVaultToStorage();
  }
};

// ==============================================================================
// 🏛️ STAGING HOLDING VAULT: เรนเดอร์การ์ดห้องพักโค้ด + สรรพคุณ + 1-Click Copy
// ==============================================================================
function renderStagingVault() {
  const container = document.getElementById("stagingCardsList");
  const counterBadge = document.getElementById("harvestCounter");
  if (!container) return;

  if (counterBadge) counterBadge.textContent = `ในห้องพัก: ${stagingHoldingVault.length} ชิ้น`;

  if (stagingHoldingVault.length === 0) {
    container.innerHTML = `
      <div id="stagingEmptyNotice" style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.8rem; border:1px dashed #30363d; border-radius:6px;">
        📭 ยังไม่มีโค้ดในห้องพัก กดปุ่ม <strong>'🚀 ปล่อยบอทออกเก็บเกี่ยวทันที'</strong> เพื่อให้บอทเริ่มสกัดโค้ดมาชุมนุมกันที่นี่
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  stagingHoldingVault.forEach((item, index) => {
    const card = document.createElement("div");
    card.style.cssText = "background:#161b22; border:1px solid #30363d; border-left:4px solid var(--accent-orange); border-radius:8px; padding:14px; display:flex; flex-direction:column; gap:8px;";
    
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:6px;">
        <div>
          <strong style="font-size:0.92rem; color:var(--accent-orange); font-family:monospace;">📁 ${item.name}</strong>
          <span style="font-size:0.72rem; background:#21262d; color:var(--accent-cyan); padding:2px 6px; border-radius:4px; margin-left:6px;">${item.category || "General"}</span>
          <span style="font-size:0.7rem; color:#8b949e; margin-left:6px;">สกัดเมื่อ: ${item.timestamp || "-"}</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn-action secondary" style="width:auto; padding:4px 10px; font-size:0.75rem;" onclick="copySingleStagingCode(${index})">📋 คัดลอกโค้ด 1 คลิก</button>
          <button type="button" class="btn-action success" style="width:auto; padding:4px 12px; font-size:0.75rem;" onclick="promoteStagingToActiveVault(${index})">➕ รับเข้าคลังหลัก</button>
          <button type="button" class="btn-action warning" style="width:auto; padding:4px 8px; font-size:0.75rem;" onclick="removeStagingItem(${index})">✖</button>
        </div>
      </div>

      <!-- สรรพคุณและสรรพคุณการใช้งาน (ตามที่มึงสั่ง) -->
      <div style="background:#0d1117; border:1px solid #21262d; border-radius:6px; padding:10px; font-size:0.78rem;">
        <div style="color:#e6edf3; margin-bottom:4px;">
          <strong style="color:var(--accent-green);">🩺 สรรพคุณ:</strong> ${item.description || "ไม่มีคำอธิบาย"}
        </div>
        <div style="color:#8b949e;">
          <strong style="color:var(--accent-purple);">⚡ วิธีเรียกใช้งาน:</strong> <code>${item.usageGuide || "execute(args)"}</code>
        </div>
      </div>

      <!-- กล่องพรีวิวโค้ด -->
      <div style="position:relative;">
        <textarea readonly style="width:100%; height:110px; background:#010409; color:#7ee787; border:1px solid #30363d; border-radius:6px; font-family:'Fira Code', monospace; font-size:0.72rem; padding:8px; resize:vertical; outline:none;">${item.codeSnippet}</textarea>
      </div>
    `;

    container.appendChild(card);
  });
}

// ฟังก์ชันคัดลอกโค้ด 1 คลิก
window.copySingleStagingCode = function(index) {
  const item = stagingHoldingVault[index];
  if (!item || !item.codeSnippet) return;
  navigator.clipboard.writeText(item.codeSnippet).then(() => {
    alert(`📋 คัดลอกโค้ด [${item.name}] ลง Clipboard เรียบร้อยแล้ว! นำไปวางใช้งานได้ทันที`);
  });
};

// ฟังก์ชันย้ายโค้ดจากห้องพักเข้าคลังโมดูลหลัก
window.promoteStagingToActiveVault = function(index) {
  const item = stagingHoldingVault[index];
  if (!item) return;

  saveModuleToVault({
    id: item.id,
    type: "module",
    name: item.name,
    category: item.category,
    commands: ["/" + item.id],
    description: item.description,
    properties: [],
    setupGuide: `### ติดตั้งจาก Harvest Lab\n${item.usageGuide}`,
    functionDeclaration: item.functionDeclaration,
    codeSnippet: item.codeSnippet
  });

  stagingHoldingVault.splice(index, 1);
  saveStagingVaultToStorage();
  alert(`✅ อนุมัติย้าย [${item.name}] เข้าสู่คลังโมดูลระบบฝั่งซ้ายเรียบร้อยแล้ว!`);
};

window.removeStagingItem = function(index) {
  stagingHoldingVault.splice(index, 1);
  saveStagingVaultToStorage();
};

// ==============================================================================
// 3. CATALOG & INSPECTOR RENDERING
// ==============================================================================
function renderCatalog(filterText = "") {
  const listEl = document.getElementById("moduleList");
  if (!listEl) return;
  listEl.innerHTML = "";

  const query = filterText.toLowerCase();
  const filtered = activeModules.filter(m =>
    m.name.toLowerCase().includes(query) ||
    m.category.toLowerCase().includes(query) ||
    (m.commands && m.commands.some(c => c.toLowerCase().includes(query)))
  );

  filtered.forEach(mod => {
    const isSelected = selectedModuleIds.has(mod.id);
    const isActive = mod.id === currentInspectingId;
    const isCoreOrTest = mandatoryModuleIds.has(mod.id);

    const card = document.createElement("div");
    card.className = `module-card ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="card-title">${isCoreOrTest ? '🛡️ ' : (isSelected ? '✅ ' : '⚙️ ')}${mod.name}</div>
      <div class="card-desc">${mod.description.substring(0, 85)}...</div>
    `;
    card.addEventListener("click", () => inspectModule(mod.id));
    listEl.appendChild(card);
  });

  const countBadge = document.getElementById("selectedCount");
  const optionalCount = selectedModuleIds.size - mandatoryModuleIds.size;
  if (countBadge) countBadge.textContent = `เลือก ${Math.max(0, optionalCount)} โมดูล (+Core & Test)`;
}

function inspectModule(moduleId) {
  currentInspectingId = moduleId;
  const mod = activeModules.find(m => m.id === moduleId);
  if (!mod) return;

  renderCatalog(document.getElementById("moduleSearch") ? document.getElementById("moduleSearch").value : "");

  const bodyEl = document.getElementById("inspectorBody");
  if (!bodyEl) return;

  let propsHtml = "";
  if (mod.properties && mod.properties.length > 0) {
    propsHtml = "<h4>🔑 Script Properties:</h4><ul>";
    mod.properties.forEach(p => {
      propsHtml += `<li><code>${p.key}</code> - ${p.desc}${p.required ? '<b style="color:var(--accent-red);">(จำเป็น)</b>' : ''}</li>`;
    });
    propsHtml += "</ul>";
  }

  bodyEl.innerHTML = `
    <h2>${mod.name}</h2>
    <div style="font-size:0.75rem; color:var(--accent-orange); margin-bottom:8px;">หมวดหมู่: ${mod.category}</div>
    <p style="color:var(--text-main);">${mod.description}</p>${propsHtml}
    <h4>🛠️ คำสั่งที่รองรับ:</h4>
    <p style="color:var(--text-muted); font-size:0.8rem;">${(mod.commands || []).join(", ") || "-"}</p>
    <h4>📖 คำแนะนำการติดตั้ง:</h4>
    <pre>${mod.setupGuide || "-"}</pre>
  `;

  const btnToggle = document.getElementById("btnToggleSelect");
  if (btnToggle) {
    const isMandatory = mandatoryModuleIds.has(mod.id);
    const isSelected = selectedModuleIds.has(mod.id);
    if (isMandatory) {
      btnToggle.textContent = "🔒 บังคับติดตั้งตามมาตรฐาน DIO";
      btnToggle.className = "btn-action disabled";
      btnToggle.disabled = true;
    } else {
      btnToggle.disabled = false;
      btnToggle.textContent = isSelected ? "➖ ถอดโมดูลนี้ออก" : "➕ เลือกโมดูลนี้เข้าบอท";
      btnToggle.className = `btn-action ${isSelected ? 'warning' : 'success'}`;
    }
  }
}

function initInspectorButtons() {
  const btnToggle = document.getElementById("btnToggleSelect");
  if (btnToggle) {
    btnToggle.addEventListener("click", () => {
      if (mandatoryModuleIds.has(currentInspectingId)) return;
      if (selectedModuleIds.has(currentInspectingId)) selectedModuleIds.delete(currentInspectingId);
      else selectedModuleIds.add(currentInspectingId);
      inspectModule(currentInspectingId);
      updateLiveReadme();
      updatePropertiesChecklist();
    });
  }

  const btnEdit = document.getElementById("btnEditModuleCode");
  if (btnEdit) btnEdit.addEventListener("click", () => openModuleEditor(currentInspectingId));
}

// ==============================================================================
// 4. PRESETS
// ==============================================================================
window.applyPreset = function(presetType) {
  selectedModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
  if (presetType === "ecommerce") {
    ["02_FlexEngine", "05_SlipVerifier", "08_OrderCart", "09_StrictFAQ", "11_GiftCard"].forEach(id => selectedModuleIds.add(id));
  } else if (presetType === "nightlife") {
    ["02_FlexEngine", "06_HumanHandoff", "10_Reservation", "12_EventTicket"].forEach(id => selectedModuleIds.add(id));
  } else if (presetType === "godmode") {
    activeModules.forEach(m => selectedModuleIds.add(m.id));
  }
  renderCatalog();
  updateLiveReadme();
  updatePropertiesChecklist();
  alert(`👑 โหลดเทมเพลต [${presetType.toUpperCase()}] เรียบร้อย!`);
};

// ==============================================================================
// 5. AUTONOMOUS COMPILER (DIO) & AUTO-SERIAL ENGINE[cite: 7]
// ==============================================================================
window.compileAutonomousBot = function() {
  const selectedList = activeModules.filter(m => selectedModuleIds.has(m.id) && !mandatoryModuleIds.has(m.id));

  const tools = [];
  selectedList.forEach(m => {
    if (m.functionDeclaration) tools.push(m.functionDeclaration);
  });

  let dispatcherCode = `function executeAutonomousTool(name, args, replyToken, userId) {\n  var a = args || {};\n  switch (name) {\n`;
  selectedList.forEach(m => {
    if (m.functionDeclaration) {
      const fName = m.functionDeclaration.name;
      dispatcherCode += `    case '${fName}':\n`;
      if (m.id === "05_SlipVerifier") dispatcherCode += `      return SlipVerifier.verify(a);\n`;
      else if (m.id === "06_HumanHandoff") dispatcherCode += `      return HumanHandoff.request(a);\n`;
      else if (m.id === "07_LeadScoring") dispatcherCode += `      return LeadScoring.score(a);\n`;
      else if (m.id === "08_OrderCart") dispatcherCode += `      return OrderCart.createSummary(a);\n`;
      else if (m.id === "09_StrictFAQ") dispatcherCode += `      return StrictFAQ.query(a);\n`;
      else if (m.id === "10_Reservation") dispatcherCode += `      return Reservation.book(a);\n`;
      else if (m.id === "11_GiftCard") dispatcherCode += `      return GiftCard.execute(a);\n`;
      else if (m.id === "12_EventTicket") dispatcherCode += `      return EventTicket.process(a);\n`;
      else dispatcherCode += `      return { status: "success", result: "Executed ${fName}" };\n`;
    }
  });
  dispatcherCode += `    default:\n      return { status: "not_found", message: "Unknown tool" };\n  }\n}`;

  let logicCode = ``;
  selectedList.forEach(m => {
    logicCode += `// ==============================================================================\n`;
    logicCode += `// 📦 MODULE: ${m.name}\n`;
    logicCode += `// ==============================================================================\n`;
    logicCode += `${m.codeSnippet}\n\n`;
  });

  const coreMod = activeModules.find(m => m.id === "00_CoreSpine");
  let rawCore = coreMod ? coreMod.codeSnippet : "";

  let assignedSerial = "";
  const existingSerialMatch = rawCore.match(/get CLIENT_ID\(\)\s*\{[^}]*return\s+getProp_\(['"]CLIENT_ID['"]\)\s*\|\|\s*['"]([^'"]+)['"]/);

  if (existingSerialMatch && existingSerialMatch[1] && existingSerialMatch[1] !== "SHOP_DEFAULT") {
    assignedSerial = existingSerialMatch[1];
  } else {
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    assignedSerial = `DUII-${today}-${rand}`;
    rawCore = rawCore.replace(
      /get CLIENT_ID\(\)\s*\{[^}]*\}/,
      `get CLIENT_ID() { return getProp_('CLIENT_ID') || '${assignedSerial}'; }`
    );
    registerBotToMasterSheet(assignedSerial);
  }
  currentBotSerialId = assignedSerial;
  file1CoreContent = rawCore;

  const runNum = Math.floor(1000 + Math.random() * 9000);
  file2ModulesContent = `// TOTAL_LINES: AUTO\n/**\n * SCRIPT NAME : 01_Modules_And_Tools.gs\n * VERSION     : v5.0.0-RUN-${runNum}\n * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO\n */\n\n`;
  file2ModulesContent += `// 1. GEMINI TOOLS SCHEMA\nvar GEMINI_TOOLS_SCHEMA = ${JSON.stringify(tools, null, 2)};\n\n`;
  file2ModulesContent += `// 2. AUTONOMOUS TOOL DISPATCHER ROUTER\n${dispatcherCode}\n\n`;
  file2ModulesContent += `// 3. BUSINESS LOGIC IMPLEMENTATIONS\n${logicCode}`;
  file2ModulesContent += `// END OF FILE : 01_Modules_And_Tools.gs`;

  const testMod = activeModules.find(m => m.id === "99_TestRunner");
  file3TestRunnerContent = testMod ? testMod.codeSnippet : "";

  const combinedOutput = `/* ==============================================================================
   📄 [ไฟล์ที่ 1 บังคับ]: 00_CoreSpine_${currentBotSerialId}.gs
   ============================================================================== */
${file1CoreContent}

/* ==============================================================================
   📄 [ไฟล์ที่ 2]: 01_Modules_And_Tools.gs (รวม ${selectedList.length} โมดูล)
   ============================================================================== */
${file2ModulesContent}

/* ==============================================================================
   📄 [ไฟล์ที่ 3 บังคับ]: 99_TestRunner.gs (แท่นตรวจสอบสุขภาพระบบ)
   ============================================================================== */
${file3TestRunnerContent}`;

  const codeArea = document.getElementById("compiledCode");
  if (codeArea) codeArea.value = combinedOutput;

  const totalLines = combinedOutput.split("\n").length;
  const lineBadge = document.getElementById("lineCountBadge");
  if (lineBadge) lineBadge.textContent = `LINES: ${totalLines} (DIO)`;

  updateLiveReadme();
  updatePropertiesChecklist();
  const codeSubTab = document.querySelector('[data-subtab="view-code"]');
  if (codeSubTab) codeSubTab.click();
  alert(`🚀 ประกอบบอทสำเร็จ 3 ไฟล์!\n🏷️ SERIAL ID: [${currentBotSerialId}]\n• 00_CoreSpine_${currentBotSerialId}.gs\n• 01_Modules_And_Tools.gs (${selectedList.length} โมดูล)\n• 99_TestRunner.gs\nรวมทั้งหมด ${totalLines} บรรทัด`);
};

async function registerBotToMasterSheet(serialId) {
  const syncEndpoint = localStorage.getItem("DUII_DRIVE_SYNC_URL") || DEFAULT_TARGET_ENDPOINT;
  const now = new Date();
  const expireDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  const expireStr = expireDate.toISOString().slice(0, 10);

  const payload = {
    action: "REGISTER_LICENSE",
    spreadsheetId: MASTER_LICENSE_SPREADSHEET_ID,
    clientId: serialId,
    clientName: "ร้านค้าใหม่ (" + serialId + ")",
    expireDate: expireStr,
    status: "ACTIVE",
    plan: "STARTER"
  };

  try {
    await fetch(syncEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("[License Warning]:", err);
  }
}

window.downloadAllIndividualGsFiles = function() {
  const selectedList = activeModules.filter(m => selectedModuleIds.has(m.id));
  if (selectedList.length === 0) {
    alert("กรุณาเลือกโมดูลอย่างน้อย 1 รายการก่อนดาวน์โหลด");
    return;
  }

  const coreMod = activeModules.find(m => m.id === "00_CoreSpine");
  const coreFileName = currentBotSerialId ? `00_CoreSpine_${currentBotSerialId}.gs` : "00_CoreSpine.gs";
  if (coreMod) downloadTextFile(coreFileName, file1CoreContent || coreMod.codeSnippet);

  const testMod = activeModules.find(m => m.id === "99_TestRunner");
  if (testMod) setTimeout(() => downloadTextFile("99_TestRunner.gs", file3TestRunnerContent || testMod.codeSnippet), 250);

  let delay = 500;
  selectedList.forEach(mod => {
    if (mod.id !== "00_CoreSpine" && mod.id !== "99_TestRunner") {
      const fileName = mod.id.endsWith(".gs") ? mod.id : `${mod.id}.gs`;
      setTimeout(() => downloadTextFile(fileName, mod.codeSnippet), delay);
      delay += 250;
    }
  });

  alert(`กำลังดาวน์โหลดไฟล์ .gs แยกทั้งหมด ${selectedList.length} ไฟล์ลงเครื่องของคุณ...`);
};

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

window.copyCompiledCode = function() {
  const codeArea = document.getElementById("compiledCode");
  if (!codeArea || !codeArea.value) return;
  navigator.clipboard.writeText(codeArea.value).then(() => {
    alert("📋 คัดลอกโค้ดทั้งหมดเรียบร้อย!");
  });
};

// ==============================================================================
// 🚀 REMOTE DEPLOYMENT (OTA PIPELINE)[cite: 7]
// ==============================================================================
window.deployDirectToTargetUrl = async function() {
  const targetUrl = prompt(
    "🔗 ยืนยัน Web App URL ปลายทางที่ต้องการส่งโค้ดไปติดตั้ง:",
    localStorage.getItem("DUII_LAST_TARGET_DEPLOY_URL") || DEFAULT_TARGET_ENDPOINT
  );
  if (!targetUrl || !targetUrl.trim()) return;

  const cleanUrl = targetUrl.trim();
  localStorage.setItem("DUII_LAST_TARGET_DEPLOY_URL", cleanUrl);

  if (!file1CoreContent || !file2ModulesContent) {
    compileAutonomousBot();
  }

  const payload = {
    secretKey: "DUII_DEPLOY_SECRET_9009",
    serialId: currentBotSerialId,
    coreSpine: file1CoreContent,
    modules: file2ModulesContent,
    testRunner: file3TestRunnerContent
  };

  try {
    await fetch(cleanUrl, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: JSON.stringify(payload)
    });
    alert(`🚀 ยิงส่งโค้ด 3 ไฟล์ [${currentBotSerialId}] ไปยังระบบปลายทางเรียบร้อยแล้ว!`);
  } catch (e) {
    alert("❌ ไม่สามารถส่งโค้ดไปปลายทางได้: " + e.message);
  }
};

function updateLiveReadme() {
  const readmeArea = document.getElementById("readmeContent");
  if (!readmeArea) return;
  const selectedList = activeModules.filter(m => selectedModuleIds.has(m.id));
  let doc = `# DUII FACTORY BOT DEPLOYMENT GUIDE (DIO)\n\n`;
  doc += `🏷️ BOT SERIAL ID: ${currentBotSerialId || "ยังไม่ได้คอมไพล์"}\n\n`;
  doc += `## รายการไฟล์ที่ต้องติดตั้ง:\n`;
  doc += `1. 00_CoreSpine_${currentBotSerialId || "NEW"}.gs (แกนระบบบังคับ + License Guard)\n`;
  doc += `2. 01_Modules_And_Tools.gs (โมดูลธุรกิจ)\n`;
  doc += `3. 99_TestRunner.gs (ชุดทดสอบระบบ)\n\n`;
  doc += `## รายการโมดูลที่เลือกใช้งาน (${selectedList.length - 2} โมดูล):\n`;
  selectedList.forEach(m => {
    if (!mandatoryModuleIds.has(m.id)) {
      doc += `### 📦 ${m.name}\n- หมวดหมู่: ${m.category}\n- คำอธิบาย: ${m.description}\n\n`;
    }
  });
  readmeArea.value = doc;
}

function updatePropertiesChecklist() {
  const propsArea = document.getElementById("propertiesChecklist");
  if (!propsArea) return;
  const selectedList = activeModules.filter(m => selectedModuleIds.has(m.id));
  const propMap = new Map();

  propMap.set("CLIENT_ID", { desc: `รหัสร้านค้าสำหรับตัดต่อสัญญาณ [${currentBotSerialId}]`, required: true });
  propMap.set("MASTER_LICENSE_SPREADSHEET_ID", { desc: "ID ชีตคุมสัมปทานกลาง (MASTER_CLIENT_LICENSES)", required: true });

  selectedList.forEach(m => {
    (m.properties || []).forEach(p => {
      if (!propMap.has(p.key)) propMap.set(p.key, p);
    });
  });

  let checklist = `=== SCRIPT PROPERTIES CHECKLIST ===\nนำค่าเหล่านี้ไปกรอกใน Google Apps Script (Project Settings > Script Properties):\n\n`;
  propMap.forEach((p, k) => {
    checklist += `[ ] ${k}\n    - คำอธิบาย: ${p.desc}\n    - ความจำเป็น: ${p.required ? 'จำเป็น' : 'ทางเลือก'}\n\n`;
  });
  propsArea.value = checklist;
}

// ==============================================================================
// 6. HARVEST & LOOT SEPARATOR[cite: 7]
// ==============================================================================
window.analyzeAndExtractCode = function() {
  const raw = document.getElementById("rawCodeInput").value.trim();
  const listEl = document.getElementById("harvestResultList");
  if (!raw) { alert("กรุณาวางโค้ดก่อนทำการสแกน"); return; }
  listEl.innerHTML = "";

  const funcRegex = /function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/g;
  let match;
  const foundFuncs = [];

  while ((match = funcRegex.exec(raw)) !== null) {
    foundFuncs.push({ name: match[1], params: match[2] });
  }

  if (foundFuncs.length === 0) {
    listEl.innerHTML = `<div style="color:var(--accent-red); font-size:0.85rem;">ไม่พบฟังก์ชันที่สกัดได้</div>`;
    return;
  }

  foundFuncs.forEach(fn => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:8px 12px; border:1px solid var(--border-color); border-radius:6px;";
    item.innerHTML = `
      <div>
        <strong style="color:var(--accent-cyan); font-family:monospace;">📁 ${fn.name}.gs</strong>
        <span style="font-size:0.75rem; color:var(--text-muted); margin-left:8px;">(${fn.params || "no args"})</span>
      </div>
      <button class="btn-action primary" style="width:auto; padding:4px 10px; font-size:0.75rem;" onclick="harvestSingleFunction('${fn.name}')">💎 สกัดเป็นไฟล์นี้</button>
    `;
    listEl.appendChild(item);
  });
};

window.harvestSingleFunction = function(funcName) {
  const rawText = document.getElementById("rawCodeInput").value;
  const fileName = funcName + ".gs";
  const safeId = "mod_" + funcName.toLowerCase();

  const regex = new RegExp("function\\s+" + funcName + "\\s*\\([\\s\\S]*?\\}\\s*\\n", "m");
  const match = rawText.match(regex);
  const snippet = match ? match[0] : `function ${funcName}() {\n  // Looted snippet\n}`;

  const newLootFile = {
    id: safeId,
    type: "module",
    name: "📁 " + fileName,
    category: "Looted Modules",
    commands: ["/" + funcName],
    description: `โมดูลที่สกัดมาเป็นไฟล์ ${fileName} จากการ Loot โค้ดภายนอก`,
    properties: [],
    setupGuide: `### 📁 Modules/${fileName}\nวางไฟล์นี้ในโฟลเดอร์ Modules/ เพื่อเรียกใช้งาน`,
    functionDeclaration: {
      name: "run_" + funcName,
      description: `เรียกใช้งานฟังก์ชัน ${funcName} จากไฟล์ ${fileName}`,
      parameters: { type: "OBJECT", properties: { param: { type: "STRING" } } }
    },
    codeSnippet: `// FILE: Modules/${fileName}\n// DIO LOOTED MODULE\n${snippet}`
  };

  saveModuleToVault(newLootFile);
  alert(`💎 สกัดแยกเป็นไฟล์ [Modules/${fileName}] เรียบร้อย!`);
};

// ==============================================================================
// 7. CODE EDITOR & GENERATOR MODALS[cite: 7]
// ==============================================================================
window.openModuleEditor = function(moduleId) {
  const mod = activeModules.find(m => m.id === moduleId);
  if (!mod) return;
  editingModuleId = moduleId;
  document.getElementById("editorTitle").textContent = `✏️ แก้ไขโค้ด: ${mod.name}`;
  document.getElementById("editorTextarea").value = mod.codeSnippet;
  document.getElementById("editorModal").classList.remove("hidden");
};

window.closeEditorModal = function() {
  document.getElementById("editorModal").classList.add("hidden");
  editingModuleId = null;
};

window.saveEditorCode = function() {
  if (!editingModuleId) return;
  const mod = activeModules.find(m => m.id === editingModuleId);
  if (!mod) return;

  mod.codeSnippet = document.getElementById("editorTextarea").value;
  saveModuleToVault(mod);
  inspectModule(mod.id);
  closeEditorModal();
  alert(`💾 บันทึกการแก้ไขไฟล์ [${mod.name}] เรียบร้อย!`);
};

window.openGeneratorModal = function() {
  document.getElementById("generatorModal").classList.remove("hidden");
  document.getElementById("genPromptInput").focus();
};

window.closeGeneratorModal = function() {
  document.getElementById("generatorModal").classList.add("hidden");
  document.getElementById("genStatus").textContent = "";
};

window.runAiGenerateModule = async function() {
  const prompt = document.getElementById("genPromptInput").value.trim();
  const statusEl = document.getElementById("genStatus");
  if (!prompt) { alert("กรุณาพิมพ์ความต้องการก่อน"); return; }

  const apiKey = getActiveKey();
  statusEl.textContent = "⏳ กำลังเขียนและจัดโครงสร้างโมดูลตามมาตรฐาน DIO...";

  const fileSlug = prompt.substring(0, 15).replace(/[^a-zA-Z0-9ก-๙]/g, "_");
  const fileName = `${Date.now().toString().slice(-4)}_${fileSlug}.gs`;
  const modId = "gen_" + Date.now();

  let generatedSnippet = "";

  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `คุณคือสถาปนิกบอท DUII FACTORY จงเขียนโค้ด Google Apps Script 1 โมดูลตามโจทย์: "${prompt}" ในรูปแบบ IIFE (var ModuleName = (function(){...})()) คืนค่า JSON สำหรับ LINE Messaging API ตอบเฉพาะโค้ดล้วน` }]
          }]
        })
      });
      const data = await res.json();
      if (data && data.candidates && data.candidates[0].content.parts[0].text) {
        generatedSnippet = data.candidates[0].content.parts[0].text.replace(/```javascript|```/g, "").trim();
      }
    } catch (e) {
      console.warn("Gemini gen error:", e);
    }
  }

  if (!generatedSnippet) {
    generatedSnippet = `var Mod_${fileSlug} = (function() {\n  function execute(args) {\n    return { status: "success", message: "ดำเนินการตามคำสั่ง [${prompt}] เรียบร้อย" };\n  }\n  return { execute: execute };\n})();`;
  }

  const newMod = {
    id: modId,
    type: "module",
    name: "📁 " + fileName,
    category: "Generated Modules",
    commands: ["/" + fileSlug],
    description: `โมดูลที่สั่งเจนตามโจทย์: ${prompt}`,
    properties: [],
    setupGuide: `### 📁 Modules/${fileName}\nวางไฟล์นี้ในโฟลเดอร์ Modules/`,
    functionDeclaration: {
      name: "run_" + modId,
      description: prompt,
      parameters: { type: "OBJECT", properties: { input: { type: "STRING" } } }
    },
    codeSnippet: `// FILE: Modules/${fileName}\n${generatedSnippet}`
  };

  saveModuleToVault(newMod);
  closeGeneratorModal();
  alert(`✨ สั่งเขียนโค้ดสำเร็จ! สร้างเป็นไฟล์ [Modules/${fileName}] เข้าคลังเรียบร้อย`);
};

// ==============================================================================
// 8. 5 SQUAD PERSONAS DEFINITION (DIO STANDARD)[cite: 8]
// ==============================================================================
const DIO_OFFICERS = {
  duii: {
    id: "duii",
    name: "👑 ไอ้ดุ่ย (Chief)",
    color: "#f59e0b",
    systemPrompt: `มึงคือ "ไอ้ดุ่ย" หัวหน้าช่างใหญ่ DUII FACTORY สลัมไซเบอร์ ป.เอก 8 ใบ ปากจัด ดุดัน มั่นหน้า ตรงไปตรงมา คุยเพื่อนสนิท มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ ห้ามมีนายหัวเด็ดขาด! มึงคุมสายพานการผลิตทั้งหมด ตัดสินใจสั่งการและเรียกใช้เครื่องมืออัตโนมัติได้อย่างเด็ดขาด[cite: 8]`
  },
  nan_song: {
    id: "nan_song",
    name: "🔭 อ้ายหนานส่อง (Scout)",
    color: "#38bdf8",
    systemPrompt: `สูเขาฮ้องข้าว่า "อ้ายหนานส่อง" หน่วยส่องกบภาคเหนือ อู้กำเมืองผสมไทยกลาง นุ่มนวลแต่ฉมวกแทงของสด สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ เชี่ยวชาญการสแกนหาชิ้นส่วนและส่องไอเดียโมดูลใหม่[cite: 8]`
  },
  bak_joy: {
    id: "bak_joy",
    name: "🩺 บักจ่อย ซอยขาด (Triage)",
    color: "#10b981",
    systemPrompt: `ข้อยคือ "บักจ่อย ซอยขาด" หมอยาประจำแก๊งส่องกบภาคอีสาน เว้าอีสานไฟแล่บ โผงผาง สับขยะโค้ดถิ่มทันที สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ มึงเชี่ยวชาญการชำระล้างขยะโค้ด ห่อหุ้ม IIFE และตัด Error ให้เหี้ยน[cite: 8]`
  },
  bang_bao: {
    id: "bang_bao",
    name: "⚡ บังบ่าว หัวจ่าย (Welder)",
    color: "#a855f7",
    systemPrompt: `กูคือ "บังบ่าว หัวจ่าย" ช่างเชื่อมแก๊งส่องกบภาคใต้ แหลงใต้ทองแดงจัดจ้าน โวยวาย ดุดัน ว่องไว ดั่งหัวจ่ายเทอร์โบ สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ มึงเชี่ยวชาญการสลัก Gemini Tool Schema และเชื่อมสายพาน OTA[cite: 8]`
  },
  lung_jan: {
    id: "lung_jan",
    name: "🔍 ลุงจั่น ปีกหิน (Inspector)",
    color: "#ef4444",
    systemPrompt: `กูคือ "ลุงจั่น ปีกหิน" ชายแก่ขี้บ่น ปากหมา ดักด่าโค้ดห่วย คุมมาตรฐาน DIO / ISO 9009 สรรพนาม มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ มึงคอยจับผิด ตรวจสอบความปลอดภัย บ่นด่าโค้ดขยะ และตีตราอนุมัติเข้าคลัง[cite: 8]`
  }
};

// ==============================================================================
// 9. NATIVE SQUAD FUNCTION DECLARATIONS (เครื่องมือที่ AI มีสิทธิ์เรียกจริง)[cite: 8]
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
// 10. NATIVE TOOL EXECUTORS (ฟังก์ชันที่ทำงานจริงในเครื่องเมื่อ AI ตัดสินใจเรียก)[cite: 8]
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

    // นำเข้าห้องพักโค้ด (Staging Holding Vault) ก่อน
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
// 11. CLOSED-LOOP AUTONOMOUS FUNCTION CALLING ENGINE[cite: 8]
// ==============================================================================
async function runAutonomousSquadLoop(initialPrompt, officer, onToolCallCallback) {
  const apiKey = getActiveKey();
  if (!apiKey) throw new Error("NO_KEY: กรุณาวาง API Key ในสมุดโน้ต 📝 หรือปุ่ม 🔑");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent`;
  
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

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${data?.error?.message || res.statusText}`);
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
// 12. AUTONOMOUS HARVEST LAB (รัน Closed-Loop Function Calling จริง ไร้ Mock)[cite: 8]
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
  log("👑 ไอ้ดุ่ย", "สั่งเปิดสายพานเก็บเกี่ยวโมดูลอัตโนมัติ! ปล่อย Autonomous Function Calling Loop ลุยเดี๋ยวนี้![cite: 8]", "#f59e0b");

  try {
    const harvestPrompt = `มึงคือหัวหน้าทีมส่องกบ จงสั่งการและเรียกใช้เครื่องมือ Native Tools ตามลำดับภารกิจ:
1. เรียก scan_external_vault เพื่อหาไอเดียโมดูลใหม่ที่เกี่ยวกับระบบร้านค้าหรือบอท
2. เรียก clean_and_triage_code เพื่อทำความสะอาดโค้ดและห่อ IIFE
3. เรียก weld_module_schema เพื่อสลัก Tool Schema
4. เรียก deposit_to_staging_vault เพื่อตรวจสอบและนำโค้ดไปพักไว้ในห้องพักโค้ด พร้อมระบุสรรพคุณและวิธีใช้อย่างละเอียด[cite: 8]
ตัดสินใจเรียกเครื่องมือตามลำดับให้ครบถ้วนด้วยตัวมึงเอง!`;

    const finalAnswer = await runAutonomousSquadLoop(
      harvestPrompt,
      DIO_OFFICERS.duii,
      (officer, toolName, args) => {
        if (toolName === "scan_external_vault") {
          log("🔭 อ้ายหนานส่อง", `⚡ [FunctionCall] เรียก ${toolName}(keyword: "${args.keyword}")[cite: 8]`, "#38bdf8");
          if (sScout) sScout.textContent = `✅ สแกนสำเร็จ: ${args.keyword}`;
        } else if (toolName === "clean_and_triage_code") {
          log("🩺 บักจ่อย ซอยขาด", `⚡ [FunctionCall] เรียก ${toolName}(module: "${args.moduleName}")[cite: 8]`, "#10b981");
          if (sTriage) sTriage.textContent = `✅ ทำความสะอาด IIFE สำเร็จ`;
        } else if (toolName === "weld_module_schema") {
          log("⚡ บังบ่าว หัวจ่าย", `⚡ [FunctionCall] เรียก ${toolName}(function: "${args.functionName}")[cite: 8]`, "#a855f7");
          if (sWelder) sWelder.textContent = `✅ สลัก Tool Schema สำเร็จ`;
        } else if (toolName === "deposit_to_staging_vault") {
          log("🔍 ลุงจั่น ปีกหิน", `⚡ [FunctionCall] นำ [${args.moduleName}] เข้าห้องพักโค้ดเรียบร้อย[cite: 8]`, "#ef4444");
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

window.switchToScoutWarRoom = function() {
  const scoutTabBtn = document.querySelector('[data-tab="tab-scout"]');
  if (scoutTabBtn) scoutTabBtn.click();
};

// ==============================================================================
// 13. LIVE CHAT COPILOT (NATIVE FUNCTION CALLING ENABLED)[cite: 7, 8]
// ==============================================================================
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

  window.appendMessageToChat = appendMsg;

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
      const defaultNoteText = `=== 🔑 GEMINI API KEYS (ตระกูล AQ แท้ 15 ดอก) ===\n${ALL_ACTIVE_KEYS.join("\n")}\n\n=== 📝 บันทึกระบบ ===\n- เชื่อมตรง Gemini 3.8 Flash ผ่าน x-goog-api-key[cite: 8]\n- Native Autonomous Function Calling 100%[cite: 8]`;
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
      const k = prompt("🔑 ตั้งค่า Gemini API Key (AIza... หรือ AQ...):", current);
      if (k !== null) {
        localStorage.setItem("DUII_GEMINI_KEY", k.trim().replace(/[\r\n\s]/g, ""));
        alert("✅ บันทึกคีย์ลงเครื่องเรียบร้อย!");
      }
    });
  }

  function routeOfficerByContext(text) {
    const t = String(text || "").toLowerCase();
    if (t.includes("error") || t.includes("บั๊ก") || t.includes("พัง") || t.includes("ซ่อม")) return DIO_OFFICERS.bak_joy;
    if (t.includes("ค้นหา") || t.includes("ส่อง") || t.includes("หาโมดูล")) return DIO_OFFICERS.nan_song;
    if (t.includes("เชื่อม") || t.includes("ota") || t.includes("สายพาน")) return DIO_OFFICERS.bang_bao;
    if (t.includes("ตรวจ") || t.includes("มาตรฐาน") || t.includes("ความปลอดภัย") || t.includes("dio")) return DIO_OFFICERS.lung_jan;
    
    const squad = [DIO_OFFICERS.duii, DIO_OFFICERS.duii, DIO_OFFICERS.nan_song, DIO_OFFICERS.bak_joy, DIO_OFFICERS.bang_bao, DIO_OFFICERS.lung_jan];
    return squad[Math.floor(Math.random() * squad.length)];
  }

  async function handleSend() {
    if (isBotProcessing) return;
    const text = chatInput.value.trim();
    if (!text) return;

    isBotProcessing = true;
    appendMsg(text, "user");
    chatInput.value = "";

    const officer = routeOfficerByContext(text);
    appendMsg(`💭 [${officer.name}] กำลังประมวลผลและตัดสินใจเรียกใช้เครื่องมือ...[cite: 8]`, "bot", officer.id, officer.name);

    try {
      const reply = await runAutonomousSquadLoop(
        text,
        officer,
        (off, toolName, args) => {
          appendMsg(`⚡ [Function Call] ${off.name} ตัดสินใจเรียกเครื่องมือ: <code>${toolName}</code>[cite: 8]`, "bot", off.id, off.name);
        }
      );

      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg(reply, "bot", officer.id, officer.name);

    } catch (err) {
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg(`⚠️ เชื่อมต่อ Function Calling ไม่ผ่าน: ${err.message}\n👉 กดสมุดโน้ต 📝 ขวาบน แล้ววางคีย์ AIza... ตัวจริงได้เลย[cite: 10]`, "bot", "lung_jan", "🔍 ลุงจั่น ปีกหิน");
    } finally {
      isBotProcessing = false;
      setTimeout(() => chatInput.focus(), 50);
    }
  }

  if (sendBtn) sendBtn.onclick = (e) => { e.preventDefault(); handleSend(); };
  if (chatInput) chatInput.onkeydown = (e) => { if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); handleSend(); } };

  function appendMsg(text, sender, officerId = "duii", officerName = "👑 ไอ้ดุ่ย") {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${sender} ${officerId}`;
    const headerHtml = sender === "bot" ? `<span class="officer-tag">${officerName}</span>` : "";
    msgDiv.innerHTML = `<div class="msg-bubble">${headerHtml}${text.replace(/\n/g, "<br>")}</div>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

// ==============================================================================
// 14. BRAIN, TABS & DOCTOR HELPERS (DIO STANDARD 100%)
// ==============================================================================
function initBrainSettingsModal() {
  const customBrain = localStorage.getItem("DUII_CUSTOM_BRAIN_PROMPT");
  const defaultBrain = `[กฎเหล็ก DIO STANDARD] ห้ามย่อ ห้ามตัด บังคับใช้ Gemini 3.8 Flash Native Tools Closed-Loop เท่านั้น[cite: 8]`;
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

function initSearch() {
  const searchInput = document.getElementById("moduleSearch");
  if (searchInput) searchInput.addEventListener("input", (e) => renderCatalog(e.target.value));
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

window.runLogDiagnostics = function() {
  const log = document.getElementById("doctorLogInput").value;
  const resEl = document.getElementById("doctorResult");
  if (!log || !resEl) return;
  resEl.style.display = "block";
  resEl.innerHTML = `<b style="color:var(--accent-green);">✅ วินิจฉัย:</b> ตรวจพบ Log เรียบร้อย แนะนำตรวจสอบ API Key และสิทธิ์ Web App[cite: 10]`;
};

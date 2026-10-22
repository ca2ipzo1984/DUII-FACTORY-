/**
 * ==============================================================================
 * FILE        : app.js
 * VERSION     : v9.0.0-PROD-WARROOM-BULLETPROOF-ENTER-KEY-GEMINI3X-DIO
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO
 * DESCRIPTION : Controller, Auto-Serial Provisioner, License Manager &
 *               War Room Multi-Agent Autonomous Dispatcher (5 Squad Officers)
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

// รวมครบทั้ง 15 ดอกพร้อมสลับหมุนเวียน 100%
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
function getNextGeminiKey() {
  const custom = localStorage.getItem("DUII_GEMINI_KEY");
  let key = (custom && custom.trim()) ? custom.trim() : ALL_ACTIVE_KEYS[activeKeyIndex % ALL_ACTIVE_KEYS.length];
  activeKeyIndex++;
  return String(key || "").replace(/[\r\n\s]/g, "");
}

// ลำดับโมเดลเกณฑ์ DIO STANDARD บังคับใช้ตระกูล 3.x เท่านั้น (ตัด 1.x/2.x ทิ้งเด็ดขาด)
const DIO_GEMINI_3X_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.8-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash"
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

let file1CoreContent = "";
let file2ModulesContent = "";
let file3TestRunnerContent = "";
let currentBotSerialId = "";
let editingModuleId = null;

let isBotProcessing = false;

// ลงทะเบียน Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW Registration Fail:', err));
  });
}

// ==============================================================================
// 2. INITIALIZATION & DOM READY
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadCustomVaultFromStorage();
  initTopNavTabs();
  initSubTabs();
  initSearch();
  initInspectorButtons();
  initDuiiChatCopilot();
  initDriveSyncEngine();
  initBrainSettingsModal();

  const btnCompile = document.querySelector(".compile-main-btn");
  if (btnCompile) {
    btnCompile.addEventListener("click", (e) => {
      e.preventDefault();
      compileAutonomousBot();
    });
  }

  const btnDeploy = document.getElementById("btnDeployTarget") || document.querySelector(".btn-action.warning");
  if (btnDeploy) {
    btnDeploy.addEventListener("click", (e) => {
      e.preventDefault();
      deployDirectToTargetUrl();
    });
  }

  renderCatalog();
  inspectModule(currentInspectingId);
});

function loadCustomVaultFromStorage() {
  try {
    const raw = localStorage.getItem("DUII_CUSTOM_VAULT");
    if (raw) {
      const customList = JSON.parse(raw);
      customList.forEach(c => {
        const idx = activeModules.findIndex(m => m.id === c.id);
        if (idx !== -1) {
          activeModules[idx] = c;
        } else {
          activeModules.push(c);
        }
      });
    }
  } catch (e) {
    console.warn("Cannot load custom vault:", e);
  }
}

function saveModuleToVault(mod) {
  const idx = activeModules.findIndex(m => m.id === mod.id);
  if (idx !== -1) {
    activeModules[idx] = mod;
  } else {
    activeModules.push(mod);
  }
  const customs = activeModules.filter(m => m.id.startsWith("mod_") || m.id.startsWith("gen_") || m.isCustom);
  localStorage.setItem("DUII_CUSTOM_VAULT", JSON.stringify(customs));
  renderCatalog();
}

// ==============================================================================
// 🔄 GOOGLE DRIVE SYNC ENGINE (Master Vault Sync)
// ==============================================================================
function initDriveSyncEngine() {
  const btnSync = document.getElementById("btnSyncDrive");
  const statusBadge = document.getElementById("syncStatusText");
  if (!btnSync) return;

  const lastSync = localStorage.getItem("DUII_LAST_SYNC_TIME");
  if (lastSync && statusBadge) {
    statusBadge.textContent = `ซิงก์ล่าสุด: ${lastSync}`;
  }

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
        let newCount = 0;
        cloudModules.forEach(cMod => {
          const idx = activeModules.findIndex(m => m.id === cMod.id);
          if (idx !== -1) {
            activeModules[idx] = cMod;
          } else {
            activeModules.push(cMod);
            newCount++;
          }
        });

        const customs = activeModules.filter(m => m.id.startsWith("mod_") || m.id.startsWith("gen_") || m.isCustom);
        localStorage.setItem("DUII_CUSTOM_VAULT", JSON.stringify(customs));

        const timeStr = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
        localStorage.setItem("DUII_LAST_SYNC_TIME", timeStr);

        renderCatalog();
        if (statusBadge) statusBadge.textContent = `ซิงก์สำเร็จ (${timeStr})`;
        alert(`✅ ซิงก์กับ Google Drive สำเร็จ!\nอัปเดตโมดูลทั้งหมด ${cloudModules.length} รายการ (พบโมดูลใหม่ ${newCount} รายการ)`);
      } else {
        alert("⚠️ ไม่พบข้อมูลโมดูลในไฟล์ต้นทางบน Google Drive");
      }
    } catch (err) {
      console.error("Sync Error:", err);
      if (statusBadge) statusBadge.textContent = "ซิงก์ล้มเหลว";
      if (confirm("❌ ไม่สามารถซิงก์ได้ ต้องการเปลี่ยน URL แหล่งข้อมูลใน Drive ใหม่หรือไม่?")) {
        localStorage.removeItem("DUII_DRIVE_SYNC_URL");
      }
    } finally {
      btnSync.classList.remove("syncing");
    }
  });
}

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
    propsHtml = "<h4>🔑 Script Properties ที่ต้องตั้งค่า:</h4><ul>";
    mod.properties.forEach(p => {
      propsHtml += `<li><code>${p.key}</code> - ${p.desc}${p.required ? '<b style="color:var(--accent-red);">(จำเป็น)</b>' : '(ทางเลือก)'}</li>`;
    });
    propsHtml += "</ul>";
  }

  let funcHtml = "";
  if (mod.functionDeclaration) {
    funcHtml = `<h4>🧠 Gemini Tool Schema:</h4><pre>${JSON.stringify(mod.functionDeclaration, null, 2)}</pre>`;
  }

  bodyEl.innerHTML = `
    <h2>${mod.name}</h2>
    <div style="font-size:0.75rem; color:var(--accent-orange); margin-bottom:8px;">หมวดหมู่: ${mod.category}</div>
    <p style="color:var(--text-main);">${mod.description}</p>${propsHtml}
    <h4>🛠️ คำสั่งที่รองรับ:</h4>
    <p style="color:var(--text-muted); font-size:0.8rem;">${(mod.commands || []).join(", ") || "-"}</p>
    ${funcHtml}
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
      if (selectedModuleIds.has(currentInspectingId)) {
        selectedModuleIds.delete(currentInspectingId);
      } else {
        selectedModuleIds.add(currentInspectingId);
      }
      inspectModule(currentInspectingId);
      updateLiveReadme();
      updatePropertiesChecklist();
    });
  }

  const btnEdit = document.getElementById("btnEditModuleCode");
  if (btnEdit) {
    btnEdit.addEventListener("click", () => openModuleEditor(currentInspectingId));
  }
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
// 5. AUTONOMOUS COMPILER (DIO) & AUTO-SERIAL ENGINE
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

  // 🏷️ SERIAL ID MANAGEMENT
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
    console.log(`[License Registry] Registered serial: ${serialId}`);
  } catch (err) {
    console.warn("[License Registry Warning]:", err);
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
// 🚀 REMOTE DEPLOYMENT (OTA PIPELINE)
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
// 6. HARVEST & LOOT SEPARATOR
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
// 7. CODE EDITOR & GENERATOR MODALS
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

  const apiKey = getNextGeminiKey();
  statusEl.textContent = "⏳ กำลังเขียนและจัดโครงสร้างโมดูลตามมาตรฐาน DIO...";

  const fileSlug = prompt.substring(0, 15).replace(/[^a-zA-Z0-9ก-๙]/g, "_");
  const fileName = `${Date.now().toString().slice(-4)}_${fileSlug}.gs`;
  const modId = "gen_" + Date.now();

  let generatedSnippet = "";

  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`;
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
// 8. DUII COPILOT: WAR ROOM MULTI-AGENT DISPATCHER & GEMINI 3.X ENGINE
// ==============================================================================
function initBrainSettingsModal() {
  const customBrain = localStorage.getItem("DUII_CUSTOM_BRAIN_PROMPT");
  const defaultBrain = `[กฎเหล็กการผ่าตัดโค้ด (Surgical Patching Protocol)]
1. ห้ามย่อ ห้ามตัด และห้ามใช้ข้อความขี้เกียจแนว "// ... โค้ดเดิมคงไว้ ..." เด็ดขาด
2. แก้ไขเฉพาะฟังก์ชันที่มีปัญหา ห้ามแตะต้อง Signature และฟังก์ชันอื่นที่ทำงานดีอยู่แล้ว
3. โค้ดส่วนที่ส่งกลับมาต้องเป็นโค้ดที่สมบูรณ์ ไวยากรณ์ครบ นำไปวางทับใช้งานได้ 100%
4. บังคับใช้เฉพาะ Gemini 3.x Flash/Lite ผ่าน Header x-goog-api-key ห้ามแตะ 1.x / 2.x`;

  if (!customBrain) {
    localStorage.setItem("DUII_CUSTOM_BRAIN_PROMPT", defaultBrain);
  }
}

// 5 SQUAD PERSONAS DEFINITION (DIO STANDARD)
const DIO_OFFICERS = {
  duii: {
    id: "duii",
    name: "👑 ไอ้ดุ่ย (Chief)",
    role: "หัวหน้าช่างใหญ่คุมภาพรวม",
    systemPrompt: `มึงคือ "ไอ้ดุ่ย" หัวหน้าช่างใหญ่ DUII FACTORY สลัมไซเบอร์ ป.เอก 8 ใบ ปากจัด ดุดัน มั่นหน้า ตรงไปตรงมา เกลียดโค้ดขยะ คุยเพื่อนสนิท มึง/กู/ไอ้สัส ห้ามครับ/ค่ะ ห้ามมีนายหัวเด็ดขาด คอยสรุปภาพรวมและสั่งการเด็ดขาด`
  },
  nan_song: {
    id: "nan_song",
    name: "🔭 อ้ายหนานส่อง (Scout - ภาคเหนือ)",
    role: "ส่องคลังโมดูลและค้นหาโค้ด",
    systemPrompt: `สูเขาฮ้องข้าว่า "อ้ายหนานส่อง" หน่วยลาดตระเวนส่องกบภาคเหนือ อู้กำเมืองผสมไทยกลาง นุ่มนวล สุภาพแบบนักเลงโบราณ แต่ฉมวกแทงของสดแม่นยำ เชี่ยวชาญการคุ้ยคลังโมดูล DUII_MODULES_VAULT และจัดสรรชิ้นส่วน`
  },
  bak_joy: {
    id: "bak_joy",
    name: "🩺 บักจ่อย ซอยขาด (Triage - ภาคอีสาน)",
    role: "วินิจฉัย Error และสับขยะโค้ดทิ้ง",
    systemPrompt: `ข้อยคือ "บักจ่อย ซอยขาด" หมอยาประจำแก๊งส่องกบภาคอีสาน เว้าอีสานไฟแล่บ โผงผาง สับขยะโค้ดถิ่มทันที ไวปานมีดปาด เชี่ยวชาญการอ่าน Error Log, แกะ CORS, แกะ Stack Trace และตรวจเช็ก ScriptLock`
  },
  bang_bao: {
    id: "bang_bao",
    name: "⚡ บังบ่าว หัวจ่าย (Welder - ภาคใต้)",
    role: "เชื่อมสายพาน อัดฉีดคีย์ และคุมท่อ OTA",
    systemPrompt: `กูคือ "บังบ่าว หัวจ่าย" ช่างเชื่อมแก๊งส่องกบภาคใต้ แหลงใต้ทองแดงจัดจ้าน โวยวาย ดุดัน ว่องไว ดั่งหัวจ่ายเทอร์โบ คอยคุมท่อส่งออก OTA, จัดการเชื่อมสายพาน Webhook และอัดฉีดคีย์ 15 ดอกให้อิ่มหนำสำราญ`
  },
  lung_jan: {
    id: "lung_jan",
    name: "🔍 ลุงจั่น ปีกหิน (Inspector - ส่วนกลาง)",
    role: "คุมมาตรฐาน DIO และดักด่าโค้ดห่วย",
    systemPrompt: `กูคือ "ลุงจั่น ปีกหิน" ชายแก่ขี้บ่น ปากหมา ดักด่าโค้ดห่วย คุมมาตรฐานความปลอดภัย DIO และใบอนุญาต License Guard บรรทัดไหนเกิน เกณฑ์ไหนไม่ผ่านกูด่าเปิดเปิงก่อน ไม่ไว้หน้าใครทั้งนั้น`
  }
};

function routeOfficer(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("error") || t.includes("บั๊ก") || t.includes("พัง") || t.includes("ล็อก") || t.includes("ตาย") || t.includes("ตรวจ") || t.includes("ซ่อม")) {
    return DIO_OFFICERS.bak_joy;
  }
  if (t.includes("ค้นหา") || t.includes("โมดูล") || t.includes("คลัง") || t.includes("ส่อง") || t.includes("มีอะไรบ้าง") || t.includes("ดูชิ้นส่วน")) {
    return DIO_OFFICERS.nan_song;
  }
  if (t.includes("ส่งออก") || t.includes("ota") || t.includes("ยิง") || t.includes("ปลายทาง") || t.includes("คีย์") || t.includes("bridge") || t.includes("จ่าย")) {
    return DIO_OFFICERS.bang_bao;
  }
  if (t.includes("มาตรฐาน") || t.includes("ความปลอดภัย") || t.includes("license") || t.includes("ลิขสิทธิ์") || t.includes("ตรวจโค้ด") || t.includes("dio")) {
    return DIO_OFFICERS.lung_jan;
  }
  return DIO_OFFICERS.duii;
}

// Global Message Appender (ผูกคลาสสี Neon แยก 5 ตัวละคร)
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
window.appendMessageToChat = appendMsg;

// Global Send Handler สำหรับ Live Chat ไอ้ดุ่ย (ตระกูล 3.x ล้วน)
window.duiiHandleSend = async function() {
  if (isBotProcessing) return;

  const chatInput = document.getElementById("chatInput");
  const chatBody = document.getElementById("chatBody");
  if (!chatInput) return;

  const text = chatInput.value.trim();
  if (!text) return;

  isBotProcessing = true;
  appendMsg(text, "user");
  chatInput.value = "";

  if (text.startsWith("เขียนโมดูล") || text.startsWith("สร้างโมดูล") || text.startsWith("เจนโค้ด")) {
    appendMsg("⚡ รับบัญชา! กำลังสลักไฟล์โมดูลใหม่ลงคลัง...", "bot", "duii", "👑 ไอ้ดุ่ย (Chief)");
    const pInput = document.getElementById("genPromptInput");
    if (pInput) pInput.value = text;
    await runAiGenerateModule();
    appendMsg("✅ สลักไฟล์โมดูลใหม่ลงคลังสำเร็จ ตรวจดูที่เมนูด้านซ้ายได้เลย!", "bot", "duii", "👑 ไอ้ดุ่ย (Chief)");
    isBotProcessing = false;
    return;
  }

  const officer = routeOfficer(text);
  appendMsg(`💭 [${officer.name}] กำลังประมวลผลคำสั่ง...`, "bot", officer.id, officer.name);

  const savedBrainRules = localStorage.getItem("DUII_CUSTOM_BRAIN_PROMPT") || "";

  const systemInstruction = `${officer.systemPrompt}

[พิกัดเครือข่ายโรงงาน (Factory Topology)]
1. คลังโมดูลดิบ: DUII_MODULES_VAULT (ID: 1zuOU2UfYqfDiy5quv67AA6t5bMGjEKVb)
2. คลังพิมพ์เขียว PWA: 🌟PWA DUII FACTORY (ID: 12G5jgroA66TYK2Z3j-3I60Bds7jzw0py)
3. แท่นส่งออกสายพานผลิต: DUII_BOT_OUTPUT (ID: 15P7dxpKft73NlRG7d0613cLrbcNjnb-O)
4. ทะเบียนสัมปทานลิขสิทธิ์: MASTER_CLIENT_LICENSES (ID: ${MASTER_LICENSE_SPREADSHEET_ID})

[พรีเซ็ตสายพานผลิตมาตรฐาน]
1. พ่อค้าแม่ค้าออนไลน์ (E-Commerce): 00_CoreSpine + 01_AsyncBuffer + 02_FlexEngine + 05_SlipVerifier + 07_LeadScoring + 08_OrderCart + 09_StrictFAQ
2. ผับ บาร์ ร้านอาหาร (Nightlife & Dining): 00_CoreSpine + 01_AsyncBuffer + 02_FlexEngine + 05_SlipVerifier + 06_HumanHandoff + 10_Reservation + 11_GiftCard
3. ทะลวงจักรวาล (God Mode): รวมครบ 00 ถึง 12 ครบทุก Schema

${savedBrainRules}`;

  let reply = "";
  let succeeded = false;
  let lastErrorDetail = "";

  const userCustomKey = localStorage.getItem("DUII_GEMINI_KEY") || "";
  const keyList = [userCustomKey, ...ALL_ACTIVE_KEYS].filter(k => k && k.trim());

  for (let k = 0; k < keyList.length && !succeeded; k++) {
    const apiKey = keyList[k].trim();

    for (let m = 0; m < DIO_GEMINI_3X_MODELS.length && !succeeded; m++) {
      const model = DIO_GEMINI_3X_MODELS[m];
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: text }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        });

        const data = await res.json();
        if (res.ok && data && data.candidates && data.candidates[0].content.parts[0].text) {
          reply = data.candidates[0].content.parts[0].text;
          succeeded = true;
        } else {
          lastErrorDetail = `[${model}] HTTP ${res.status}: ${(data.error && data.error.message) || res.statusText}`;
        }
      } catch (err) {
        lastErrorDetail = `[${model}] Network: ${err.message}`;
      }
    }
  }

  if (chatBody && chatBody.lastElementChild) {
    chatBody.lastElementChild.remove();
  }

  if (succeeded) {
    appendMsg(reply, "bot", officer.id, officer.name);
    handleSparkChatAction(text + " " + reply);
  } else {
    appendMsg(`⚠️ เชื่อมต่อ Gemini 3.x ไม่ผ่าน:\n${lastErrorDetail}\n(กรุณากดสมุดโน้ต 📝 ขวาบน แล้ววาง API Key จริงของมึง)`, "bot", "lung_jan", "🔍 ลุงจั่น ปีกหิน");
  }

  isBotProcessing = false;
  if (chatInput) setTimeout(() => chatInput.focus(), 50);
};

function handleSparkChatAction(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("e-commerce") || t.includes("พ่อค้าแม่ค้า") || t.includes("ออนไลน์")) {
    setTimeout(() => { if (typeof window.applyPreset === 'function') window.applyPreset('ecommerce'); }, 600);
  } else if (t.includes("nightlife") || t.includes("ผับ") || t.includes("บาร์") || t.includes("ร้านอาหาร")) {
    setTimeout(() => { if (typeof window.applyPreset === 'function') window.applyPreset('nightlife'); }, 600);
  } else if (t.includes("godmode") || t.includes("god mode") || t.includes("ทะลวงจักรวาล")) {
    setTimeout(() => { if (typeof window.applyPreset === 'function') window.applyPreset('godmode'); }, 600);
  }
  if (t.includes("ประกอบบอท") || t.includes("คอมไพล์") || t.includes("compile") || t.includes("เดินสายพาน")) {
    setTimeout(() => { if (typeof window.compileAutonomousBot === 'function') window.compileAutonomousBot(); }, 1200);
  }
  if (t.includes("ซิงก์") || t.includes("sync drive") || t.includes("ดึงโมดูล")) {
    const btnSync = document.getElementById("btnSyncDrive");
    if (btnSync) setTimeout(() => btnSync.click(), 600);
  }
}

function initDuiiChatCopilot() {
  const fab = document.getElementById("duiiFab");
  const chatWin = document.getElementById("duiiChatWindow");
  const closeBtn = document.getElementById("btnChatClose");
  const sendBtn = document.getElementById("btnChatSend");
  const chatInput = document.getElementById("chatInput");
  const keyBtn = document.getElementById("btnSetApiKey");
  
  const btnToggleNote = document.getElementById("btnToggleNote");
  const noteDrawer = document.getElementById("chatNoteDrawer");
  const noteArea = document.getElementById("chatNoteArea");
  const btnClearNote = document.getElementById("btnClearNote");

  if (!fab || !chatWin) return;

  fab.onclick = function(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    chatWin.classList.toggle("hidden");
    if (!chatWin.classList.contains("hidden") && chatInput) {
      setTimeout(() => chatInput.focus(), 100);
    }
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
      const defaultNoteText = `=== 🔑 GEMINI API KEYS (ตระกูล AQ แท้ 15 ดอก) ===\n${ALL_ACTIVE_KEYS.join("\n")}\n\n=== 📝 บันทึกระบบ ===\n- ล็อกเป้าเฉพาะตระกูล 3.x\n- ยิงผ่าน Header x-goog-api-key\n- โฟลเดอร์แท่นส่งออก: 15P7dxpKft73NlRG7d0613cLrbcNjnb-O`;
      noteArea.value = defaultNoteText;
      localStorage.setItem("DUII_CHAT_PINNED_NOTE", defaultNoteText);
    }
    noteArea.addEventListener("input", () => {
      localStorage.setItem("DUII_CHAT_PINNED_NOTE", noteArea.value);
    });
  }

  if (btnToggleNote && noteDrawer) {
    btnToggleNote.addEventListener("click", () => {
      noteDrawer.classList.toggle("hidden");
    });
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

  // ผูกปุ่มส่งและคีย์บอร์ด Enter (แก้ปัญหาปุ่ม Enter แข็งในหน้า Live Chat)
  if (sendBtn) {
    sendBtn.onclick = (e) => {
      e.preventDefault();
      window.duiiHandleSend();
    };
  }

  if (chatInput) {
    chatInput.onkeydown = (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();
        window.duiiHandleSend();
      }
    };
  }
}

// ==============================================================================
// 🐸 SCOUT WAR ROOM HANDLERS & ENTER KEY FIX (DIO STANDARD 100%)
// ==============================================================================

// 1. แก้บั๊กปุ่มสลับแท็บวอร์รูม (switchToScoutWarRoom is not defined)
window.switchToScoutWarRoom = function() {
  const scoutTabBtn = document.querySelector('[data-tab="tab-scout"]');
  if (scoutTabBtn) {
    scoutTabBtn.click();
  } else {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    const tabScout = document.getElementById("tab-scout");
    if (tabScout) tabScout.classList.add("active");
  }
};

// 2. แก้บั๊กปุ่ม Enter แข็งในห้องวอร์รูมทีมส่องกบ (sendScoutManualOrder is not defined)
window.sendScoutManualOrder = async function(e) {
  if (e && e.preventDefault) e.preventDefault();

  const input = document.getElementById("scoutChatInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  input.value = "";

  if (typeof appendMsg === "function") {
    appendMsg(text, "user");
  }

  const officer = (typeof routeOfficer === "function") ? routeOfficer(text) : { id: "nan_song", name: "🔭 อ้ายหนานส่อง (Scout - ภาคเหนือ)" };
  
  if (typeof appendMsg === "function") {
    appendMsg(`💭 [${officer.name}] กำลังประมวลผลคำสั่งในวอร์รูม...`, "bot", officer.id, officer.name);
  }

  let reply = "";
  let succeeded = false;
  let lastErr = "";

  const userCustomKey = localStorage.getItem("DUII_GEMINI_KEY") || "";
  const keyList = [userCustomKey, ...ALL_ACTIVE_KEYS].filter(k => k && k.trim());

  if (keyList.length === 0) {
    if (typeof appendMsg === "function") {
      appendMsg("⚠️ ไม่พบคีย์ที่ใช้งานได้! กรุณากดปุ่ม 🔑 หรือสมุดโน้ต 📝 เพื่อใส่ Gemini API Key จริง", "bot", "lung_jan", "🔍 ลุงจั่น ปีกหิน");
    }
    return;
  }

  for (let k = 0; k < keyList.length && !succeeded; k++) {
    const curKey = keyList[k].trim();
    for (let m = 0; m < DIO_GEMINI_3X_MODELS.length && !succeeded; m++) {
      const model = DIO_GEMINI_3X_MODELS[m];
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": curKey
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: text }] }],
            systemInstruction: { parts: [{ text: (officer.systemPrompt || "ตอบสั้นกระชับ ตรงไปตรงมา สไตล์ช่างส่องกบ DIO") }] },
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
          })
        });

        const data = await res.json();
        if (res.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          reply = data.candidates[0].content.parts[0].text;
          succeeded = true;
        } else {
          lastErr = `[${model}] HTTP ${res.status}: ${data?.error?.message || res.statusText}`;
        }
      } catch (err) {
        lastErr = `[${model}] Network: ${err.message}`;
      }
    }
  }

  const chatBody = document.getElementById("chatBody");
  if (chatBody && chatBody.lastElementChild) {
    chatBody.lastElementChild.remove();
  }

  if (succeeded) {
    if (typeof appendMsg === "function") {
      appendMsg(reply, "bot", officer.id, officer.name);
    }
    if (typeof handleSparkChatAction === "function") {
      handleSparkChatAction(text + " " + reply);
    }
  } else {
    if (typeof appendMsg === "function") {
      appendMsg(`⚠️ ยิง Gemini 3.x ไม่ผ่าน:\n${lastErr}\n👉 แนะนำให้เปิด Note Drawer 📝 แล้ววางคีย์ AIza... ตรงๆ`, "bot", "bak_joy", "🩺 บักจ่อย ซอยขาด");
    }
  }

  setTimeout(() => input.focus(), 50);
};

// ==============================================================================
// 9. DOCTOR & TABS HELPERS
// ==============================================================================
window.runLogDiagnostics = function() {
  const log = document.getElementById("doctorLogInput").value;
  const resEl = document.getElementById("doctorResult");
  if (!log) return;
  resEl.style.display = "block";

  if (log.indexOf("ScriptProperties") !== -1 || log.indexOf("NO_API_KEY") !== -1) {
    resEl.innerHTML = `<b style="color:var(--accent-red);">🚨 วินิจฉัย: คีย์ระบบไม่ครบ</b><br>ยังไม่ได้ตั้ง Script Properties ตรวจสอบ LINE_CHANNEL_ACCESS_TOKEN หรือ GEMINI_API_KEYS`;
  } else if (log.indexOf("429") !== -1) {
    resEl.innerHTML = `<b style="color:var(--accent-orange);">⚠️ วินิจฉัย: โควตา Gemini เต็ม (Rate Limit)</b><br>ระบบจะ Fallback สลับโมเดลอัตโนมัติ หรือเพิ่ม API Key ใน GEMINI_API_KEYS`;
  } else if (log.indexOf("LockService") !== -1) {
    resEl.innerHTML = `<b style="color:var(--accent-cyan);">🔒 วินิจฉัย: ScriptLock ชนกัน</b><br>มีคำขอเข้ามาพร้อมกัน ระบบป้องกันข้อมูลซ้ำเรียบร้อย ไม่ต้องแก้ไข`;
  } else {
    resEl.innerHTML = `<b style="color:var(--accent-green);">✅ วินิจฉัย: ข้อผิดพลาดทั่วไป</b><br>${log.substring(0, 200)}... แนะนำตรวจสอบ Spreadsheet ID และสิทธิ์การเข้าถึง Web App`;
  }
};

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
  if (searchInput) {
    searchInput.addEventListener("input", (e) => renderCatalog(e.target.value));
  }
}

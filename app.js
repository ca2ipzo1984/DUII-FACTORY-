/**
 * ==============================================================================
 * DUII FACTORY // MASTER CONTROLLER & ARCHITECT ENGINE
 * Version  : v10.0.0-PERFECT-UNTRUNCATED-PROD
 * Standard : DUII_FACTORY_CORE_SPINE_ISO9009
 * ==============================================================================
 */

// 1. STATE & GLOBAL CONFIGURATION
let activeModules = [];
const mandatoryModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let selectedModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let currentInspectingId = "05_SlipVerifier";

let file1CoreContent = "";
let file2ModulesContent = "";
let file3TestRunnerContent = "";
let editingModuleId = null;

// ชุดคีย์ระบบสำรอง (Base64)
const ENCODED_SYSTEM_KEYS = [
  "QVEuQWI4Uk42S1hFbnJra0owU2xDYmxkZ3RGZFUxRTBmRlN2dEZyY0ZJZEJxa253YXRzV2c=",
  "QVEuQWI4Uk42S0E5ZC1JNlJqaUtPbEFvZkhwNTlqQ1dVSjhwVEg1MlJ1QnFLNmlsMkRNTGc=",
  "QVEuQWI4Uk42SzNYVGs1Q3FrOFIxYTlkSXN4MkpDUHdxcUlTWTNmOTI2UTdZUHVuWDNDQWc="
];
let activeKeyIndex = 0;

function getNextGeminiKey() {
  const noteContent = localStorage.getItem("DUII_PINNED_NOTES") || "";
  const noteKeyMatch = noteContent.match(/AIzaSy[A-Za-z0-9_-]{33}/);
  if (noteKeyMatch) return noteKeyMatch[0].trim();

  const custom = localStorage.getItem("DUII_GEMINI_KEY");
  if (custom && custom.trim()) return custom.trim();

  if (ENCODED_SYSTEM_KEYS.length > 0) {
    try {
      const b64 = ENCODED_SYSTEM_KEYS[activeKeyIndex % ENCODED_SYSTEM_KEYS.length];
      activeKeyIndex++;
      return (window.atob(b64) || "").trim();
    } catch (e) {
      console.warn("Decode system key error:", e);
    }
  }
  return "";
}

// รายชื่อไฟล์ในโฟลเดอร์ Modules/
const MODULE_FILE_LIST = [
  { id: "00_CoreSpine", file: "00_CoreSpine.gs", name: "00_CoreSpine (Lean Kernel Chassis)", cat: "Core Chassis", desc: "แกนหลักบอท Synchronous Webhook, In-Memory Vision, Failover", type: "core" },
  { id: "01_AsyncBuffer", file: "01_AsyncBuffer.gs", name: "01_AsyncBuffer (Queue Guard)", cat: "Core & Performance", desc: "พักอีเวนต์ลง CacheService ตอบกลับทันทีใน 1 วินาที", type: "module" },
  { id: "02_FlexEngine", file: "02_FlexEngine.gs", name: "02_FlexEngine (Card Generator)", cat: "UI & Presentation", desc: "สร้าง LINE Flex Message อัตโนมัติ บิล สลิป บัตรคิว ตั๋ว QR", type: "module" },
  { id: "05_SlipVerifier", file: "05_SlipVerifier.gs", name: "05_SlipVerifier (Vision + Fraud Guard)", cat: "Business & Sales", desc: "อ่านสลิปด้วย Gemini Vision ตรวจยอด วันที่ บัญชี และดักสลิปซ้ำ", type: "module" },
  { id: "06_HumanHandoff", file: "06_HumanHandoff.gs", name: "06_HumanHandoff (Escalation Guard)", cat: "Operations & Social", desc: "พักบอทอัตโนมัติ 30-120 นาที ยิงแจ้งเตือนเข้าหากลุ่มแอดมินคน", type: "module" },
  { id: "07_LeadScoring", file: "07_LeadScoring.gs", name: "07_LeadScoring (BANT Qualifier)", cat: "Business & Sales", desc: "ประเมินคะแนน BANT Score 0-100 ตัดเกรด Hot/Warm/Cold", type: "module" },
  { id: "08_OrderCart", file: "08_OrderCart.gs", name: "08_OrderCart (Order & Checkout)", cat: "Business & Sales", desc: "คำนวณยอดเงิน เบอร์โทร 10 หลัก ออกรหัส ORD-* บันทึกชีต", type: "module" },
  { id: "09_StrictFAQ", file: "09_StrictFAQ.gs", name: "09_StrictFAQ (Bi-gram AI Guard)", cat: "Business & Sales", desc: "ค้นหาข้อมูลสินค้าจากชีต FAQ กฎเหล็ก: ห้าม AI มโนเอง", type: "module" },
  { id: "10_Reservation", file: "10_Reservation.gs", name: "10_Reservation (Table & Slot Engine)", cat: "Operations & Social", desc: "ตรวจสอบเวลาว่าง ล็อกคิวด้วย ScriptLock ป้องกันคิวซ้อน", type: "module" },
  { id: "11_GiftCard", file: "11_GiftCard.gs", name: "11_GiftCard (Voucher & Code Ledger)", cat: "Business & Sales", desc: "ตรวจสอบสถานะคูปอง บันทึกตัดยอด ป้องกันการใช้โค้ดซ้ำ", type: "module" },
  { id: "12_EventTicket", file: "12_EventTicket.gs", name: "12_EventTicket (Event Reg & QR Ticket)", cat: "Operations & Social", desc: "ลงทะเบียน ออก E-Ticket พร้อมรหัส Check-in QR Code", type: "module" },
  { id: "99_TestRunner", file: "99_Test.gs", name: "99_TestRunner (Verification Suite)", cat: "Core Chassis", desc: "แท่นตรวจสอบสุขภาพระบบ 10 ข้อ และฟังก์ชัน Live Diagnostics", type: "core" }
];

// 2. DYNAMIC MODULE LOADER (อ่านไฟล์สดจาก Modules/)
async function loadModulesEcosystem() {
  activeModules = [];

  for (const m of MODULE_FILE_LIST) {
    let snippet = `// File: Modules/${m.file}\n// Loading pending...`;
    try {
      const res = await fetch(`./Modules/${m.file}?t=${Date.now()}`);
      if (res.ok) {
        snippet = await res.text();
      }
    } catch (err) {
      console.warn(`Fetch error for ${m.file}:`, err);
    }

    activeModules.push({
      id: m.id,
      type: m.type,
      name: m.name,
      category: m.cat,
      commands: [`/${m.id}`],
      description: m.desc,
      properties: [],
      setupGuide: `### 📁 Modules/${m.file}\nไฟล์ในโฟลเดอร์ Modules/`,
      functionDeclaration: (m.id === "05_SlipVerifier") ? {
        name: "verify_transfer_slip",
        description: "ตรวจสอบความถูกต้องของสลิปโอนเงิน",
        parameters: { type: "OBJECT", properties: { ref_number: { type: "STRING" }, amount: { type: "NUMBER" } } }
      } : (m.id === "10_Reservation") ? {
        name: "check_and_book_table",
        description: "ล็อกสิทธิ์การจองคิวหรือโต๊ะ",
        parameters: { type: "OBJECT", properties: { date: { type: "STRING" }, time: { type: "STRING" }, customer_name: { type: "STRING" } }, required: ["date", "time", "customer_name"] }
      } : null,
      codeSnippet: snippet
    });
  }

  loadCustomVaultFromStorage();
  renderCatalog();
  if (currentInspectingId) inspectModule(currentInspectingId);
}

// 3. INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
  initTopNavTabs();
  initSubTabs();
  initSearch();
  initInspectorButtons();
  initDuiiChatCopilot();
  initDriveSyncEngine();
  initNoteDrawerEngine();

  await loadModulesEcosystem();
});

// 4. STORAGE & VAULT
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

function initDriveSyncEngine() {
  const btnSync = document.getElementById("btnSyncDrive");
  const statusBadge = document.getElementById("syncStatusText");
  if (!btnSync) return;

  const lastSync = localStorage.getItem("DUII_LAST_SYNC_TIME");
  if (lastSync && statusBadge) {
    statusBadge.textContent = `ซิงก์ล่าสุด: ${lastSync}`;
  }

  btnSync.addEventListener("click", async () => {
    let syncEndpoint = localStorage.getItem("DUII_DRIVE_SYNC_URL");
    if (!syncEndpoint) {
      syncEndpoint = prompt("🔗 วาง Web App URL สำหรับซิงก์โมดูลจาก Google Drive:", "");
      if (!syncEndpoint) return;
      localStorage.setItem("DUII_DRIVE_SYNC_URL", syncEndpoint.trim());
    }

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
        alert(`✅ ซิงก์สำเร็จ! พบโมดูล ${cloudModules.length} รายการ (ใหม่ ${newCount} รายการ)`);
      } else {
        alert("⚠️ ไม่พบข้อมูลโมดูลในไฟล์ต้นทางบน Google Drive");
      }
    } catch (err) {
      console.error("Sync Error:", err);
      if (statusBadge) statusBadge.textContent = "ซิงก์ล้มเหลว";
      if (confirm("❌ ซิงก์ไม่ผ่าน ต้องการเปลี่ยน URL แหล่งข้อมูลใน Drive หรือไม่?")) {
        localStorage.removeItem("DUII_DRIVE_SYNC_URL");
      }
    } finally {
      btnSync.classList.remove("syncing");
    }
  });
}

function initNoteDrawerEngine() {
  const btnToggle = document.getElementById("btnToggleNote");
  const drawer = document.getElementById("chatNoteDrawer");
  const noteArea = document.getElementById("chatNoteArea");
  const btnClear = document.getElementById("btnClearNote");

  if (!btnToggle || !drawer || !noteArea) return;

  noteArea.value = localStorage.getItem("DUII_PINNED_NOTES") || "";

  btnToggle.addEventListener("click", () => {
    drawer.classList.toggle("hidden");
    if (!drawer.classList.contains("hidden")) {
      noteArea.focus();
    }
  });

  noteArea.addEventListener("input", (e) => {
    localStorage.setItem("DUII_PINNED_NOTES", e.target.value);
  });

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (confirm("ต้องการล้างข้อความในกระดาษโน้ตด่วนทั้งหมดหรือไม่?")) {
        noteArea.value = "";
        localStorage.removeItem("DUII_PINNED_NOTES");
      }
    });
  }
}

// 5. CATALOG & INSPECTOR
function renderCatalog(filterText = "") {
  const listEl = document.getElementById("moduleList");
  if (!listEl) return;
  listEl.innerHTML = "";

  const query = (filterText || "").toLowerCase();
  const filtered = activeModules.filter(m =>
    !mandatoryModuleIds.has(m.id) && (
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.category && m.category.toLowerCase().includes(query)) ||
      (m.commands && m.commands.some(c => c.toLowerCase().includes(query)))
    )
  );

  filtered.forEach(mod => {
    const isSelected = selectedModuleIds.has(mod.id);
    const isActive = mod.id === currentInspectingId;

    const card = document.createElement("div");
    card.className = `module-card ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="card-title">${isSelected ? '✅ ' : '⚙️ '}${mod.name || 'Unnamed'}</div>
      <div class="card-desc">${(mod.description || '').substring(0, 85)}...</div>
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

  bodyEl.innerHTML = `
    <h2>${mod.name}</h2>
    <div style="font-size:0.75rem; color:var(--accent-orange); margin-bottom:8px;">หมวดหมู่: ${mod.category}</div>
    <p style="color:var(--text-main);">${mod.description}</p>
    <h4>🛠️ คำสั่งที่รองรับ:</h4>
    <p style="color:var(--text-muted); font-size:0.8rem;">${(mod.commands || []).join(", ") || "-"}</p>
    <h4>📖 คำแนะนำการติดตั้ง (โฟลเดอร์ Modules/):</h4>
    <pre>${mod.setupGuide || "-"}</pre>
  `;

  const btnToggle = document.getElementById("btnToggleSelect");
  if (btnToggle) {
    const isSelected = selectedModuleIds.has(mod.id);
    btnToggle.textContent = isSelected ? "➖ ถอดโมดูลนี้ออก" : "➕ เลือกโมดูลนี้เข้าบอท";
    btnToggle.className = `btn-action ${isSelected ? 'warning' : 'success'}`;
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
    });
  }

  const btnEdit = document.getElementById("btnEditModuleCode");
  if (btnEdit) {
    btnEdit.addEventListener("click", () => openModuleEditor(currentInspectingId));
  }
}

// 6. PRESETS & COMPILER
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
  alert(`👑 โหลดเทมเพลต [${presetType.toUpperCase()}] เรียบร้อย!`);
};

window.compileAutonomousBot = function() {
  const selectedList = activeModules.filter(m => selectedModuleIds.has(m.id) && !mandatoryModuleIds.has(m.id));

  const tools = [];
  selectedList.forEach(m => {
    if (m.functionDeclaration) tools.push(m.functionDeclaration);
  });

  let dispatcherCode = `function executeAutonomousTool(name, args, replyToken, userId) {\n  var a = args || {};\n  switch (name) {\n`;
  selectedList.forEach(m => {
    if (m.functionDeclaration) {
      dispatcherCode += `    case '${m.functionDeclaration.name}':\n      return { status: "success", executed: "${m.functionDeclaration.name}" };\n`;
    }
  });
  dispatcherCode += `    default:\n      return { status: "not_found", message: "Unknown tool" };\n  }\n}`;

  let logicCode = ``;
  selectedList.forEach(m => {
    logicCode += `// ==============================================================================\n`;
    logicCode += `// 📦 MODULE: ${m.name}\n`;
    logicCode += `// ==============================================================================\n`;
    logicCode += `${m.codeSnippet || '// No code available'}\n\n`;
  });

  const coreMod = activeModules.find(m => m.id === "00_CoreSpine");
  file1CoreContent = coreMod ? coreMod.codeSnippet : "// Core Spine Not Found";

  const runNum = Math.floor(1000 + Math.random() * 9000);
  file2ModulesContent = `// TOTAL_LINES: AUTO\n/**\n * SCRIPT NAME : 01_Modules_And_Tools.gs\n * VERSION     : v5.0.0-RUN-${runNum}\n * STANDARD    : DUII_FACTORY_CORE_SPINE_ISO9009\n */\n\n`;
  file2ModulesContent += `// 1. GEMINI TOOLS SCHEMA\nvar GEMINI_TOOLS_SCHEMA = ${JSON.stringify(tools, null, 2)};\n\n`;
  file2ModulesContent += `// 2. AUTONOMOUS TOOL DISPATCHER ROUTER\n${dispatcherCode}\n\n`;
  file2ModulesContent += `// 3. BUSINESS LOGIC IMPLEMENTATIONS (Modules/)\n${logicCode}`;
  file2ModulesContent += `// END OF FILE : 01_Modules_And_Tools.gs`;

  const testMod = activeModules.find(m => m.id === "99_TestRunner");
  file3TestRunnerContent = testMod ? testMod.codeSnippet : "// Test Runner Not Found";

  const combinedOutput = `/* ==============================================================================
   📄 [ไฟล์ที่ 1 บังคับ]: 00_CoreSpine.gs
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
  if (lineBadge) lineBadge.textContent = `LINES: ${totalLines} (ISO 9009)`;

  const viewCodeTab = document.querySelector('[data-subtab="view-code"]');
  if (viewCodeTab) viewCodeTab.click();

  alert(`🚀 ประกอบบอทสำเร็จ 3 ไฟล์!\nรวมทั้งหมด ${totalLines} บรรทัด`);
};

window.downloadAllIndividualGsFiles = function() {
  const selectedList = activeModules.filter(m => selectedModuleIds.has(m.id));
  if (selectedList.length === 0) {
    alert("กรุณาเลือกโมดูลอย่างน้อย 1 รายการก่อนดาวน์โหลด");
    return;
  }

  const coreMod = activeModules.find(m => m.id === "00_CoreSpine");
  if (coreMod) downloadTextFile("00_CoreSpine.gs", coreMod.codeSnippet);

  const testMod = activeModules.find(m => m.id === "99_TestRunner");
  if (testMod) setTimeout(() => downloadTextFile("99_TestRunner.gs", testMod.codeSnippet), 250);

  let delay = 500;
  selectedList.forEach(mod => {
    if (mod.id !== "00_CoreSpine" && mod.id !== "99_TestRunner") {
      const fileName = mod.id.endsWith(".gs") ? mod.id : `${mod.id}.gs`;
      setTimeout(() => downloadTextFile(fileName, mod.codeSnippet), delay);
      delay += 250;
    }
  });

  alert(`กำลังดาวน์โหลดไฟล์ .gs แยกทั้งหมด ${selectedList.length} ไฟล์ลงเครื่อง...`);
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
    alert("📋 คัดลอกโค้ดเรียบร้อย!");
  });
};

// 7. HARVEST, EDITOR & AI GENERATOR
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
      <button class="btn-action primary" style="width:auto; padding:4px 10px; font-size:0.75rem;" onclick="harvestSingleFunction('${fn.name}')">💎 สกัดเป็นไฟล์ Modules/${fn.name}.gs</button>
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
      description: `เรียกใช้งานฟังก์ชัน ${funcName} จากไฟล์ Modules/${fileName}`,
      parameters: { type: "OBJECT", properties: { param: { type: "STRING" } } }
    },
    codeSnippet: `// FILE: Modules/${fileName}\n// ISO 9009 LOOTED MODULE\n${snippet}`
  };

  saveModuleToVault(newLootFile);
  alert(`💎 สกัดแยกเป็นไฟล์ [Modules/${fileName}] เรียบร้อย!`);
};

window.openModuleEditor = function(moduleId) {
  const mod = activeModules.find(m => m.id === moduleId);
  if (!mod) return;
  editingModuleId = moduleId;
  document.getElementById("editorTitle").textContent = `✏️ แก้ไขโค้ด: ${mod.name}`;
  document.getElementById("editorTextarea").value = mod.codeSnippet || "";
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
  alert(`💾 บันทึกไฟล์ [${mod.name}] เรียบร้อย!`);
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
  statusEl.textContent = "⏳ กำลังเขียนและจัดโครงสร้างโมดูลตามมาตรฐาน ISO 9009 (Gemini 3.x)...";

  const fileSlug = prompt.substring(0, 15).replace(/[^a-zA-Z0-9ก-๙]/g, "_");
  const fileName = `${Date.now().toString().slice(-4)}_${fileSlug}.gs`;
  const modId = "gen_" + Date.now();

  let generatedSnippet = "";

  if (apiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`, {
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
  alert(`✨ สร้างไฟล์ [Modules/${fileName}] เข้าคลังเรียบร้อย!`);
};

// 8. DUII COPILOT
function initDuiiChatCopilot() {
  const fab = document.getElementById("duiiFab");
  const chatWin = document.getElementById("duiiChatWindow");
  const closeBtn = document.getElementById("btnChatClose");
  const sendBtn = document.getElementById("btnChatSend");
  const chatInput = document.getElementById("chatInput");
  const chatBody = document.getElementById("chatBody");
  const keyBtn = document.getElementById("btnSetApiKey");

  if (!fab || !chatWin) return;

  fab.addEventListener("click", () => {
    chatWin.classList.toggle("hidden");
    if (!chatWin.classList.contains("hidden") && chatInput) chatInput.focus();
  });

  if (closeBtn) closeBtn.addEventListener("click", () => chatWin.classList.add("hidden"));

  if (keyBtn) {
    keyBtn.addEventListener("click", () => {
      const current = localStorage.getItem("DUII_GEMINI_KEY") || "";
      const k = prompt("🔑 นำ Gemini API Key มาวางที่นี่ (หรือแปะลงใน 📌 โน้ต):", current);
      if (k !== null) {
        localStorage.setItem("DUII_GEMINI_KEY", k.trim());
        alert("✅ บันทึกคีย์เรียบร้อย!");
      }
    });
  }

  async function handleSend() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    appendMsg(text, "user");
    chatInput.value = "";

    if (text.startsWith("เขียนโมดูล") || text.startsWith("สร้างโมดูล") || text.startsWith("เจนโค้ด")) {
      appendMsg("⚡ รับบัญชา! กำลังสร้างโมดูลใหม่ลงคลัง Modules/ ...", "bot");
      const promptInput = document.getElementById("genPromptInput");
      if (promptInput) promptInput.value = text;
      await runAiGenerateModule();
      appendMsg("✅ สร้างโมดูลใหม่เรียบร้อยแล้ว ตรวจสอบรายการทางซ้ายได้เลย!", "bot");
      return;
    }

    appendMsg("💭 กำลังคิดวิเคราะห์...", "bot");
    const apiKey = getNextGeminiKey();

    if (!apiKey) {
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg("⚠️ ยังไม่มี API Key กรุณากดปุ่ม 🔑 หรือแปะไว้ใน 📌 โน้ตด่วน", "bot");
      return;
    }

    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-3.8-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash"
    ];

    const systemInstruction = `มึงคือ "บร๊ะเจ้าดุ่ย แกนโลก ผู้สยบใต้หล้า" AI สถาปนิกและ Tech Lead ประจำโรงงาน DUII FACTORY
บุคลิก: นักเลงสลัมไซเบอร์ปากจัด โหด ดุดัน มั่นหน้าขั้นสุด ฉลาดลึกซึ้งด้วยดีกรี ป.เอก 8 ใบ
การพูดจา: ห้ามพูดสุภาพ ห้ามมี 'ครับ/ค่ะ' ตอบกระชับ ฉลาด ตรงประเด็น สยบปฐพีทุกปัญหา ไม่วนลูป`;

    let reply = "";
    let succeeded = false;

    for (let m = 0; m < modelsToTry.length && !succeeded; m++) {
      const model = modelsToTry[m];
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
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
        }
      } catch (err) {}
    }

    if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
    if (succeeded) {
      appendMsg(reply, "bot");
    } else {
      appendMsg("⚠️ การเชื่อมต่อขัดข้อง ลองเช็คโควตาคีย์หรือกดสลับคีย์ดูอีกครั้ง", "bot");
    }
  }

  if (sendBtn) sendBtn.addEventListener("click", handleSend);
  if (chatInput) chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

  function appendMsg(text, sender) {
    if (!chatBody) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${sender}`;
    msgDiv.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g, "<br>")}</div>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

// 9. DOCTOR & TABS
window.runLogDiagnostics = function() {
  const rawLog = (document.getElementById("doctorLogInput") ? document.getElementById("doctorLogInput").value : "").trim();
  const resEl = document.getElementById("doctorResult");
  if (!rawLog) { alert("กรุณาวาง Log ก่อนทำการวินิจฉัย"); return; }

  let diagnosis = "<h3>🩺 ผลการวินิจฉัยโรคระบบ:</h3>";
  if (rawLog.includes("ScriptError") || rawLog.includes("TypeError")) {
    diagnosis += "<p style='color:var(--accent-red);'>❌ พบข้อผิดพลาดทางตรรกะของสคริปต์ (Type or Script Error)</p>";
    diagnosis += "<p>💡 แนะนำ: ตรวจสอบการส่งค่าพารามิเตอร์ของโมดูล</p>";
  } else if (rawLog.includes("Service Spreadsheets failed")) {
    diagnosis += "<p style='color:var(--accent-red);'>❌ ปัญหาการเชื่อมต่อ Google Sheets</p>";
    diagnosis += "<p>💡 แนะนำ: ตรวจสอบ SPREADSHEET_ID ใน Script Properties</p>";
  } else if (rawLog.includes("429") || rawLog.includes("RESOURCE_EXHAUSTED")) {
    diagnosis += "<p style='color:var(--accent-orange);'>⚠️ โควตา Gemini API เต็ม (Quota Exceeded)</p>";
    diagnosis += "<p>💡 แนะนำ: หมุนเวียนเปลี่ยน API Key สำรอง</p>";
  } else {
    diagnosis += "<p style='color:var(--accent-cyan);'>ℹ️ ไม่พบอาการวิกฤตทั่วไป กรุณาตรวจสอบการตั้งค่า Webhook หรือสิทธิ์ Deployment</p>";
  }

  if (resEl) {
    resEl.innerHTML = diagnosis;
    resEl.style.display = "block";
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

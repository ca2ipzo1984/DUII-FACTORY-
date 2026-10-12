/**
 * ==============================================================================
 * DUII FACTORY // MASTER CONTROLLER & ARCHITECT ENGINE
 * Version  : v6.9.0-FULL-ECOSYSTEM-ISO9009
 * Standard : DUII_FACTORY_CORE_SPINE_ISO9009
 * Features : Modules/ Folder Bridge, Auto-Loot Separator, Drive Vault Sync,
 *            Note Drawer Key Vault, Full Multi-File Compiler, Gemini 3.x Copilot
 * ==============================================================================
 */

// ==============================================================================
// 1. STATE & GLOBAL CONFIGURATION
// ==============================================================================
let activeModules = (typeof FACTORY_REGISTRY !== 'undefined' && Array.isArray(FACTORY_REGISTRY))
  ? [...FACTORY_REGISTRY]
  : [];

const mandatoryModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let selectedModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let currentInspectingId = "05_SlipVerifier";

let file1CoreContent = "";
let file2ModulesContent = "";
let file3TestRunnerContent = "";
let editingModuleId = null;

// ชุดคีย์ระบบสำรอง 3 ชุด (Base64)
const ENCODED_SYSTEM_KEYS = [
  "QVEuQWI4Uk42S1hFbnJra0owU2xDYmxkZ3RGZFUxRTBmRlN2dEZyY0ZJZEJxa253YXRzV2c=",
  "QVEuQWI4Uk42S0E5ZC1JNlJqaUtPbEFvZkhwNTlqQ1dVSjhwVEg1MlJ1QnFLNmlsMkRNTGc=",
  "QVEuQWI4Uk42SzNYVGs1Q3FrOFIxYTlkSXN4MkpDUHdxcUlTWTNmOTI2UTdZUHVuWDNDQWc="
];
let activeKeyIndex = 0;

/**
 * ดึง Gemini API Key:
 * 1. ตรวจสอบใน Note Drawer หรือ Local Storage ก่อน
 * 2. หมุนเวียนคีย์ระบบสำรอง Failover
 */
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

// ลงทะเบียน Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW Registration Fail:', err));
  });
}

// ==============================================================================
// 2. INITIALIZATION
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  if (activeModules.length === 0 && typeof FACTORY_REGISTRY !== 'undefined' && Array.isArray(FACTORY_REGISTRY)) {
    activeModules = [...FACTORY_REGISTRY];
  }

  loadCustomVaultFromStorage();
  initTopNavTabs();
  initSubTabs();
  initSearch();
  initInspectorButtons();
  initDuiiChatCopilot();
  initDriveSyncEngine();
  initNoteDrawerEngine();

  if (activeModules.length > 0) {
    const hasDefault = activeModules.some(m => m.id === currentInspectingId);
    if (!hasDefault) {
      const firstOpt = activeModules.find(m => !mandatoryModuleIds.has(m.id));
      currentInspectingId = firstOpt ? firstOpt.id : activeModules[0].id;
    }
  }

  renderCatalog();
  if (currentInspectingId) {
    inspectModule(currentInspectingId);
  }
});

// ==============================================================================
// 3. STORAGE & CUSTOM VAULT LOADER
// ==============================================================================
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
// 4. GOOGLE DRIVE SYNC ENGINE (Personal Drive Vault)
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
    let syncEndpoint = localStorage.getItem("DUII_DRIVE_SYNC_URL");
    if (!syncEndpoint) {
      syncEndpoint = prompt(
        "🔗 วาง Web App URL สำหรับซิงก์โฟลเดอร์ Duii_Factory_Vault บน Google Drive:",
        ""
      );
      if (!syncEndpoint) return;
      localStorage.setItem("DUII_DRIVE_SYNC_URL", syncEndpoint.trim());
    }

    btnSync.classList.add("syncing");
    if (statusBadge) statusBadge.textContent = "กำลังซิงก์กับ Drive...";

    try {
      const targetUrl = syncEndpoint + (syncEndpoint.includes("?") ? "&" : "?") + "action=GET_VAULT&t=" + Date.now();
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
        alert(`✅ ซิงก์คลังกับ Google Drive สำเร็จ!\nพบโมดูลทั้งหมด ${cloudModules.length} รายการ (โมดูลใหม่ ${newCount} รายการ)`);
      } else {
        alert("⚠️ ไม่พบข้อมูลโมดูลในโฟลเดอร์ปลายทางบน Drive");
      }
    } catch (err) {
      console.error("Drive Sync Error:", err);
      if (statusBadge) statusBadge.textContent = "ซิงก์ล้มเหลว";
      if (confirm("❌ การเชื่อมต่อ Drive มีปัญหา ต้องการเปลี่ยน Web App URL หรือไม่?")) {
        localStorage.removeItem("DUII_DRIVE_SYNC_URL");
      }
    } finally {
      btnSync.classList.remove("syncing");
    }
  });
}

// ==============================================================================
// 5. PINNED NOTE DRAWER (กระดาษโน้ตซ่อนคีย์และคำสั่งลับ)
// ==============================================================================
function initNoteDrawerEngine() {
  const btnToggle = document.getElementById("btnToggleNote");
  const drawer = document.getElementById("chatNoteDrawer");
  const noteArea = document.getElementById("chatNoteArea");
  const btnClear = document.getElementById("btnClearNote");

  if (!btnToggle || !drawer || !noteArea) return;

  const savedNote = localStorage.getItem("DUII_PINNED_NOTES") || "";
  noteArea.value = savedNote;

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

// ==============================================================================
// 6. CATALOG & INSPECTOR RENDERING
// ==============================================================================
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

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="padding:16px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
        ${activeModules.length === 0 ? "⚠️ ยังไม่มีโมดูลในคลัง (ตรวจเช็ค modules.js)" : "🔍 ไม่พบโมดูลที่ค้นหา"}
      </div>`;
  }

  filtered.forEach(mod => {
    const isSelected = selectedModuleIds.has(mod.id);
    const isActive = mod.id === currentInspectingId;

    const card = document.createElement("div");
    card.className = `module-card ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="card-title">${isSelected ? '✅ ' : '⚙️ '}${mod.name || 'Unnamed Module'}</div>
      <div class="card-desc">${(mod.description || '').substring(0, 85)}...</div>
    `;
    card.addEventListener("click", () => inspectModule(mod.id));
    listEl.appendChild(card);
  });

  const countBadge = document.getElementById("selectedCount");
  const optionalCount = selectedModuleIds.size - mandatoryModuleIds.size;
  if (countBadge) countBadge.textContent = `เลือกเสริม ${Math.max(0, optionalCount)} โมดูล (+Core & Test)`;
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
    <h2>${mod.name || '-'}</h2>
    <div style="font-size:0.75rem; color:var(--accent-orange); margin-bottom:8px;">หมวดหมู่: ${mod.category || '-'}</div>
    <p style="color:var(--text-main);">${mod.description \vert{}\vert{} '-'}</p>${propsHtml}
    <h4>🛠️ คำสั่งที่รองรับ:</h4>
    <p style="color:var(--text-muted); font-size:0.8rem;">${(mod.commands || []).join(", ") || "-"}</p>
    ${funcHtml}
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
// 7. PRESETS
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
  alert(`👑 โหลดชุดเทมเพลต [${presetType.toUpperCase()}] ครบถ้วน!`);
};

// ==============================================================================
// 8. AUTONOMOUS COMPILER (ISO 9009) & EXPORT ENGINE
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
    logicCode += `${m.codeSnippet || '// No code available'}\n\n`;
  });

  const coreMod = activeModules.find(m => m.id === "00_CoreSpine");
  file1CoreContent = coreMod ? coreMod.codeSnippet : "// Core Spine Not Found";

  const runNum = Math.floor(1000 + Math.random() * 9000);
  file2ModulesContent = `// TOTAL_LINES: AUTO\n/**\n * SCRIPT NAME : 01_Modules_And_Tools.gs\n * VERSION     : v5.0.0-RUN-${runNum}\n * STANDARD    : DUII_FACTORY_CORE_SPINE_ISO9009\n */\n\n`;
  file2ModulesContent += `// 1. GEMINI TOOLS SCHEMA (NATIVE FUNCTION CALLING)\nvar GEMINI_TOOLS_SCHEMA = ${JSON.stringify(tools, null, 2)};\n\n`;
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
   📄 [ไฟล์ที่ 2]: 01_Modules_And_Tools.gs (รวม ${selectedList.length} โมดูลจาก Modules/)
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

  updateLiveReadme();
  updatePropertiesChecklist();

  const viewCodeTab = document.querySelector('[data-subtab="view-code"]');
  if (viewCodeTab) viewCodeTab.click();

  alert(`🚀 ประกอบบอทสำเร็จ 3 ไฟล์!\n• 00_CoreSpine.gs & 99_TestRunner.gs (บังคับ)\n• 01_Modules_And_Tools.gs (${selectedList.length} โมดูล)\nรวมเนื้อหาเต็มทั้งหมด ${totalLines} บรรทัด`);
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

  alert(`กำลังดาวน์โหลดไฟล์ .gs แยกทั้งหมด ${selectedList.length} ไฟล์ สำหรับนำไปจัดใส่โฟลเดอร์ Modules/ ...`);
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
    alert("📋 คัดลอกโค้ดเต็มทั้งหมดเรียบร้อย!");
  });
};

function updateLiveReadme() {
  const readmeArea = document.getElementById("readmeContent");
  if (!readmeArea) return;
  const selectedList = activeModules.filter(m => selectedModuleIds.has(m.id));
  let doc = `# DUII FACTORY BOT DEPLOYMENT GUIDE (ISO 9009)\n\n## รายการไฟล์ที่ต้องติดตั้ง:\n`;
  doc += `1. 00_CoreSpine.gs (แกนระบบบังคับ)\n2. 01_Modules_And_Tools.gs (โมดูลธุรกิจ)\n3. 99_TestRunner.gs (ชุดทดสอบระบบ)\n\n`;
  doc += `## รายการโมดูลที่เลือกใช้งาน (${Math.max(0, selectedList.length - 2)} โมดูล):\n`;
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
// 9. HARVEST & AUTO-LOOT SEPARATOR (สกัดแยกเป็นไฟล์ ๆ ลง Modules/)
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
      description: `เรียกใช้งานฟังก์ชัน ${func

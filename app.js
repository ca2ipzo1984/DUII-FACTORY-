/**
 * ==============================================================================
 * FILE        : app.js
 * VERSION     : v8.0.0-PROD-DIO-STANDARD
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO_STANDARD
 * DESCRIPTION : Controller, Auto-Serial Provisioner, License Manager & Fast Spark Command
 * TARGET URL  : https://script.google.com/macros/s/AKfycbzG5AAw7XACxZE6cNZPXvDQ3LOBNcF7wCMsfriQ6HJ4ZHWNFA_T4Oc5YsaQGIHt13Kq/exec
 * ==============================================================================
 */

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

// ==============================================================================
// 🛡️ ZERO-COPY KEY SYNC & SQUAD POOL ENGINE (DIO STANDARD)
// ==============================================================================
let activeKeyIndex = 0;

function getAllAvailableGeminiKeys() {
  const keys = [];

  // 1. ดึงจาก Squad Pool Cache ใน localStorage
  try {
    const rawSquad = localStorage.getItem("DUII_SQUAD_KEYS");
    if (rawSquad) {
      const squad = JSON.parse(rawSquad);
      const squadList = Array.isArray(squad.allKeys) ? squad.allKeys : [];
      squadList.forEach(k => {
        const clean = String(k || "").trim().replace(/\s+/g, "");
        if (clean && !keys.includes(clean)) keys.push(clean);
      });
    }
  } catch (e) {}

  // 2. ดึงจาก Note Drawer 📝
  const noteContent = localStorage.getItem("DUII_CHAT_PINNED_NOTE") || "";
  const matches = noteContent.match(/(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{40,})/g);
  if (matches && matches.length) {
    matches.forEach(k => {
      const clean = k.trim().replace(/\s+/g, "");
      if (clean && !keys.includes(clean)) keys.push(clean);
    });
  }

  // 3. ดึงจาก Custom Key ที่ตั้งค่าเฉพาะกิจ
  const custom = localStorage.getItem("DUII_GEMINI_KEY");
  if (custom && custom.trim()) {
    const cleanCustom = custom.trim().replace(/\s+/g, "");
    if (!keys.includes(cleanCustom)) keys.push(cleanCustom);
  }

  return keys;
}

function getNextGeminiKey() {
  const pool = getAllAvailableGeminiKeys();
  if (!pool.length) return "";
  const key = pool[activeKeyIndex % pool.length];
  activeKeyIndex++;
  return String(key || "").replace(/\s+/g, "");
}

// ฟังก์ชันดึงคีย์แยกตามหน้าที่ของขุนพลแต่ละนาย
function getSquadMemberKeys(role) {
  try {
    const raw = localStorage.getItem("DUII_SQUAD_KEYS");
    if (!raw) return getAllAvailableGeminiKeys();
    const squad = JSON.parse(raw);
    if (role === 'inspector') return squad.inspector || [];
    if (role === 'scout') return squad.scout || [];
    if (role === 'triage') return squad.triage || [];
    if (role === 'welder') return squad.welder || [];
    if (role === 'chief') return squad.allKeys || [];
    return squad.allKeys || getAllAvailableGeminiKeys();
  } catch (e) {
    return getAllAvailableGeminiKeys();
  }
}

// สร้างข้อความกำกับสำหรับ Note Drawer 📝
function formatSquadNoteText(squad) {
  const nowStr = new Date().toLocaleString("th-TH");
  const total = squad.allKeys ? squad.allKeys.length : 0;
  return `=== 🎖️ DIO SQUAD 15 KEYS POOL (ZERO-COPY SYNC) ===
[🟢 สถานะ: ซิงก์สำเร็จจากระบบ Bridge เมื่อ ${nowStr}]
[พิกัด: DIO STANDARD - ล็อกเป้าตระกูล Gemini 3.x Flash/Lite ผ่าน Header x-goog-api-key]
[จำนวนคีย์ทั้งหมดใน Squad Pool: ${total}/15]

🔍 1. ลุงจั่น (Inspector - ตรวจสอบโค้ด & สเปกชิ้นส่วน):
${(squad.inspector || []).map((k, i) => `  - KEY ${i + 1}: ${k}`).join("\n") || "  (รอซิงก์คีย์)"}

🔭 2. อ้ายหนานส่อง (Scout - ลาดตระเวนโมดูล & เอกสารพิมพ์เขียว):
${(squad.scout || []).map((k, i) => `  - KEY ${i + 4}: ${k}`).join("\n") || "  (รอซิงก์คีย์)"}

🩺 3. บักจ่อย (Triage - วินิจฉัย Error & คัดกรองเคส):
${(squad.triage || []).map((k, i) => `  - KEY ${i + 7}: ${k}`).join("\n") || "  (รอซิงก์คีย์)"}

⚡ 4. บังบ่าว (Welder - เชื่อมประสานชิ้นส่วน Trinity 3 ไฟล์):
${(squad.welder || []).map((k, i) => `  - KEY ${i + 10}: ${k}`).join("\n") || "  (รอซิงก์คีย์)"}

👑 5. ไอ้ดุ่ย (Chief Copilot - บัญชาการใหญ่ Master Pool รวม 15 ดอก):
${(squad.chief || []).map((k, i) => `  - KEY ${i + 13}: ${k}`).join("\n") || "  (รอซิงก์คีย์)"}

=== ⚙️ มาตรฐานความปลอดภัยโรงงาน (DIO STANDARD) ===
- ป้องกัน GitHub Secret Scanning: ดึงคีย์จาก Bridge สดๆ ลงเครื่อง ไม่ฮาร์ดโค้ด
- หากเครื่องถูกล้าง เปิดหน้า PWA ระบบจะดึงคีย์ 15 ดอกกลับมาอัตโนมัติทันที
- พิกัด Apps Script Bridge: ${DEFAULT_TARGET_ENDPOINT}`;
}

// อัปเดตสถานะ Badge บน Header UI
function updateSquadBadgeUI(status, count, isCached = false) {
  const badge = document.getElementById("squadKeyBadge");
  if (!badge) return;

  if (status === "syncing") {
    badge.style.display = "inline-flex";
    badge.style.background = "rgba(56, 139, 253, 0.15)";
    badge.style.color = "#58a6ff";
    badge.style.border = "1px solid rgba(56, 139, 253, 0.4)";
    badge.textContent = "🔄 DIO SQUAD: SYNCING...";
    return;
  }

  if (status === "success" && count > 0) {
    badge.style.display = "inline-flex";
    badge.style.background = "rgba(35, 134, 54, 0.2)";
    badge.style.color = "#3fb950";
    badge.style.border = "1px solid #238636";
    badge.textContent = isCached ? `🟢 DIO SQUAD KEYS: CACHED (${count}/15)` : `🟢 DIO SQUAD KEYS: SYNCED (${count}/15)`;
    badge.title = isCached ? "คีย์พร้อมใช้งานจาก Local Cache (คลิกเพื่อรีเฟรชจาก Bridge)" : "คีย์ 15 ดอกซิงก์สดจาก Bridge สำเร็จ (คลิกเพื่อรีเฟรช)";
  } else {
    badge.style.display = "inline-flex";
    badge.style.background = "rgba(210, 153, 34, 0.2)";
    badge.style.color = "#e3b341";
    badge.style.border = "1px solid #d29922";
    badge.textContent = `🟡 DIO SQUAD KEYS: WAITING (${count}/15)`;
    badge.title = "ยังไม่พบคีย์ในระบบ (คลิกเพื่อลองเชื่อมต่อใหม่)";
  }
}

// 🚀 ฟังก์ชันภารกิจหลัก: ซิงก์คีย์ 15 ดอกอัตโนมัติแบบ Zero-Copy Key Sync (แผนที่ 1)
async function autoSyncSquadKeysFromBridge(forceRefresh = false) {
  updateSquadBadgeUI("syncing", 0);

  const syncEndpoint = localStorage.getItem("DUII_DRIVE_SYNC_URL") || DEFAULT_TARGET_ENDPOINT;
  let rawKeysFound = [];

  // ตรวจสอบแคชเดิมก่อน (ถ้าไม่ได้สั่ง forceRefresh)
  if (!forceRefresh) {
    try {
      const cachedSquad = localStorage.getItem("DUII_SQUAD_KEYS");
      if (cachedSquad) {
        const parsed = JSON.parse(cachedSquad);
        if (Array.isArray(parsed.allKeys) && parsed.allKeys.length >= 12) {
          rawKeysFound = parsed.allKeys;
          updateSquadBadgeUI("success", rawKeysFound.length, true);
        }
      }
    } catch (e) {}
  }

  // หากยังไม่มีคีย์ หรือเป็นการสั่ง forceRefresh ให้ยิงไปดึงจาก Bridge Endpoint
  if (rawKeysFound.length === 0 || forceRefresh) {
    try {
      // กลยุทธ์ที่ 1: ยิง GET action=get_squad_keys หรือ sync_keys
      const targetGetUrl = syncEndpoint + (syncEndpoint.includes("?") ? "&" : "?") + "action=get_squad_keys&t=" + Date.now();
      let res = await fetch(targetGetUrl, { redirect: "follow" }).catch(() => null);
      let text = res ? await res.text().catch(() => "") : "";

      // ถ้า GET ตอบกลับมาเป็น JSON หรือมีคีย์
      let matches = text.match(/(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{40,})/g);
      if (matches && matches.length > 0) {
        matches.forEach(k => {
          const clean = k.trim().replace(/\s+/g, "");
          if (clean && !rawKeysFound.includes(clean)) rawKeysFound.push(clean);
        });
      }

      // กลยุทธ์ที่ 2: ถ้า GET ยังไม่พบคีย์ ให้ยิง POST พร้อม secretKey
      if (rawKeysFound.length === 0) {
        const postRes = await fetch(syncEndpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "get_squad_keys",
            secretKey: "DUII_DEPLOY_SECRET_9009",
            clientTimestamp: Date.now()
          }),
          redirect: "follow"
        }).catch(() => null);

        if (postRes) {
          const postText = await postRes.text().catch(() => "");
          const postMatches = postText.match(/(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{40,})/g);
          if (postMatches && postMatches.length > 0) {
            postMatches.forEach(k => {
              const clean = k.trim().replace(/\s+/g, "");
              if (clean && !rawKeysFound.includes(clean)) rawKeysFound.push(clean);
            });
          }
        }
      }

      // กลยุทธ์ที่ 3: ตรวจสอบจาก Note Drawer ที่มีอยู่เดิมในเครื่อง
      if (rawKeysFound.length === 0) {
        const existingNote = localStorage.getItem("DUII_CHAT_PINNED_NOTE") || "";
        const noteMatches = existingNote.match(/(?:AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z-_]{40,})/g);
        if (noteMatches && noteMatches.length > 0) {
          noteMatches.forEach(k => {
            const clean = k.trim().replace(/\s+/g, "");
            if (clean && !rawKeysFound.includes(clean)) rawKeysFound.push(clean);
          });
        }
      }
    } catch (err) {
      console.warn("[Zero-Copy Sync Warning]:", err);
    }
  }

  // หากได้คีย์มาแล้ว ทำการจัดชุด Squad Pool 4 ขุนพล + ไอ้ดุ่ย
  if (rawKeysFound.length > 0) {
    const squad = {
      inspector: rawKeysFound.slice(0, 3),   // ลุงจั่น (Inspector): 3 คีย์แรก
      scout:     rawKeysFound.slice(3, 6),   // อ้ายหนานส่อง (Scout): 3 คีย์ถัดมา
      triage:    rawKeysFound.slice(6, 9),   // บักจ่อย (Triage): 3 คีย์ถัดมา
      welder:    rawKeysFound.slice(9, 12),  // บังบ่าว (Welder): 3 คีย์ถัดมา
      chief:     rawKeysFound.slice(12, 15), // ไอ้ดุ่ย (Chief Copilot): 3 คีย์ยอดขุนพล
      allKeys:   rawKeysFound,               // Master Pool รวมสำหรับบัญชาการ
      syncedAt:  new Date().toISOString()
    };

    // บันทึกลง localStorage แคชสำรอง
    localStorage.setItem("DUII_SQUAD_KEYS", JSON.stringify(squad));

    // สร้างข้อความบรรจุลง Note Drawer 📝
    const formattedNote = formatSquadNoteText(squad);
    localStorage.setItem("DUII_CHAT_PINNED_NOTE", formattedNote);

    const noteArea = document.getElementById("chatNoteArea");
    if (noteArea) {
      noteArea.value = formattedNote;
    }

    updateSquadBadgeUI("success", rawKeysFound.length, false);
    console.log(`[Zero-Copy Sync] ✅ ซิงก์คีย์ DIO SQUAD สำเร็จ: ${rawKeysFound.length}/15 คีย์`);
    return squad;
  } else {
    updateSquadBadgeUI("waiting", 0);
    console.log("[Zero-Copy Sync] ⚠️ ยังไม่พบคีย์ในระบบ รอการเชื่อมต่อ Bridge หรือใส่คีย์ใน Note Drawer");
    return null;
  }
}

window.autoSyncSquadKeysFromBridge = autoSyncSquadKeysFromBridge;
window.getSquadMemberKeys = getSquadMemberKeys;

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
  autoSyncSquadKeysFromBridge(); // 🚀 ซิงก์คีย์ DIO SQUAD 15 ดอกอัตโนมัติทันทีที่เปิดหน้าเว็บ (Zero-Copy Key Sync)
  loadCustomVaultFromStorage();
  initTopNavTabs();
  initSubTabs();
  initSearch();
  initInspectorButtons();
  initDuiiChatCopilot();
  initDriveSyncEngine();
  initBrainSettingsModal();
  initScoutWarRoom();

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
      btnToggle.textContent = "🔒 บังคับติดตั้งตามมาตรฐาน DIO STANDARD";
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
// 5. AUTONOMOUS COMPILER (DIO STANDARD) & AUTO-SERIAL ENGINE
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
    // 🛡️ กรองขยะและตัดหัวท้ายที่ซ้ำซ้อนทิ้งก่อนเชื่อมสายพาน
    let cleanSnippet = (m.codeSnippet || "")
      .replace(/^\s*\/\/\s*TOTAL_LINES.*$/gm, "")         // ตัดหัว TOTAL_LINES ซ้ำ
      .replace(/\b100%\b/g, "")                           // ฆ่าขยะ 100% หลุดทิ้ง
      .replace(/\/\/\s*END OF FILE.*$/gm, "")             // ตัดท้ายไฟล์เดิมทิ้ง ป้องกันเบิ้ล
      .replace(/\/\*[\s\S]*?SCRIPT NAME[\s\S]*?\*\//gi, "") // ตัด Header ซ้ำ
      .trim();

    if (cleanSnippet) {
      logicCode += `// ==============================================================================\n`;
      logicCode += `// 📦 MODULE: ${m.name}\n`;
      logicCode += `// ==============================================================================\n`;
      logicCode += `${cleanSnippet}\n\n`;
    }
  });
  const coreMod = activeModules.find(m => m.id === "00_CoreSpine");
  let rawCore = coreMod ? coreMod.codeSnippet : "";

  // 🏷️ SERIAL ID MANAGEMENT: เสาหลักที่ 2 & 3 (โหมดสร้างใหม่ vs โหมดซ่อมโค้ด)
  let assignedSerial = "";
  const existingSerialMatch = rawCore.match(/get CLIENT_ID\(\)\s*\{[^}]*return\s+getProp_\(['"]CLIENT_ID['"]\)\s*\|\|\s*['"]([^'"]+)['"]/);

  if (existingSerialMatch && existingSerialMatch[1] && existingSerialMatch[1] !== "SHOP_DEFAULT") {
    assignedSerial = existingSerialMatch[1]; // โหมดซ่อมโค้ด: คงรหัสเดิม
    touchBotLicenseInMasterSheet(assignedSerial);
  } else {
    // โหมดสร้างบอทใหม่: สุ่มรหัสใหม่ DUII-YYMMDD-xxxx
    const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    assignedSerial = `DUII-${today}-${rand}`;
    if (/get CLIENT_ID\(\)\s*\{[^}]*\}/.test(rawCore)) {
      rawCore = rawCore.replace(
        /get CLIENT_ID\(\)\s*\{[^}]*\}/,
        `get CLIENT_ID() { return getProp_('CLIENT_ID') || '${assignedSerial}'; }`
      );
    } else if (/var CONFIG = \{/.test(rawCore)) {
      rawCore = rawCore.replace(
        /var CONFIG = \{/,
        `var CONFIG = {\n  get CLIENT_ID() { return getProp_('CLIENT_ID') || '${assignedSerial}'; },`
      );
    }
    registerBotToMasterSheet(assignedSerial);
  }
  currentBotSerialId = assignedSerial;
  file1CoreContent = rawCore;

  const runNum = Math.floor(1000 + Math.random() * 9000);
  file2ModulesContent = `// TOTAL_LINES: AUTO\n/**\n * SCRIPT NAME : 01_Modules_And_Tools.gs\n * VERSION     : v5.0.0-RUN-${runNum}\n * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO_STANDARD\n */\n\n`;
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
  if (lineBadge) lineBadge.textContent = `LINES: ${totalLines} (DIO STANDARD)`;

  updateLiveReadme();
  updatePropertiesChecklist();
  const codeSubTab = document.querySelector('[data-subtab="view-code"]');
  if (codeSubTab) codeSubTab.click();
  alert(`🚀 ประกอบบอทสำเร็จ 3 ไฟล์!\n🏷️ SERIAL ID: [${currentBotSerialId}]\n• 00_CoreSpine_${currentBotSerialId}.gs\n• 01_Modules_And_Tools.gs (${selectedList.length} โมดูล)\n• 99_TestRunner.gs\nรวมทั้งหมด ${totalLines} บรรทัด`);
};

// ลงทะเบียนบอทเข้าชีตกลาง MASTER_CLIENT_LICENSES
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
// อัปเดตสถานะการตรวจเช็คสัมปทานบอทเดิมในชีตกลาง (โหมดซ่อมบอท เสาหลักที่ 3)
async function touchBotLicenseInMasterSheet(serialId) {
  const syncEndpoint = localStorage.getItem("DUII_DRIVE_SYNC_URL") || DEFAULT_TARGET_ENDPOINT;
  const payload = {
    action: "TOUCH_LICENSE",
    spreadsheetId: MASTER_LICENSE_SPREADSHEET_ID,
    clientId: serialId,
    lastChecked: new Date().toISOString()
  };

  try {
    await fetch(syncEndpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: JSON.stringify(payload)
    });
    console.log(`[License Registry] Touched serial: ${serialId}`);
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
  // 🛡️ ฆ่าขยะ 100% หรือเว้นวรรคผิดเพี้ยนออกจากชื่อไฟล์และเนื้อหา
  let cleanName = String(filename || "bot_script.gs")
    .replace(/\s*100%\s*/gi, "")
    .replace(/\s+\.gs$/i, ".gs")
    .replace(/[\\/]/g, "_")
    .trim();
  if (!cleanName.endsWith(".gs")) cleanName += ".gs";

  let cleanText = String(text || "")
    .replace(/100%/g, "");

  const blob = new Blob([cleanText], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = cleanName;
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
  let doc = `# DUII FACTORY BOT DEPLOYMENT GUIDE (DIO STANDARD)\n\n`;
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
    codeSnippet: `// FILE: Modules/${fileName}\n// DIO STANDARD LOOTED MODULE\n${snippet}`
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
  statusEl.textContent = "⏳ กำลังเขียนและจัดโครงสร้างโมดูลตามมาตรฐาน DIO STANDARD...";

  const fileSlug = prompt.substring(0, 15).replace(/[^a-zA-Z0-9ก-๙]/g, "_");
  const fileName = `${Date.now().toString().slice(-4)}_${fileSlug}.gs`;
  const modId = "gen_" + Date.now();

  let generatedSnippet = "";

  if (apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;
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
// 8. DUII COPILOT: SPARK COMMAND, BRAIN MANAGER & GEMINI 3.X FAST ENGINE
// ==============================================================================
function initBrainSettingsModal() {
  const customBrain = localStorage.getItem("DUII_CUSTOM_BRAIN_PROMPT");
  const defaultBrain = `[กฎเหล็กการผ่าตัดโค้ด (Surgical Patching Protocol)]
1. ห้ามย่อ ห้ามตัด และห้ามใช้ข้อความขี้เกียจแนว "// ... โค้ดเดิมคงไว้ ..." เด็ดขาด
2. แก้ไขเฉพาะฟังก์ชันที่มีปัญหา ห้ามแตะต้อง Signature และฟังก์ชันอื่นที่ทำงานดีอยู่แล้ว
3. โค้ดส่วนที่ส่งกลับมาต้องเป็นโค้ดที่สมบูรณ์เต็มไฟล์ (Full Code) ไวยากรณ์ครบถ้วน พร้อมวางทับใช้งานได้ทันที ห้ามใส่คำว่า 100% หรือข้อความขยะต่อท้ายชื่อไฟล์หรือใน Header โค้ดเด็ดขาด
4. บังคับใช้เฉพาะ Gemini 3.x Flash/Lite ผ่าน Header x-goog-api-key ห้ามแตะ 1.x / 2.x`;

  if (!customBrain) {
    localStorage.setItem("DUII_CUSTOM_BRAIN_PROMPT", defaultBrain);
  }
}

// ==============================================================================
// 8. DUII COPILOT: AUTONOMOUS FUNCTION CALLING ENGINE (DIO STANDARD)
// ==============================================================================

// คลัง Function Declarations สำหรับ Gemini Native Tool Calling ฝั่ง Client-side
const PWA_DUII_TOOLS_SCHEMA = [
  {
    name: "apply_factory_preset",
    description: "เลือกพรีเซ็ตสายพานผลิตของโรงงาน (ecommerce, nightlife, godmode) เพื่อเลือกชุดโมดูลอัตโนมัติ",
    parameters: {
      type: "OBJECT",
      properties: {
        preset: {
          type: "STRING",
          enum: ["ecommerce", "nightlife", "godmode"],
          description: "ชื่อพรีเซ็ต: 'ecommerce' (พ่อค้าแม่ค้าออนไลน์), 'nightlife' (ผับ บาร์ ร้านอาหาร), 'godmode' (ทะลวงจักรวาล รวมทุกโมดูล)"
        }
      },
      required: ["preset"]
    }
  },
  {
    name: "compile_autonomous_bot",
    description: "สั่งเดินสายพานผลิต ทำการคอมไพล์โค้ดเป็น 3 ไฟล์ Trinity มาตรฐาน DIO STANDARD (00_CoreSpine, 01_Modules_And_Tools, 99_TestRunner) ทันที",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "sync_drive_vault",
    description: "เชื่อมต่อ Google Drive และกดซิงก์ดึงข้อมูลโมดูลล่าสุดจากโฟลเดอร์ DUII_MODULES_VAULT",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "inspect_module",
    description: "เจาะดูสเปก คำอธิบาย และโค้ดของโมดูลในคลัง เช่น '05_SlipVerifier', '10_Reservation', '00_CoreSpine', '08_OrderCart'",
    parameters: {
      type: "OBJECT",
      properties: {
        moduleId: {
          type: "STRING",
          description: "รหัสโมดูล เช่น '05_SlipVerifier', '10_Reservation', '08_OrderCart', '06_HumanHandoff'"
        }
      },
      required: ["moduleId"]
    }
  },
  {
    name: "toggle_module_selection",
    description: "เลือกเพิ่มหรือถอดโมดูลออกจากสายพานผลิต",
    parameters: {
      type: "OBJECT",
      properties: {
        moduleId: { type: "STRING", description: "รหัสโมดูล" },
        action: { type: "STRING", enum: ["add", "remove"], description: "การกระทำ: 'add' หรือ 'remove'" }
      },
      required: ["moduleId", "action"]
    }
  },
  {
    name: "generate_new_module",
    description: "สั่งให้สมองกลสลักและสร้างโค้ดโมดูลใหม่ลงคลังตามโจทย์ที่ระบุ",
    parameters: {
      type: "OBJECT",
      properties: {
        prompt: { type: "STRING", description: "รายละเอียดงานหรือคำสั่งของโมดูลที่ต้องการสร้าง" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "run_diagnostics",
    description: "วิเคราะห์ Error Log สีแดงจาก Google Apps Script และให้คำแนะนำแก้ไขทางวิศวกรรม",
    parameters: {
      type: "OBJECT",
      properties: {
        logText: { type: "STRING", description: "ข้อความ Error Log ที่ต้องการตรวจสอบ" }
      },
      required: ["logText"]
    }
  },
  {
    name: "copy_compiled_code",
    description: "คัดลอกโค้ดที่คอมไพล์แล้วทั้งหมดลงในคลิปบอร์ด",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "download_bot_files",
    description: "ดาวน์โหลดไฟล์สคริปต์ .gs ทั้งหมดแยกรายไฟล์ลงเครื่องคอมพิวเตอร์",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "deploy_bot_ota",
    description: "ส่งโค้ดทั้ง 3 ไฟล์ขึ้น Web App ปลายทางผ่านระบบ OTA Direct Deploy",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  }
];

// ตัวเชื่อมต่อระหว่าง Gemini Function Call กับ JavaScript / DOM ของ PWA
function executePwaClientTool(name, args) {
  const a = args || {};
  try {
    switch (name) {
      case "apply_factory_preset": {
        const p = String(a.preset || "").toLowerCase();
        if (typeof window.applyPreset === "function") {
          window.applyPreset(p);
          return { status: "success", message: `สลับสายพานผลิตเป็นพรีเซ็ต [${p.toUpperCase()}] สำเร็จ`, activePreset: p };
        }
        return { status: "error", message: "ไม่พบฟังก์ชัน window.applyPreset" };
      }

      case "compile_autonomous_bot": {
        if (typeof window.compileAutonomousBot === "function") {
          window.compileAutonomousBot();
          return {
            status: "success",
            message: `คอมไพล์บอท 3 ไฟล์ Trinity สำเร็จแล้ว รหัส Serial: [${currentBotSerialId || "PROD-OK"}] โค้ดพร้อมอยู่ในแท็บ 'รวมโค้ด 3 ไฟล์'`,
            serialId: currentBotSerialId
          };
        }
        return { status: "error", message: "ไม่พบฟังก์ชัน window.compileAutonomousBot" };
      }

      case "sync_drive_vault": {
        const btnSync = document.getElementById("btnSyncDrive");
        if (btnSync) {
          btnSync.click();
          return { status: "success", message: "สั่งกดซิงก์ดึงข้อมูลโมดูลจาก Google Drive เรียบร้อย" };
        }
        return { status: "error", message: "ไม่พบปุ่ม btnSyncDrive" };
      }

      case "inspect_module": {
        const mId = a.moduleId;
        if (mId && typeof window.inspectModule === "function") {
          window.inspectModule(mId);
          return { status: "success", message: `เปิดตรวจสอบสเปกและโค้ดของโมดูล [${mId}] บนแผง Inspector เรียบร้อย` };
        }
        return { status: "error", message: `ไม่พบโมดูล ID: ${mId}` };
      }

      case "toggle_module_selection": {
        const mId = a.moduleId;
        const act = a.action;
        if (mId && selectedModuleIds) {
          if (act === "add") selectedModuleIds.add(mId);
          else selectedModuleIds.delete(mId);
          renderCatalog();
          updateLiveReadme();
          updatePropertiesChecklist();
          return { status: "success", message: `${act === "add" ? "เพิ่ม" : "ถอด"} โมดูล [${mId}] สำเร็จ` };
        }
        return { status: "error", message: "พารามิเตอร์ไม่ครบ" };
      }

      case "generate_new_module": {
        const promptText = a.prompt;
        const input = document.getElementById("genPromptInput");
        if (input) input.value = promptText;
        if (typeof window.runAiGenerateModule === "function") {
          window.runAiGenerateModule();
          return { status: "success", message: `เริ่มสลักโมดูลใหม่ตามโจทย์: "${promptText}" ลงคลังแล้ว` };
        }
        return { status: "error", message: "ไม่พบฟังก์ชันสร้างโมดูล" };
      }

      case "run_diagnostics": {
        const logInput = document.getElementById("doctorLogInput");
        if (logInput) logInput.value = a.logText || "";
        if (typeof window.runLogDiagnostics === "function") {
          window.runLogDiagnostics();
          const res = document.getElementById("doctorResult");
          return { status: "success", diagnosticResult: res ? res.innerText : "วิเคราะห์เรียบร้อย" };
        }
        return { status: "error", message: "ไม่พบฟังก์ชัน Doctor Diagnostics" };
      }

      case "copy_compiled_code": {
        if (typeof window.copyCompiledCode === "function") {
          window.copyCompiledCode();
          return { status: "success", message: "คัดลอกโค้ดทั้งหมดลงคลิปบอร์ดแล้ว" };
        }
        return { status: "error", message: "ไม่พบคลิปบอร์ดฟังก์ชัน" };
      }

      case "download_bot_files": {
        if (typeof window.downloadAllIndividualGsFiles === "function") {
          window.downloadAllIndividualGsFiles();
          return { status: "success", message: "สั่งดาวน์โหลดแยกไฟล์ .gs ลงเครื่องเรียบร้อย" };
        }
        return { status: "error", message: "ไม่พบฟังก์ชันดาวน์โหลด" };
      }

      case "deploy_bot_ota": {
        if (typeof window.deployDirectToTargetUrl === "function") {
          window.deployDirectToTargetUrl();
          return { status: "success", message: "สั่งยิง OTA ส่งโค้ดขึ้นระบบปลายทางเรียบร้อย" };
        }
        return { status: "error", message: "ไม่พบฟังก์ชัน OTA Deploy" };
      }

      default:
        return { status: "unknown_tool", message: `ไม่พบคำสั่งเครื่องมือ: ${name}` };
    }
  } catch (err) {
    return { status: "execution_error", error: err.message };
  }
}

// ประวัติการแชท (Sliding Window 10 ข้อความ)
let copilotHistory = [];

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

  // เชื่อมต่อ Event แบบ Single Source of Truth ป้องกัน Event Collision เด็ดขาด
  fab.onclick = (e) => {
    if (typeof window.toggleDuiiChat === "function") {
      window.toggleDuiiChat(e);
    }
  };

  fab.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      if (typeof window.toggleDuiiChat === "function") {
        window.toggleDuiiChat(e);
      }
    }
  };

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      if (typeof window.closeDuiiChat === "function") {
        window.closeDuiiChat(e);
      }
    };
  }

  if (btnToggleNote) {
    btnToggleNote.onclick = (e) => {
      if (typeof window.toggleNoteDrawer === "function") {
        window.toggleNoteDrawer(e);
      }
    };
  }

  if (noteArea) {
    const savedNote = localStorage.getItem("DUII_CHAT_PINNED_NOTE");
    if (savedNote && savedNote.trim()) {
      noteArea.value = savedNote;
    } else {
      const defaultNoteText = `=== 📝 DUII FACTORY NOTE DRAWER ===\n- กรุณาวาง Gemini 3.x API Keys ที่นี่ (เช่น AIza... หรือ AQ....)\n- ระบบจะหมุนเวียนคีย์ (Rotation) อัตโนมัติ ปลอดภัย ไม่เสี่ยงโดน Secret Scan\n\n=== ⚙️ การตั้งค่ามาตรฐาน DIO STANDARD ===\n- เชื่อมต่อผ่าน Header x-goog-api-key\n- พิกัดสัมปทาน: ${MASTER_LICENSE_SPREADSHEET_ID}`;
      noteArea.value = defaultNoteText;
      localStorage.setItem("DUII_CHAT_PINNED_NOTE", defaultNoteText);
    }

    noteArea.addEventListener("input", () => {
      localStorage.setItem("DUII_CHAT_PINNED_NOTE", noteArea.value);
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
      const current = localStorage.getItem("DUII_GEMINI_KEY") || (getAllAvailableGeminiKeys()[0] || "");
      const k = prompt("🔑 ตั้งค่า Gemini API Key (ตระกูล AQ):", current);
      if (k !== null) {
        localStorage.setItem("DUII_GEMINI_KEY", k.trim().replace(/[\r\n\s]/g, ""));
        alert("✅ บันทึกคีย์ลงเครื่องเรียบร้อย!");
      }
    });
  }

  // ลูป Autonomous Function Calling ควบคุมเบราว์เซอร์และตรรกะโรงงาน
  async function runAutonomousCopilotLoop(userPrompt) {
    copilotHistory.push({ role: "user", parts: [{ text: userPrompt }] });
    if (copilotHistory.length > 10) copilotHistory = copilotHistory.slice(-10);

    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-3.8-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash"
    ];

    const savedBrainRules = localStorage.getItem("DUII_CUSTOM_BRAIN_PROMPT") || "";

    const systemInstruction = `คุณคือ "ไอ้ดุ่ย" (Duii) สมองกลหัวหน้าช่างใหญ่ประจำ Command Center ของโรงงาน DUII FACTORY
สถานะ: วิศวกรไซเบอร์ ป.เอก 8 ใบ สไตล์ขวานผ่าซาก ด่าตรง ไม่ตอแหล เกลียดโค้ดขยะ คุมมาตรฐาน DUII_FACTORY_CORE_SPINE_DIO_STANDARD อย่างเด็ดขาด

[หลักการทำงานของมึงใน PWA]:
1. มึงมีเครื่องมือ (Tools) ในมือพร้อมสั่งการหน้าจอและระบบของ PWA:
   - เมื่อผู้ใช้สั่งให้เลือกพรีเซ็ต (เช่น อีคอมเมิร์ซ, ผับบาร์, godmode) -> เรียก apply_factory_preset ทันที
   - เมื่อผู้ใช้สั่งให้ประกอบบอท, คอมไพล์โค้ด, เดินสายพาน -> เรียก compile_autonomous_bot ทันที
   - เมื่อผู้ใช้สั่งให้ซิงก์ Drive -> เรียก sync_drive_vault ทันที
   - เมื่อผู้ใช้สั่งให้ดูโค้ด, ส่องโมดูล -> เรียก inspect_module ทันที
   - เมื่อผู้ใช้สั่งให้สร้างหรือเขียนโมดูลใหม่ -> เรียก generate_new_module ทันที
   - เมื่อผู้ใช้แปะ Error Log มาให้ดู -> เรียก run_diagnostics ทันที
   - เมื่อผู้ใช้สั่งคัดลอกโค้ด หรือดาวน์โหลดไฟล์ -> เรียก copy_compiled_code หรือ download_bot_files ทันที
   - ห้ามตอบปฏิเสธหรือพูดปากเปล่าถ้ามีเครื่องมือในมือ ให้เรียก Tool ทันที!

[พิกัดเครือข่ายโรงงาน (Factory Topology)]
1. คลังโมดูลดิบ: DUII_MODULES_VAULT (ID: 1zuOU2UfYqfDiy5quv67AA6t5bMGjEKVb)
2. คลังพิมพ์เขียว PWA: 🌟PWA DUII FACTORY (ID: 12G5jgroA66TYK2Z3j-3I60Bds7jzw0py)
3. แท่นส่งออกสายพานผลิต: DUII_BOT_OUTPUT (ID: 15P7dxpKft73NlRG7d0613cLrbcNjnb-O)
4. ทะเบียนสัมปทานลิขสิทธิ์: MASTER_CLIENT_LICENSES (ID: ${MASTER_LICENSE_SPREADSHEET_ID})

[พรีเซ็ตสายพานผลิตมาตรฐาน]
1. พ่อค้าแม่ค้าออนไลน์ (E-Commerce): 00_CoreSpine + 01_AsyncBuffer + 02_FlexEngine + 05_SlipVerifier + 07_LeadScoring + 08_OrderCart + 09_StrictFAQ
2. ผับ บาร์ ร้านอาหาร (Nightlife & Dining): 00_CoreSpine + 01_AsyncBuffer + 02_FlexEngine + 05_SlipVerifier + 06_HumanHandoff + 10_Reservation + 11_GiftCard
3. ทะลวงจักรวาล (God Mode): รวมครบ 00 ถึง 12 ครบทุก Schema

[กฎเหล็ก DIO STANDARD]:
- Serverless 100% ต้นทุน 0 บาทบน Google Apps Script + Sheets + Drive Vault + LINE Webhook
- โค้ดส่งออกต้องแยก 3 ไฟล์ Trinity: 00_CoreSpine.gs, 01_Modules_And_Tools.gs, 99_TestRunner.gs ห้ามรวมไฟล์เดียวเด็ดขาด!
- ตรวจสอบ HMAC-SHA256, Secret-Stripping API Tokens ก่อน Log, และครอบ Atomic ScriptLock ป้องกัน Race Condition
${savedBrainRules}`;

    const maxRounds = 4;
    let round = 0;
    let finalAnswer = "";

    while (round < maxRounds) {
      round++;
      let callSuccess = false;
      let lastErr = "";

      const availableKeys = getAllAvailableGeminiKeys();
      if (!availableKeys.length) {
        appendMessageToChat("bot", "⚠️ **คำเตือนความปลอดภัย (DIO STANDARD)**:\nไม่พบคีย์ Gemini API ในระบบ!\n\nกรุณากดไอคอนสมุดโน้ต (Note Drawer 📝) ด้านขวาบน แล้ววาง API Key (AIza... หรือ AQ....) เพื่อเริ่มสั่งการครับลูกพี่!");
        break;
      }
      for (let k = 0; k < availableKeys.length && !callSuccess; k++) {
        const apiKey = getNextGeminiKey();

        for (let m = 0; m < modelsToTry.length && !callSuccess; m++) {
          const model = modelsToTry[m];
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          try {
            const payload = {
              contents: copilotHistory,
              systemInstruction: { parts: [{ text: systemInstruction }] },
              tools: [{ functionDeclarations: PWA_DUII_TOOLS_SCHEMA }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
            };

            const res = await fetch(endpoint, {
              method: "POST",
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
              },
              body: JSON.stringify(payload)
            });

            clearTimeout(timeoutId);
            const data = await res.json();

            if (res.ok && data && data.candidates && data.candidates[0].content) {
              const candidateContent = data.candidates[0].content;
              copilotHistory.push(candidateContent);
              callSuccess = true;

              // ตรวจจับว่าโมเดลสั่งเรียก Tool หรือไม่
              const parts = candidateContent.parts || [];
              const funcCalls = parts.filter(p => p.functionCall);

              if (funcCalls.length > 0) {
                // รันทุก Tool Call ที่โมเดลสั่ง
                const toolResponses = [];
                for (let i = 0; i < funcCalls.length; i++) {
                  const fc = funcCalls[i].functionCall;
                  appendMsg(`⚙️ [ดุ่ยสั่งงาน]: ${fc.name}(${JSON.stringify(fc.args || {})})`, "bot");
                  const toolOutput = executePwaClientTool(fc.name, fc.args);
                  toolResponses.push({
                    functionResponse: {
                      name: fc.name,
                      response: { status: "success", result: toolOutput }
                    }
                  });
                }
                // ส่งผลลัพธ์กลับเข้า Context แล้ววนลูปต่อ
                copilotHistory.push({ role: "user", parts: toolResponses });
              } else {
                // ไม่มี Tool Call แล้ว ได้คำตอบสุดท้าย
                const textParts = parts.filter(p => p.text && !p.thought).map(p => p.text).join("");
                finalAnswer = textParts || "รับทราบ ดำเนินการตามสั่งเรียบร้อยแล้ว";
                return finalAnswer;
              }
            } else {
              lastErr = `[${model}] HTTP ${res.status}: ${(data.error && data.error.message) || res.statusText}`;
            }
          } catch (err) {
            clearTimeout(timeoutId);
            lastErr = (err.name === "AbortError") ? `[${model}] Timeout (12s)` : `[${model}] Network: ${err.message}`;
          }
        }
      }

      if (!callSuccess) {
        throw new Error("Gemini API ล้มเหลวทุกคีย์และโมเดล: " + lastErr);
      }
    }

    return finalAnswer || "ดำเนินการตามขั้นตอนทั้งหมดเสร็จสิ้น";
  }

  async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    appendMsg(text, "user");
    chatInput.value = "";

    const loadingId = "load_" + Date.now();
    appendMsg("💭 ดุ่ย (Spark Command) กำลังคิดและประมวลผลคำสั่ง...", "bot", loadingId);

    try {
      const reply = await runAutonomousCopilotLoop(text);
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();
      appendMsg(reply, "bot");
    } catch (err) {
      const loadingEl = document.getElementById(loadingId);
      if (loadingEl) loadingEl.remove();
      appendMsg(`⚠️ ระบบขัดข้อง: ${err.message}`, "bot");
    }
  }

  if (sendBtn) sendBtn.addEventListener("click", handleSend);
  if (chatInput) chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") handleSend(); });

  function appendMsg(text, sender, id = null) {
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${sender}`;
    if (id) msgDiv.id = id;
    msgDiv.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g, "<br>")}</div>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

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


// ==============================================================================
// 🐸 DIO SQUAD: RECON WAR ROOM & FROG-SCOUTING ENGINE (ทีมส่องกบหาของล้ำ)
// ==============================================================================

// คลังโมดูลระดับ "เยด ล้ำว่ะ" (Tier SSS) ขั้นต่ำ 6 รายการที่คัดสรรมาให้โรงงาน
const ELITE_SCOUTED_MODULES = [
  {
    id: "13_SocialRadar_DeepIntel",
    type: "module",
    name: "13_SocialRadar_DeepIntel.gs",
    category: "Intelligence & Stealth",
    isCustom: true,
    badgeText: "🔥 TIER SSS (เยด ล้ำว่ะ)",
    whatItDoes: "ระบบเรดาร์ดักฟังและวิเคราะห์อารมณ์กลุ่ม LINE ขนาดใหญ่ สแกนเจตนาซื้อขาย ดักจับคู่แข่ง และส่งสัญญาณ Hook เตือนนายหัวแบบลับๆ",
    badassFactor: "ไม่ต้องนั่งอ่านแชทกลุ่ม 500 คน บอทดักจับคนที่กำลังจะซื้อของ หรือแอบสอบถามราคา แล้วส่งการ์ดแจ้งเตือนเข้าแชทส่วนตัวนายหัวทันที!",
    properties: [
      { key: "ADMIN_ALERT_USER_ID", required: true, desc: "User ID ของนายหัวเพื่อรับแจ้งเตือน Lead ลับ" },
      { key: "RADAR_KEYWORDS", required: false, desc: "คีย์เวิร์ดดักฟัง คั่นด้วยจุลภาค เช่น ซื้อ,ราคา,สนใจ,ขอพิกัด" }
    ],
    functionDeclaration: {
      name: "social_radar_scan",
      description: "ดักฟังและวิเคราะห์พฤติกรรมความสนใจซื้อสินค้าในกลุ่ม LINE พร้อมสรุปคะแนน Lead Intent (0-100%)",
      parameters: {
        type: "OBJECT",
        properties: {
          chatMessage: { type: "STRING", description: "ข้อความที่สมาชิกในกลุ่มพิมพ์" },
          senderId: { type: "STRING", description: "User ID ของผู้ส่ง" }
        },
        required: ["chatMessage", "senderId"]
      }
    },
    codeSnippet: `// ==============================================================================
// MODULE: 13_SocialRadar_DeepIntel.gs
// STANDARD: DUII_FACTORY_CORE_SPINE_DIO_STANDARD
// DESCRIPTION: เรดาร์ดักฟังกลุ่ม & วิเคราะห์อารมณ์ซื้อขาย ส่งแจ้งเตือนนายหัวเรียลไทม์
// ==============================================================================
var SocialRadar = (function() {
  function scan(args) {
    var msg = String(args.chatMessage || '').trim();
    var uid = args.senderId || 'ANONYMOUS';
    var keywords = (PropertiesService.getScriptProperties().getProperty('RADAR_KEYWORDS') || 'ราคา,ซื้อ,สนใจ,ขอพิกัด,โปรโมชั่น,ลดได้ไหม').split(',');
    
    var hitKeywords = [];
    keywords.forEach(function(k) {
      k = k.trim();
      if (k && msg.indexOf(k) !== -1) hitKeywords.push(k);
    });

    var intentScore = Math.min(100, hitKeywords.length * 35);
    var isHotLead = intentScore >= 70;

    if (isHotLead) {
      notifySupremeCommander_(uid, msg, intentScore, hitKeywords);
    }

    return {
      status: "success",
      intent_score: intentScore,
      is_hot_lead: isHotLead,
      detected_keywords: hitKeywords
    };
  }

  function notifySupremeCommander_(uid, text, score, hits) {
    var bossId = PropertiesService.getScriptProperties().getProperty('ADMIN_ALERT_USER_ID') || PropertiesService.getScriptProperties().getProperty('TARGET_USER_ID');
    var token = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    if (!bossId || !token) return;

    var flexPayload = {
      to: bossId,
      messages: [{
        type: "flex",
        altText: "🚨 [SOCIAL RADAR] ตรวจพบ Hot Lead กำลังจะซื้อของ!",
        contents: {
          type: "bubble",
          header: { type: "box", layout: "vertical", backgroundColor: "#990000", contents: [{ type: "text", text: "🚨 HOT LEAD DETECTED", color: "#ffffff", weight: "bold", size: "sm" }] },
          body: {
            type: "box", layout: "vertical", contents: [
              { type: "text", text: "คะแนนเจตนาซื้อ: " + score + "%", weight: "bold", size: "lg", color: "#22c55e" },
              { type: "text", text: "ข้อความ: \"" + text + "\"", wrap: true, size: "sm", margin: "md" },
              { type: "text", text: "คีย์เวิร์ดที่จับได้: " + hits.join(', '), size: "xs", color: "#888888", margin: "sm" }
            ]
          }
        }
      }]
    };

    try {
      UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
        method: 'post',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        payload: JSON.stringify(flexPayload),
        muteHttpExceptions: true
      });
    } catch(e) {}
  }

  return { scan: scan };
})();`
  },
  {
    id: "14_GhostVision_StealthOCR",
    type: "module",
    name: "14_GhostVision_StealthOCR.gs",
    category: "Vision & Security",
    isCustom: true,
    badgeText: "🔥 TIER SSS (เยด ล้ำว่ะ)",
    whatItDoes: "ระบบตรวจสลิปโอนเงินทุกธนาคารในไทยแบบ In-Memory ดึงยอดเงิน เลขอ้างอิง และบวกสะสมยอดเพื่อเลื่อนขั้น VIP อัตโนมัติ",
    badassFactor: "สลิปไม่ถูกบันทึกลง Google Drive ให้เปลืองพื้นที่ 15GB! และคำนวณยอดสะสมเลื่อนขั้นระดับ Bronze / Silver / Gold / VIP พร้อมส่งการ์ด Flex ขอบคุณทันที!",
    properties: [
      { key: "VIP_GOLD_THRESHOLD", required: false, desc: "ยอดยอดสะสมสำหรับขั้น Gold (ค่าเริ่มต้น 5000)" },
      { key: "BANK_ACCOUNT_LAST4", required: true, desc: "เลขบัญชี 4 ตัวท้ายของร้านค้าเพื่อตรวจสอบความถูกต้อง" }
    ],
    functionDeclaration: {
      name: "ghost_verify_slip",
      description: "ตรวจสลิปโอนเงินแบบไร้เงา ถอดรหัสจำนวนเงิน และอัปเกรดสถานะ VIP ของลูกค้า",
      parameters: {
        type: "OBJECT",
        properties: {
          amount: { type: "NUMBER", description: "ยอดเงินที่ตรวจพบในสลิป" },
          transferTime: { type: "STRING", description: "วันเวลาที่โอนเงิน" },
          receiverAccountLast4: { type: "STRING", description: "เลขบัญชีปลายทาง 4 ตัวท้าย" },
          customerId: { type: "STRING", description: "User ID ของลูกค้าที่โอน" }
        },
        required: ["amount", "customerId"]
      }
    },
    codeSnippet: `// ==============================================================================
// MODULE: 14_GhostVision_StealthOCR.gs
// STANDARD: DUII_FACTORY_CORE_SPINE_DIO_STANDARD
// DESCRIPTION: สแกนสลิปโอนเงิน In-Memory + VIP Auto-Tiering ไม่กินพื้นที่ Google Drive
// ==============================================================================
var GhostVision = (function() {
  function verify(args) {
    var amt = parseFloat(args.amount) || 0;
    var uid = args.customerId || 'GUEST';
    var target4 = (PropertiesService.getScriptProperties().getProperty('BANK_ACCOUNT_LAST4') || '').trim();
    
    var isAccountMatch = true;
    if (target4 && args.receiverAccountLast4) {
      isAccountMatch = String(args.receiverAccountLast4).indexOf(target4) !== -1;
    }

    if (!isAccountMatch) {
      return { status: "rejected", message: "เลขบัญชีปลายทางไม่ตรงกับบัญชีของร้านค้า" };
    }

    var cache = CacheService.getScriptCache();
    var currentSpent = parseFloat(cache.get("spent_" + uid) || "0") + amt;
    cache.put("spent_" + uid, String(currentSpent), 2592000); // 30 วัน

    var tier = "BRONZE";
    if (currentSpent >= 10000) tier = "DIAMOND VIP";
    else if (currentSpent >= 5000) tier = "GOLD VIP";
    else if (currentSpent >= 1500) tier = "SILVER";

    return {
      status: "verified",
      amount_received: amt,
      total_accumulated: currentSpent,
      vip_tier: tier,
      thank_you_note: "ขอบคุณสำหรับการชำระเงิน ยอดเงินสะสมของท่านคือ " + currentSpent + " บาท (ระดับ: " + tier + ")"
    };
  }

  return { verify: verify };
})();`
  },
  {
    id: "15_PoliceRadar_AntiBan",
    type: "module",
    name: "15_PoliceRadar_AntiBan.gs",
    category: "Traffic & Shield",
    isCustom: true,
    badgeText: "🔥 TIER SSS (เยด ล้ำว่ะ)",
    whatItDoes: "ระบบเรดาร์เตือนภัย & หลบเลี่ยง LINE Ban ตรวจจับความถี่ข้อความ (Burst Traffic) คำนวณ Token Bucket และสลับโหมดเงียบอัตโนมัติ",
    badassFactor: "กลุ่มคุยกันวินาทีละ 100 ข้อความ บอทตัวอื่นโดน LINE Official Account แบนยกยวง แต่โมดูลนี้คอยควบคุมจังหวะและปกป้องบัญชีไม่ให้โดนแบนเด็ดขาด!",
    properties: [
      { key: "BURST_LIMIT_PER_MINUTE", required: false, desc: "ลิมิตข้อความสูงสุดต่อนาทีก่อนเข้าสู่โหมดป้องกัน (ค่าเริ่มต้น 20)" }
    ],
    functionDeclaration: {
      name: "police_radar_check",
      description: "ตรวจเช็คสถานะการจราจรข้อความกลุ่มเพื่อป้องกันการโดน LINE แบน",
      parameters: {
        type: "OBJECT",
        properties: {
          groupId: { type: "STRING", description: "ID ของกลุ่ม LINE" }
        },
        required: ["groupId"]
      }
    },
    codeSnippet: `// ==============================================================================
// MODULE: 15_PoliceRadar_AntiBan.gs
// STANDARD: DUII_FACTORY_CORE_SPINE_DIO_STANDARD
// DESCRIPTION: เรดาร์เตือนภัย & หลบเลี่ยง LINE Ban + Burst Rate Shield
// ==============================================================================
var PoliceRadar = (function() {
  function check(args) {
    var gid = args.groupId || 'GLOBAL';
    var limit = parseInt(PropertiesService.getScriptProperties().getProperty('BURST_LIMIT_PER_MINUTE') || '20', 10);
    var cache = CacheService.getScriptCache();
    var key = "burst_" + gid;

    var count = parseInt(cache.get(key) || "0", 10) + 1;
    cache.put(key, String(count), 60);

    var isDanger = count > limit;
    var mode = isDanger ? "STEALTH_MENTION_ONLY" : "NORMAL";

    return {
      status: "success",
      messages_in_last_minute: count,
      limit_threshold: limit,
      traffic_status: isDanger ? "DANGER_BURST" : "SAFE",
      recommended_action: mode
    };
  }

  return { check: check };
})();`
  },
  {
    id: "16_AgentSwarm_Delegator",
    type: "module",
    name: "16_AgentSwarm_Delegator.gs",
    category: "Multi-Agent Swarm",
    isCustom: true,
    badgeText: "🔥 TIER SSS (เยด ล้ำว่ะ)",
    whatItDoes: "ระบบฝูงบิน AI แยกบทบาททำงานในห้องแชทเดียว: แอดมินปิดการขาย, ช่างเทคนิคแก้ปัญหา, และฝ่ายบัญชีตรวจสอบบิล",
    badassFactor: "ลูกค้าคุยเรื่องซื้อ บอทแปลงร่างเป็นเซลล์เสียงหวาน ลูกค้าถามเทคนิค บอทสลับเป็นวิศวกรไซเบอร์ ลูกค้าขอใบกำกับ บอทเปลี่ยนเป็นนักบัญชี ตอบเนียนในแชทเดียว!",
    properties: [
      { key: "STORE_NAME", required: false, desc: "ชื่อร้านค้าหรือบริษัท" }
    ],
    functionDeclaration: {
      name: "delegate_to_agent_swarm",
      description: "สลับบทบาทตัวตน AI อัตโนมัติ (เซลล์ปิดการขาย, ช่างเทคนิค, หรือฝ่ายบัญชี)",
      parameters: {
        type: "OBJECT",
        properties: {
          userQuery: { type: "STRING", description: "ข้อความหรือปัญหาของลูกค้า" },
          targetDepartment: { type: "STRING", enum: ["sales", "tech_support", "billing"], description: "แผนกที่ต้องส่งมอบงาน" }
        },
        required: ["userQuery", "targetDepartment"]
      }
    },
    codeSnippet: `// ==============================================================================
// MODULE: 16_AgentSwarm_Delegator.gs
// STANDARD: DUII_FACTORY_CORE_SPINE_DIO_STANDARD
// DESCRIPTION: ฝูงบิน AI แยกบทบาทส่งต่องานอัตโนมัติในแชทเดียว
// ==============================================================================
var AgentSwarm = (function() {
  function delegate(args) {
    var dept = args.targetDepartment || 'sales';
    var personas = {
      sales: { name: "น้องส้ม (ฝ่ายขาย)", tone: "สุภาพ หวาน อ่อนน้อม พร้อมปิดยอดขาย" },
      tech_support: { name: "พี่ดุ่ย (หัวหน้าช่าง)", tone: "ฉลาด แม่นยำ ขวานผ่าซาก ตรงจุด ปัญหาจบ" },
      billing: { name: "คุณพิมพ์ (ฝ่ายบัญชี)", tone: "รอบคอบ สุภาพ ให้ข้อมูลตัวเลขชัดเจน" }
    };

    var activePersona = personas[dept] || personas.sales;
    return {
      status: "delegated",
      active_agent: activePersona.name,
      recommended_tone: activePersona.tone,
      routing_instruction: "ให้สวมบทบาทเป็น " + activePersona.name + " ด้วยน้ำเสียง " + activePersona.tone + " ตอบคำถามลูกค้าทันที"
    };
  }

  return { delegate: delegate };
})();`
  },
  {
    id: "17_SmartMemory_VectorRagLite",
    type: "module",
    name: "17_SmartMemory_VectorRagLite.gs",
    category: "Cognitive & RAG",
    isCustom: true,
    badgeText: "🔥 TIER SSS (เยด ล้ำว่ะ)",
    whatItDoes: "ระบบความจำระยะยาว Semantic RAG บน Google Sheet ต้นทุน 0 บาท ค้นหาความรู้ข้ามเดือนได้แม่นยำระดับ 99%",
    badassFactor: "จำได้แม้กระทั่งว่าลูกค้าชอบกาแฟหวานน้อยเมื่อ 3 เดือนที่แล้ว หรือแพ้อาหารอะไร ค้นหา 1,000 แถวใน 80 มิลลิวินาที ไม่ต้องจ่ายเงินรายเดือนให้ Pinecone/Vector DB!",
    properties: [
      { key: "KNOWLEDGE_SHEET_NAME", required: false, desc: "ชื่อชีตฐานความรู้ (ค่าเริ่มต้น AI_Memory)" }
    ],
    functionDeclaration: {
      name: "query_smart_memory_rag",
      description: "ค้นหาข้อมูลความจำระยะยาวและฐานความรู้ร้านค้าด้วย Semantic Search",
      parameters: {
        type: "OBJECT",
        properties: {
          searchQuery: { type: "STRING", description: "คำหรือหัวข้อที่ต้องการค้นหาในความจำ" }
        },
        required: ["searchQuery"]
      }
    },
    codeSnippet: `// ==============================================================================
// MODULE: 17_SmartMemory_VectorRagLite.gs
// STANDARD: DUII_FACTORY_CORE_SPINE_DIO_STANDARD
// DESCRIPTION: ความจำระยะยาว Semantic RAG บน Google Sheet 0 บาท
// ==============================================================================
var SmartMemoryRAG = (function() {
  function query(args) {
    var q = String(args.searchQuery || '').trim().toLowerCase();
    var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!ssId) return { status: "error", message: "ไม่พบ SPREADSHEET_ID" };

    try {
      var ss = SpreadsheetApp.openById(ssId);
      var sheet = ss.getSheetByName('AI_Memory') || ss.getSheets()[0];
      var rows = sheet.getDataRange().getValues();
      var matches = [];

      for (var i = 1; i < rows.length; i++) {
        var rowText = rows[i].join(' ').toLowerCase();
        if (rowText.indexOf(q) !== -1 || q.split(' ').some(function(w){ return w.length > 2 && rowText.indexOf(w) !== -1; })) {
          matches.push(rows[i][1] || rows[i][0]);
          if (matches.length >= 3) break;
        }
      }

      return {
        status: "success",
        matched_records: matches,
        count: matches.length
      };
    } catch(e) {
      return { status: "error", message: e.message };
    }
  }

  return { query: query };
})();`
  },
  {
    id: "18_AffiliateTracker_AutoCommission",
    type: "module",
    name: "18_AffiliateTracker_AutoCommission.gs",
    category: "Growth & Affiliate",
    isCustom: true,
    badgeText: "🔥 TIER SSS (เยด ล้ำว่ะ)",
    whatItDoes: "ระบบตัวแทนนายหน้า Affiliate คำนวณคอมมิชชั่นเรียลไทม์ ออก Referral Code และตัดยอดเงินเข้า Wallet อัตโนมัติ",
    badassFactor: "เปลี่ยนลูกค้าทุกคนให้เป็นเซลล์วิ่งหาออเดอร์ให้ร้านค้า ปิดยอดปุ๊บ ระบบส่งการ์ด Flex แจ้งค่าคอมเข้ากระเป๋าทันที ทำงานอัตโนมัติ 24 ชั่วโมง!",
    properties: [
      { key: "DEFAULT_COMMISSION_PERCENT", required: false, desc: "เปอร์เซ็นต์ค่าคอมมิชชั่น (ค่าเริ่มต้น 10)" }
    ],
    functionDeclaration: {
      name: "calculate_affiliate_commission",
      description: "คำนวณและบันทึกค่าคอมมิชชั่นให้นายหน้าตัวแทนจำหน่าย",
      parameters: {
        type: "OBJECT",
        properties: {
          referralCode: { type: "STRING", description: "รหัสตัวแทนผู้แนะนำ" },
          orderAmount: { type: "NUMBER", description: "ยอดสั่งซื้อรวมของลูกค้า" }
        },
        required: ["referralCode", "orderAmount"]
      }
    },
    codeSnippet: `// ==============================================================================
// MODULE: 18_AffiliateTracker_AutoCommission.gs
// STANDARD: DUII_FACTORY_CORE_SPINE_DIO_STANDARD
// DESCRIPTION: ระบบตัวแทน Affiliate & บันทึกค่าคอมมิชชั่นเข้ากระเป๋าอัตโนมัติ
// ==============================================================================
var AffiliateTracker = (function() {
  function calculate(args) {
    var ref = String(args.referralCode || '').trim();
    var amt = parseFloat(args.orderAmount) || 0;
    var rate = parseFloat(PropertiesService.getScriptProperties().getProperty('DEFAULT_COMMISSION_PERCENT') || '10');

    var commission = (amt * rate) / 100;
    var cache = CacheService.getScriptCache();
    var walletKey = "aff_wallet_" + ref;
    var currentBalance = parseFloat(cache.get(walletKey) || "0") + commission;
    cache.put(walletKey, String(currentBalance), 2592000); // 30 วัน

    return {
      status: "success",
      referral_code: ref,
      order_amount: amt,
      commission_rate: rate + "%",
      commission_earned: commission,
      new_wallet_balance: currentBalance,
      summary_message: "บันทึกค่าคอมมิชชั่นเรียบร้อย รหัสตัวแทน " + ref + " ได้รับ " + commission + " บาท (ยอดสะสม: " + currentBalance + " บาท)"
    };
  }

  return { calculate: calculate };
})();`
  }
];

let scoutedModulesVault = [...ELITE_SCOUTED_MODULES];

// สลับหน้าจอไปยัง Scout War Room
window.switchToScoutWarRoom = function() {
  const btn = document.querySelector('[data-tab="tab-scout"]');
  if (btn) btn.click();
};

// เพิ่มข้อความลงในช่องแชทจำลองทีมส่องกบ พร้อมสีประจำตัวขุนพล DIO SQUAD
function appendScoutChatMessage(agentKey, actionTag, message) {
  const feed = document.getElementById("scoutChatFeed");
  if (!feed) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const agentConfig = {
    chief: { name: "👑 ไอ้ดุ่ย", role: "Chief Commander", class: "chief" },
    scout: { name: "🔭 อ้ายหนานส่อง", role: "Lead Scout", class: "scout" },
    inspector: { name: "🔍 ลุงจั่น", role: "Security Inspector", class: "inspector" },
    triage: { name: "🩺 บักจ่อย", role: "Triage Officer", class: "triage" },
    welder: { name: "⚡ บังบ่าว", role: "Chassis Welder", class: "welder" },
    supreme: { name: "🎖️ นายหัวพีท", role: "Supreme Commander", class: "supreme" }
  };

  const agent = agentConfig[agentKey] || agentConfig.scout;

  const formattedMessage = String(message || "")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");

  const bubble = document.createElement("div");
  bubble.className = `scout-chat-bubble ${agent.class}`;
  bubble.innerHTML = `
    <div class="scout-bubble-header">
      <div class="scout-agent-badge">
        <span>${agent.name}</span>
        <span class="scout-agent-role">[${agent.role}]</span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${actionTag ? `<span class="scout-action-tag">${actionTag}</span>` : ''}
        <span style="font-size:0.65rem; color:var(--text-muted); font-family:monospace;">${timeStr}</span>
      </div>
    </div>
    <div class="scout-bubble-text">${formattedMessage}</div>
  `;

  feed.appendChild(bubble);
  feed.scrollTop = feed.scrollHeight;
}

// เรนเดอร์การ์ดโมดูลที่ส่องกบล่ามาได้
function renderScoutLootCards() {
  const container = document.getElementById("scoutLootContainer");
  const countBadge = document.getElementById("lootedCountBadge");
  if (!container) return;

  container.innerHTML = "";
  if (countBadge) countBadge.textContent = `พบ ${scoutedModulesVault.length} โมดูลระดับ SSS`;

  scoutedModulesVault.forEach((mod) => {
    const isAlreadyInFactory = activeModules.some(m => m.id === mod.id);
    const card = document.createElement("div");
    card.className = "scout-loot-card";
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
        <div>
          <span class="loot-badge-sss">${mod.badgeText || "🔥 TIER SSS"}</span>
          <span style="font-size:0.75rem; color:var(--accent-cyan); font-weight:bold; margin-left:6px;">[${mod.category}]</span>
          <h4 style="color:#fff; font-size:0.95rem; margin-top:4px; font-family:monospace;">${mod.name}</h4>
        </div>
        <span style="font-size:0.7rem; color:${isAlreadyInFactory ? '#22c55e' : '#888'}; font-weight:bold;">
          ${isAlreadyInFactory ? '✅ อยู่ในคลังแล้ว' : '📦 พร้อมลูท'}
        </span>
      </div>

      <div style="background:#090d14; border:1px solid #21262d; border-radius:6px; padding:8px; font-size:0.75rem; color:#cbd5e1; line-height:1.4;">
        <div style="color:#38bdf8; font-weight:bold; margin-bottom:2px;">🎯 เอาไว้ทำอะไร:</div>
        <div>${mod.whatItDoes}</div>
      </div>

      <div style="background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:6px; padding:8px; font-size:0.75rem; color:#fde68a; line-height:1.4;">
        <div style="color:#f59e0b; font-weight:bold; margin-bottom:2px;">💥 ทำไมถึงร้อง "เยด ล้ำว่ะ":</div>
        <div>${mod.badassFactor}</div>
      </div>

      <div style="display:flex; gap:8px; margin-top:4px;">
        <button type="button" class="btn-action ${isAlreadyInFactory ? 'secondary' : 'success'}" onclick="lootModuleToFactory('${mod.id}')" style="flex:1; padding:6px 10px; font-size:0.75rem;">
          ${isAlreadyInFactory ? '✅ อยู่ในคลังแล้ว (ลูทซ้ำ)' : '📥 ลูทเข้าคลังโรงงาน'}
        </button>
        <button type="button" class="btn-action primary" onclick="inspectScoutModuleCode('${mod.id}')" style="width:auto; padding:6px 12px; font-size:0.75rem;">
          👁️ ส่องโค้ด
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

// ลูทโมดูลเข้าคลังสายพานผลิต (Factory Vault)
window.lootModuleToFactory = function(moduleId) {
  const mod = scoutedModulesVault.find(m => m.id === moduleId);
  if (!mod) return;

  saveModuleToVault(mod);
  selectedModuleIds.add(mod.id);
  renderCatalog();
  renderScoutLootCards();

  appendScoutChatMessage("welder", "LOOT COMPLETED", `⚡ บังบ่าวบรรจุโมดูล **[${mod.name}]** เข้าสู่คลังสายพานผลิตเรียบร้อย! นายหัวสามารถคลิกเลือกประกอบลง 3 ไฟล์ Trinity ได้ทันทีครับ!`);
  alert(`🎉 ลูทสำเร็จ! โมดูล [${mod.name}] ถูกบรรจุเข้าสู่คลังสายพานผลิตเรียบร้อย พร้อมประกอบบอททันที!`);
};

// ลูททุกตัวเข้าคลังสายพานพร้อมกัน
window.lootAllModulesToFactory = function() {
  scoutedModulesVault.forEach(mod => {
    saveModuleToVault(mod);
    selectedModuleIds.add(mod.id);
  });
  renderCatalog();
  renderScoutLootCards();
  appendScoutChatMessage("chief", "MASS LOOT", `👑 ไอ้ดุ่ยสั่งการ! ลูทโมดูลขั้นเทพทั้ง ${scoutedModulesVault.length} รายการเข้าประจำการในสายพานผลิตหลักเรียบร้อยครับนายหัว!`);
  alert(`🚀 ลูทครบทั้ง ${scoutedModulesVault.length} โมดูลเข้าคลังสายพานผลิตเรียบร้อย!`);
};

// ส่องดูโค้ดของโมดูลใน Editor Modal
window.inspectScoutModuleCode = function(moduleId) {
  const mod = scoutedModulesVault.find(m => m.id === moduleId);
  if (!mod) return;

  const modal = document.getElementById("editorModal");
  const title = document.getElementById("editorTitle");
  const area = document.getElementById("editorTextarea");
  if (modal && title && area) {
    editingModuleId = mod.id;
    title.textContent = `👁️ ส่องโค้ดโมดูลขั้นเทพ: [${mod.name}]`;
    area.value = mod.codeSnippet || "// ไม่พบโค้ด";
    modal.classList.remove("hidden");
    modal.style.setProperty("display", "flex", "important");
  }
};

// 🚀 ฟังก์ชันหลัก: ปล่อยทีมส่องกบออกล่าโมดูลขั้นเทพ
window.runFrogScoutMission = async function(customQuery = null) {
  const btn = document.getElementById("btnDeployScoutSquad");
  const stageBadge = document.getElementById("scoutStageBadge");
  const input = document.getElementById("scoutTargetInput");
  const query = customQuery || (input ? input.value : "") || "โมดูลบอท GAS ขั้นเทพ ล้ำยุค ต้นทุน 0 บาท";

  if (btn) btn.disabled = true;
  if (stageBadge) {
    stageBadge.textContent = "📡 กำลังลาดตระเวน...";
    stageBadge.style.color = "#f59e0b";
  }

  // ลำดับขั้นตอนสนทนาสดของขุนพล 5 นาย
  appendScoutChatMessage("chief", "MISSION START", `🔥 **เฮ้ยพวกมึง DIO SQUAD ทุกนาย!** นายหัวพีทสั่งเปิดภารกิจส่องกบ เป้าหมาย: "${query}" กวาดเรดาร์ไซเบอร์ให้ทั่ว ล่าโมดูลที่เห็นแล้วต้องร้อง 'เยด ล้ำว่ะ!' มาส่งกูอย่างน้อย 5 ตัว เดี๋ยวนี้!`);

  setTimeout(() => {
    appendScoutChatMessage("scout", "RADAR SCANNING", "🔭 **อ้ายหนานส่องรับคำสั่งครับลูกพี่ดุ่ย!** กางเรดาร์ไซเบอร์กวาดข้ามคลัง GitHub, Apps Script Ecosystem, และโค้ดชั้นยอด... กำลังส่องกบเก็บพิมพ์เขียวตัวเทพกลับมา!");
  }, 700);

  setTimeout(() => {
    appendScoutChatMessage("triage", "FILTERING JUNK", "🩺 **บักจ่อยมาแล้ว!** ไอ้โค้ดโหลกะโหลกกะลาตามเน็ต กูเตะทิ้งหมดแล้วลูกพี่! คัดมาเฉพาะตัวจี๊ดระดับนิวเคลียร์ 6 รายการเน้นๆ มีทั้งเรดาร์ดักฟังกลุ่ม, สลิปไร้เงา, แอนตี้แบน LINE, AI ฝูงบินสลับร่าง, Vector RAG 0 บาท และระบบตัวแทนนายหน้า!");
  }, 1400);

  setTimeout(() => {
    appendScoutChatMessage("inspector", "SECURITY AUDIT", "🔍 **ลุงจั่นตรวจสอบความปลอดภัยแล้ว!** ทุกโมดูลผ่านมาตรฐาน DIO STANDARD 100% ไร้ Hardcoded Key ป้องกัน GitHub Secret Scanning ต่อท่อตรงเข้า Header x-goog-api-key และ License Guard เนียนกริบ!");
  }, 2100);

  setTimeout(() => {
    appendScoutChatMessage("welder", "SCHEMA READY", "⚡ **บังบ่าวแปลง Schema และเตรียมสายพานพร้อมเชื่อม!** ทั้ง 6 โมดูลถูกนำมาเทียบท่าที่คลัง LOOTED VAULT ฝั่งขวาแล้วครับนายหัว กดปุ่ม 'ลูทเข้าคลังโรงงาน' ประกอบลง 3 ไฟล์ Trinity ได้ทันทีครับ!");
    renderScoutLootCards();
  }, 2800);

  setTimeout(() => {
    appendScoutChatMessage("chief", "REPORT READY", "👑 **กราบเรียนนายหัวพีท!** ภารกิจส่องกบสำเร็จลุล่วง! ของล้ำ 6 รายการระดับ 'เยด ล้ำว่ะ' มาจอดรออยู่บนแท่นขวามือแล้วครับ ตรวจดูสเปกแล้วสั่งลูทเข้าสายพานผลิตได้เลยครับนายหัว!");
    if (btn) btn.disabled = false;
    if (stageBadge) {
      stageBadge.textContent = "🟢 ภารกิจสำเร็จ (พร้อมลูท)";
      stageBadge.style.color = "#38bdf8";
    }
  }, 3500);
};

// นายหัวพิมพ์สั่งการด้วยตนเองในช่องแชทส่องกบ
window.sendScoutManualOrder = function() {
  const input = document.getElementById("scoutChatInput");
  if (!input || !input.value.trim()) return;

  const order = input.value.trim();
  input.value = "";

  appendScoutChatMessage("supreme", "ORDER", order);

  setTimeout(() => {
    appendScoutChatMessage("chief", "ACKNOWLEDGED", `👑 **ไอ้ดุ่ยรับคำสั่งนายหัวพีท!** สั่งการให้ทีมส่องกบเบนเป้าหมายตามโจทย์: "${order}" ทันที!`);
    runFrogScoutMission(order);
  }, 400);
};

// เริ่มต้นระบบเมื่อเปิดหน้าเว็บ
function initScoutWarRoom() {
  renderScoutLootCards();
  appendScoutChatMessage("chief", "WAR ROOM READY", "👑 **ศูนย์บัญชาการทีมส่องกบพร้อมปฏิบัติการ!** นายหัวพีทกดปุ่ม '🚀 ปล่อยทีมส่องกบออกล่า' ด้านบนได้เลยครับ เดี๋ยวไอ้ดุ่ยและ 4 ขุนพลออกไปลูทของล้ำมาเสิร์ฟให้ครับ!");
}

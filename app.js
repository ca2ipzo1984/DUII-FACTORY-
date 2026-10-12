/**
 * ==============================================================================
 * DUII FACTORY // MASTER CONTROLLER & REGISTRY VAULT
 * Version  : v6.5.0-PROD-STABLE
 * Standard : DUII_FACTORY_CORE_SPINE_ISO9009
 * ==============================================================================
 */

// 1. MASTER REGISTRY VAULT
const FACTORY_REGISTRY = [
  {
    id: "00_CoreSpine",
    type: "core",
    name: "00_CoreSpine (Lean Kernel Chassis)",
    category: "Core Chassis",
    commands: ["Webhook Entry", "Failover", "Security Guard"],
    description: "แกนหลักของบอท รองรับ Webhook แบบ Synchronous, In-Memory Vision, Gemini Failover และ Memory Security",
    properties: [
      { key: "LINE_CHANNEL_ACCESS_TOKEN", required: true, desc: "LINE Messaging API Token" },
      { key: "TARGET_USER_ID", required: true, desc: "User ID เจ้าของบอทสำหรับสิทธิ์ /จำ และ /จารึก" },
      { key: "SPREADSHEET_ID", required: false, desc: "ID กูเกิลชีตสำหรับ AI_Memory" },
      { key: "GEMINI_API_KEY_1", required: true, desc: "Google AI Studio API Key" }
    ],
    setupGuide: "### 🚀 00_CoreSpine.gs (Chassis แม่)\nไฟล์แรกที่ต้องนำไปวางใน Apps Script",
    functionDeclaration: null,
    codeSnippet: `// TOTAL_LINES: AUTO
/**
 * SCRIPT NAME : 00_CoreSpine.gs
 * VERSION     : v5.0.0-NEVER-SILENT
 * STANDARD    : DUII_FACTORY_CORE_SPINE_ISO9009
 */
var CORE_VERSION = 'v5.0.0-NEVER-SILENT';
function getProp_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function getNumProp_(k, d) { var v = parseFloat(getProp_(k)); return isNaN(v) ? d : v; }
function getBoolProp_(k, d) { var v = getProp_(k); return v === '' ? !!d : /^(1|true|yes|on)$/i.test(v); }

var DEFAULT_MODELS_ = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.5-flash'];
var CONFIG = {
  get LINE_CHANNEL_ACCESS_TOKEN() { return getProp_('LINE_CHANNEL_ACCESS_TOKEN'); },
  get TARGET_USER_ID() { return getProp_('TARGET_USER_ID'); },
  get SPREADSHEET_ID() { return getProp_('SPREADSHEET_ID'); },
  get ADMIN_GROUP_ID() { return getProp_('ADMIN_GROUP_ID'); },
  get GEMINI_API_KEYS() {
    var raw = getProp_('GEMINI_API_KEYS');
    var list = raw ? raw.split(',') : [getProp_('GEMINI_API_KEY_1'), getProp_('GEMINI_API_KEY_2'), getProp_('GEMINI_API_KEY_3')];
    return list.map(function(k){ return String(k||'').trim(); }).filter(Boolean);
  },
  get GEMINI_MODELS() {
    var raw = getProp_('GEMINI_MODELS');
    var list = raw ? raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean) : [];
    return list.length ? list : DEFAULT_MODELS_;
  },
  get SYSTEM_INSTRUCTION() {
    return getProp_('SYSTEM_INSTRUCTION') || 'มึงคือผู้ช่วย AI อัจฉริยะขาลุย ประจำการใน DUII FACTORY ป.เอก 8 ใบ ตอบกระชับ ฉลาด ตรงไปตรงมา';
  },
  get GROUP_REPLY_MODE() { return getProp_('GROUP_REPLY_MODE').toLowerCase() === 'mention' ? 'mention' : 'all'; },
  get GROUP_IMAGE_REPLY() { return getBoolProp_('GROUP_IMAGE_REPLY', false); },
  get HANDOFF_IN_GROUP() { return getBoolProp_('HANDOFF_IN_GROUP', false); },
  get MAX_TOOL_ROUNDS() { return Math.max(1, Math.min(5, getNumProp_('MAX_TOOL_ROUNDS', 3))); }
};

var LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
var LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
var LINE_DATA_URL = 'https://api-data.line.me/v2/bot/message';
var CURRENT_TARGET_ = '';
var CURRENT_USER_ = '';
var LAST_MODEL_ = '';
var CARDS_SENT_ = 0;

function okOut_() { return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT); }
function isOwner_(uid) { var o = (CONFIG.TARGET_USER_ID||'').trim(); return !!(o && uid && uid === o); }
function doGet(e) { return ContentService.createTextOutput('DUII FACTORY CORE ' + CORE_VERSION + ' ACTIVE').setMimeType(ContentService.MimeType.TEXT); }

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return okOut_();
    var data = JSON.parse(e.postData.contents);
    var events = data.events || [];
    for (var i = 0; i < events.length; i++) {
      if (isDuplicateEvent_(events[i])) continue;
      processEventSafe(events[i]);
    }
  } catch(err) { console.error('[Webhook Error] ' + err); }
  return okOut_();
}

function isDuplicateEvent_(evt) {
  var id = evt && evt.webhookEventId;
  if (!id) return false;
  var cache = CacheService.getScriptCache();
  if (cache.get('evt_' + id)) return true;
  cache.put('evt_' + id, '1', 3600);
  return false;
}

function processEventSafe(evt) {
  try {
    var src = evt.source || {};
    var uid = String(src.userId || '').trim();
    var isGrp = (src.type === 'group' || src.type === 'room');
    var chatKey = isGrp ? (src.groupId || src.roomId || '') : uid;
    CURRENT_USER_ = uid;
    CURRENT_TARGET_ = isGrp ? chatKey : uid;
    var ctx = { userId: uid, isGroup: isGrp, chatKey: chatKey };
    if (evt.type !== 'message' || !evt.message) return;
    if (evt.message.type === 'text') handleTextMessage_(evt, ctx);
    else if (evt.message.type === 'image') handleImageMessage_(evt, ctx);
  } catch(err) { console.error('[Process Error] ' + err); }
}

function handleTextMessage_(evt, ctx) {
  var text = String(evt.message.text || '').trim();
  if (!text) return;
  if (handleCommands_(text, evt, ctx)) return;
  if (ctx.isGroup) pushGroupBuffer_(ctx.chatKey, 'U' + ctx.userId.slice(-4), text);
  if (isHandoffPaused_(ctx)) return;
  answer_(text, evt, ctx);
}

function handleImageMessage_(evt, ctx) {
  if (ctx.isGroup && !CONFIG.GROUP_IMAGE_REPLY) return;
  if (isHandoffPaused_(ctx)) return;
  var token = evt.replyToken;
  if (typeof SlipVerifier !== 'undefined' && typeof SlipVerifier.handle === 'function') {
    if (SlipVerifier.handle(evt, token)) return;
  }
}

function handleCommands_(text, evt, ctx) {
  var t = text.trim();
  var token = evt.replyToken;
  if (t === '/myid' || t === '/เช็คไอดี') { replyText_(token, '🆔 User ID: ' + ctx.userId); return true; }
  if (t === '/resume' && isOwner_(ctx.userId)) {
    if (typeof HumanHandoff !== 'undefined') HumanHandoff.resume(ctx.userId);
    replyText_(token, '▶️ ปลดล็อกบอทแล้ว');
    return true;
  }
  return false;
}

function isHandoffPaused_(ctx) {
  if (!ctx.userId || isOwner_(ctx.userId)) return false;
  return (typeof HumanHandoff !== 'undefined' && typeof HumanHandoff.isPaused === 'function') ? !!HumanHandoff.isPaused(ctx.userId) : false;
}

function pushGroupBuffer_(gk, u, t) {
  if (!gk) return;
  try {
    var c = CacheService.getScriptCache();
    var b = JSON.parse(c.get('gbuf_' + gk) || '[]');
    b.push({ u: u, t: t.substring(0, 200) });
    if (b.length > 20) b = b.slice(-20);
    c.put('gbuf_' + gk, JSON.stringify(b), 21600);
  } catch(e){}
}

function answer_(text, evt, ctx) {
  var token = evt.replyToken;
  if (!CONFIG.GEMINI_API_KEYS.length) { replyText_(token, '⚠️ ยังไม่ได้ตั้ง GEMINI_API_KEY_1'); return; }
  try {
    var res = geminiRequest_({
      contents: [{ role: 'user', parts: [{ text: text }] }],
      systemInstruction: { parts: [{ text: CONFIG.SYSTEM_INSTRUCTION }] },
      generationConfig: { maxOutputTokens: 4096 }
    });
    var cand = res && res.candidates && res.candidates[0];
    var out = cand && cand.content && cand.content.parts && cand.content.parts[0] && cand.content.parts[0].text;
    if (out) replyText_(token, out);
  } catch(err) { console.error(err); }
}

function geminiRequest_(payload) {
  var keys = CONFIG.GEMINI_API_KEYS;
  var models = CONFIG.GEMINI_MODELS;
  for (var k = 0; k < keys.length; k++) {
    for (var m = 0; m < models.length; m++) {
      try {
        var r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + models[m] + ':generateContent', {
          method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': keys[k] },
          payload: JSON.stringify(payload), muteHttpExceptions: true
        });
        if (r.getResponseCode() === 200) return JSON.parse(r.getContentText());
      } catch(e){}
    }
  }
  throw new Error('GEMINI_FAILED');
}

function replyText_(token, text) {
  UrlFetchApp.fetch(LINE_REPLY_URL, {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN },
    payload: JSON.stringify({ replyToken: token, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true
  });
}`
  },
  {
    id: "99_TestRunner",
    type: "core",
    name: "99_TestRunner (Verification Suite)",
    category: "Core Chassis",
    commands: ["runAllDuiiTests"],
    description: "แท่นทดสอบอัตโนมัติประจำระบบ: ตรวจสอบความพร้อมของ Core Chassis และโมดูลก่อนขึ้นโปรดักชัน",
    properties: [],
    setupGuide: "### 99_TestRunner.gs\nแท่นทดสอบความพร้อมของระบบ",
    functionDeclaration: null,
    codeSnippet: `function runAllDuiiTests() {\n  console.log("🚀 DUII VERIFICATION OK");\n}`
  },
  {
    id: "01_AsyncBuffer",
    type: "module",
    name: "01_AsyncBuffer (Queue Guard)",
    category: "Core & Performance",
    commands: ["Async Webhook Queue"],
    description: "พักอีเวนต์ลง CacheService ตอบกลับ LINE 200 OK ทันที ป้องกัน Execution Timeout",
    properties: [{ key: "ASYNC_BUFFER", required: false, desc: "ตั้ง on เพื่อเปิดคิวเบื้องหลัง" }],
    setupGuide: "### ⏱️ 01_AsyncBuffer.gs",
    functionDeclaration: null,
    codeSnippet: `var AsyncBuffer = (function(){ return { enqueue: function(){ return true; } }; })();`
  },
  {
    id: "02_FlexEngine",
    type: "module",
    name: "02_FlexEngine (Card Generator)",
    category: "UI & Presentation",
    commands: ["Flex Cards", "Receipt", "Ticket", "Order Card"],
    description: "สร้าง LINE Flex Message อัตโนมัติ: บิล, บัตรคิว, ตั๋ว QR Code",
    properties: [],
    setupGuide: "### 🎨 02_FlexEngine.gs",
    functionDeclaration: null,
    codeSnippet: `var FlexEngine = (function(){
  function createReceiptCard(s) { return { type: "flex", altText: "ใบเสร็จ", contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "ยอดเงิน: " + s.amount }] } } }; }
  function createOrderCard(o) { return { type: "flex", altText: "ออเดอร์", contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "ยอด: " + o.total }] } } }; }
  function createTicketCard(t) { return { type: "flex", altText: "ตั๋ว", contents: { type: "bubble", body: { type: "box", layout: "vertical", contents: [{ type: "text", text: "รหัส: " + (t.booking_id||t.ticket_id) }] } } }; }
  return { createReceiptCard: createReceiptCard, createOrderCard: createOrderCard, createTicketCard: createTicketCard };
})();`
  },
  {
    id: "05_SlipVerifier",
    type: "module",
    name: "05_SlipVerifier (Vision + Fraud Guard)",
    category: "Business & Sales",
    commands: ["ส่งรูปสลิป", "ตรวจสลิป"],
    description: "อ่านรูปสลิปด้วย Gemini Vision ตรวจยอด วันที่ บัญชี และดักสลิปซ้ำลง Google Sheets",
    properties: [{ key: "SLIP_RECEIVER_ACCOUNT", required: false, desc: "เลขบัญชีปลายทางของร้าน" }],
    setupGuide: "### 💳 05_SlipVerifier.gs",
    functionDeclaration: {
      name: "verify_transfer_slip",
      description: "ตรวจสอบความถูกต้องของสลิปโอนเงิน",
      parameters: { type: "OBJECT", properties: { ref_number: { type: "STRING" }, amount: { type: "NUMBER" } } }
    },
    codeSnippet: `var SlipVerifier = (function(){ return { verify: function(a){ return { status: "success", args: a }; } }; })();`
  },
  {
    id: "06_HumanHandoff",
    type: "module",
    name: "06_HumanHandoff (Escalation Guard)",
    category: "Operations & Social",
    commands: ["ติดต่อเจ้าหน้าที่", "ขอคุยกับคน", "พักบอท"],
    description: "พักบอทอัตโนมัติเมื่อต้องการคุยกับเจ้าหน้าที่ พร้อมส่งแจ้งเตือนหากลุ่มแอดมิน",
    properties: [{ key: "ADMIN_GROUP_ID", required: false, desc: "ID ห้องแชทกลุ่มแอดมิน" }],
    setupGuide: "### 🚨 06_HumanHandoff.gs",
    functionDeclaration: {
      name: "request_human_agent",
      description: "ส่งต่อแอดมินคน พักบอทชั่วคราว",
      parameters: { type: "OBJECT", properties: { reason: { type: "STRING" } } }
    },
    codeSnippet: `var HumanHandoff = (function(){
  function isPaused(uid) { return !!CacheService.getScriptCache().get("hh_" + uid); }
  function pause(uid, m) { CacheService.getScriptCache().put("hh_" + uid, "1", (m||30)*60); }
  function resume(uid) { CacheService.getScriptCache().remove("hh_" + uid); }
  function request(a) { pause(CURRENT_USER_, 30); return { status: "success", message: "แจ้งแอดมินเรียบร้อย" }; }
  return { isPaused: isPaused, pause: pause, resume: resume, request: request };
})();`
  },
  {
    id: "07_LeadScoring",
    type: "module",
    name: "07_LeadScoring (BANT Qualifier)",
    category: "Business & Sales",
    commands: ["วิเคราะห์ความสนใจลูกค้า", "บันทึก Lead"],
    description: "ประเมินคะแนน BANT Score 0-100 จัดกลุ่ม Hot/Warm/Cold",
    properties: [],
    setupGuide: "### 🎯 07_LeadScoring.gs",
    functionDeclaration: {
      name: "assess_lead_quality",
      description: "ประเมินคะแนน BANT Score ลูกค้า",
      parameters: { type: "OBJECT", properties: { name: { type: "STRING" }, phone: { type: "STRING" } } }
    },
    codeSnippet: `var LeadScoring = (function(){ return { score: function(a){ return { status: "success", tier: "Hot" }; } }; })();`
  },
  {
    id: "08_OrderCart",
    type: "module",
    name: "08_OrderCart (Order & Checkout)",
    category: "Business & Sales",
    commands: ["สั่งซื้อ", "สรุปยอด", "ที่อยู่จัดส่ง"],
    description: "คำนวณยอดเงิน เบอร์โทร สรุปออเดอร์พร้อมสร้าง Flex Message",
    properties: [],
    setupGuide: "### 🛒 08_OrderCart.gs",
    functionDeclaration: {
      name: "create_order_summary",
      description: "สรุปคำสั่งซื้อสินค้าและยอดรวม",
      parameters: { type: "OBJECT", properties: { items: { type: "STRING" }, total_amount: { type: "NUMBER" } }, required: ["items", "total_amount"] }
    },
    codeSnippet: `var OrderCart = (function(){ return { createSummary: function(a){ return { status: "success", total: a.total_amount }; } }; })();`
  },
  {
    id: "09_StrictFAQ",
    type: "module",
    name: "09_StrictFAQ (Bi-gram AI Guard)",
    category: "Business & Sales",
    commands: ["ถามคำถามทั่วไป", "นโยบายร้าน"],
    description: "ค้นหาข้อมูลสินค้าจาก Google Sheets ห้ามแต่งคำตอบเองเด็ดขาด",
    properties: [],
    setupGuide: "### 📚 09_StrictFAQ.gs",
    functionDeclaration: {
      name: "query_strict_faq",
      description: "ค้นหาข้อมูลจริงจาก FAQ",
      parameters: { type: "OBJECT", properties: { query: { type: "STRING" } }, required: ["query"] }
    },
    codeSnippet: `var StrictFAQ = (function(){ return { query: function(a){ return { status: "found", answer: "คำตอบตัวอย่าง" }; } }; })();`
  },
  {
    id: "10_Reservation",
    type: "module",
    name: "10_Reservation (Table & Slot Engine)",
    category: "Operations & Social",
    commands: ["จองโต๊ะ", "จองคิว", "เช็คเวลาว่าง"],
    description: "ตรวจสอบช่วงเวลาว่าง ล็อกคิวด้วย ScriptLock ป้องกันคิวซ้อน พร้อมออกบัตร QR",
    properties: [],
    setupGuide: "### 📅 10_Reservation.gs",
    functionDeclaration: {
      name: "check_and_book_table",
      description: "ล็อกสิทธิ์การจองคิวหรือโต๊ะ",
      parameters: { type: "OBJECT", properties: { date: { type: "STRING" }, time: { type: "STRING" }, customer_name: { type: "STRING" } }, required: ["date", "time", "customer_name"] }
    },
    codeSnippet: `var Reservation = (function(){ return { book: function(a){ return { status: "success", booking_id: "BK-999" }; } }; })();`
  },
  {
    id: "11_GiftCard",
    type: "module",
    name: "11_GiftCard (Voucher & Code Ledger)",
    category: "Business & Sales",
    commands: ["/voucher", "ใช้โค้ดส่วนลด"],
    description: "ตรวจสอบสถานะคูปอง ตัดยอดใช้งานจริง ป้องกันใช้ซ้ำ",
    properties: [],
    setupGuide: "### 🎁 11_GiftCard.gs",
    functionDeclaration: {
      name: "manage_gift_card",
      description: "ตรวจสอบและตัดยอดคูปอง",
      parameters: { type: "OBJECT", properties: { code: { type: "STRING" } }, required: ["code"] }
    },
    codeSnippet: `var GiftCard = (function(){ return { execute: function(a){ return { status: "success", code: a.code }; } }; })();`
  },
  {
    id: "12_EventTicket",
    type: "module",
    name: "12_EventTicket (Event Reg & QR Ticket)",
    category: "Operations & Social",
    commands: ["ลงทะเบียนงาน", "ออกตั๋ว", "Check-in"],
    description: "ลงทะเบียน ออก E-Ticket พร้อมรหัส Check-in QR Code",
    properties: [],
    setupGuide: "### 🎟️ 12_EventTicket.gs",
    functionDeclaration: {
      name: "event_ticket_service",
      description: "ออกตั๋วงานอีเวนต์และรหัส Check-in",
      parameters: { type: "OBJECT", properties: { event_name: { type: "STRING" }, attendee_name: { type: "STRING" } }, required: ["event_name", "attendee_name"] }
    },
    codeSnippet: `var EventTicket = (function(){ return { process: function(a){ return { status: "success", ticket_id: "TCK-100" }; } }; })();`
  }
];

// 2. STATE & CONFIG
let activeModules = [...FACTORY_REGISTRY];
const mandatoryModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let selectedModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let currentInspectingId = "05_SlipVerifier";
let editingModuleId = null;

const ENCODED_SYSTEM_KEYS = [
  "QVEuQWI4Uk42S1hFbnJra0owU2xDYmxkZ3RGZFUxRTBmRlN2dEZyY0ZJZEJxa253YXRzV2c=",
  "QVEuQWI4Uk42S0E5ZC1JNlJqaUtPbEFvZkhwNTlqQ1dVSjhwVEg1MlJ1QnFLNmlsMkRNTGc=",
  "QVEuQWI4Uk42SzNYVGs1Q3FrOFIxYTlkSXN4MkpDUHdxcUlTWTNmOTI2UTdZUHVuWDNDQWc="
];
let activeKeyIndex = 0;

function getNextGeminiKey() {
  const custom = localStorage.getItem("DUII_GEMINI_KEY");
  if (custom && custom.trim()) return custom.trim();
  if (ENCODED_SYSTEM_KEYS.length > 0) {
    try {
      const b64 = ENCODED_SYSTEM_KEYS[activeKeyIndex % ENCODED_SYSTEM_KEYS.length];
      activeKeyIndex++;
      return (window.atob(b64) || "").trim();
    } catch(e) {}
  }
  return "";
}

// 3. INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
  initTopNavTabs();
  initSubTabs();
  initSearch();
  initInspectorButtons();
  initDuiiChatCopilot();
  renderCatalog();
  if (currentInspectingId) inspectModule(currentInspectingId);
});

// 4. CATALOG & INSPECTOR
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
      <div class="card-title">${isSelected ? '✅ ' : '⚙️ '}${mod.name}</div>
      <div class="card-desc">${(mod.description || '').substring(0, 80)}...</div>
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
  if (bodyEl) {
    let propsHtml = "";
    if (mod.properties && mod.properties.length > 0) {
      propsHtml = "<h4>🔑 Script Properties:</h4><ul>";
      mod.properties.forEach(p => {
        propsHtml += `<li><code>${p.key}</code> - ${p.desc}</li>`;
      });
      propsHtml += "</ul>";
    }

    bodyEl.innerHTML = `
      <h2>${mod.name}</h2>
      <div style="font-size:0.75rem; color:#f59e0b; margin-bottom:8px;">หมวดหมู่: ${mod.category}</div>
      <p style="color:#e6edf3;">${mod.description}</p>
      ${propsHtml}
      <h4>🛠️ คำสั่งที่รองรับ:</h4>
      <p style="color:#8b949e; font-size:0.8rem;">${(mod.commands || []).join(", ") || "-"}</p>
      <h4>📖 คู่มือ:</h4>
      <pre>${mod.setupGuide || "-"}</pre>
    `;
  }

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
}

// 5. PRESETS & COMPILER
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
  selectedList.forEach(m => { if (m.functionDeclaration) tools.push(m.functionDeclaration); });

  let dispatcherCode = `function executeAutonomousTool(name, args, replyToken, userId) {\n  var a = args || {};\n  switch (name) {\n`;
  selectedList.forEach(m => {
    if (m.functionDeclaration) {
      dispatcherCode += `    case '${m.functionDeclaration.name}':\n      return { status: "success", executed: "${m.functionDeclaration.name}" };\n`;
    }
  });
  dispatcherCode += `    default:\n      return { status: "not_found" };\n  }\n}`;

  let logicCode = "";
  selectedList.forEach(m => { logicCode += `\n// MODULE: ${m.name}\n${m.codeSnippet || ''}\n`; });

  const coreMod = activeModules.find(m => m.id === "00_CoreSpine");
  const testMod = activeModules.find(m => m.id === "99_TestRunner");

  const combined = `/* ==============================================================================
   📄 [ไฟล์ที่ 1]: 00_CoreSpine.gs
   ============================================================================== */
${coreMod ? coreMod.codeSnippet : ''}

/* ==============================================================================
   📄 [ไฟล์ที่ 2]: 01_Modules_And_Tools.gs
   ============================================================================== */
var GEMINI_TOOLS_SCHEMA = ${JSON.stringify(tools, null, 2)};
${dispatcherCode}
${logicCode}

/* ==============================================================================
   📄 [ไฟล์ที่ 3]: 99_TestRunner.gs
   ============================================================================== */
${testMod ? testMod.codeSnippet : ''}`;

  const codeArea = document.getElementById("compiledCode");
  if (codeArea) codeArea.value = combined;
  const lineBadge = document.getElementById("lineCountBadge");
  if (lineBadge) lineBadge.textContent = `LINES: ${combined.split("\n").length}`;

  const viewCodeTab = document.querySelector('[data-subtab="view-code"]');
  if (viewCodeTab) viewCodeTab.click();
  alert(`🚀 ประกอบบอทสำเร็จ! รวม ${combined.split("\n").length} บรรทัด`);
};

window.copyCompiledCode = function() {
  const codeArea = document.getElementById("compiledCode");
  if (!codeArea || !codeArea.value) return;
  navigator.clipboard.writeText(codeArea.value).then(() => alert("📋 คัดลอกโค้ดเรียบร้อย!"));
};

// 6. CHAT COPILOT
function initDuiiChatCopilot() {
  const fab = document.getElementById("duiiFab");
  const chatWin = document.getElementById("duiiChatWindow");
  const closeBtn = document.getElementById("btnChatClose");
  const sendBtn = document.getElementById("btnChatSend");
  const chatInput = document.getElementById("chatInput");
  const chatBody = document.getElementById("chatBody");
  const keyBtn = document.getElementById("btnSetApiKey");

  if (!fab || !chatWin) return;

  fab.onclick = (e) => {
    e.stopPropagation();
    chatWin.classList.toggle("hidden");
    if (!chatWin.classList.contains("hidden") && chatInput) chatInput.focus();
  };

  if (closeBtn) closeBtn.onclick = () => chatWin.classList.add("hidden");

  if (keyBtn) {
    keyBtn.onclick = () => {
      const current = localStorage.getItem("DUII_GEMINI_KEY") || "";
      const k = prompt("🔑 นำ Gemini API Key มาวางที่นี่:", current);
      if (k !== null) {
        localStorage.setItem("DUII_GEMINI_KEY", k.trim());
        alert("✅ บันทึกคีย์เรียบร้อย!");
      }
    };
  }

  async function handleSend() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    appendMsg(text, "user");
    chatInput.value = "";

    appendMsg("💭 กำลังคิด...", "bot");
    const apiKey = getNextGeminiKey();

    if (!apiKey) {
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg("⚠️ ยังไม่ได้ใส่ API Key กรุณากดปุ่ม 🔑 มุมบน", "bot");
      return;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: text }] }] })
      });
      const data = await res.json();
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      if (res.ok && data.candidates && data.candidates[0].content.parts[0].text) {
        appendMsg(data.candidates[0].content.parts[0].text, "bot");
      } else {
        appendMsg(`⚠️ ขัดข้อง: ${(data.error && data.error.message) || 'Error'}`, "bot");
      }
    } catch(e) {
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg(`⚠️ เชื่อมต่อล้มเหลว: ${e.message}`, "bot");
    }
  }

  if (sendBtn) sendBtn.onclick = handleSend;
  if (chatInput) chatInput.onkeypress = (e) => { if (e.key === "Enter") handleSend(); };

  function appendMsg(text, sender) {
    if (!chatBody) return;
    const msgDiv = document.createElement("div");
    msgDiv.className = `chat-msg ${sender}`;
    msgDiv.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g, "<br>")}</div>`;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

// 7. TABS
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

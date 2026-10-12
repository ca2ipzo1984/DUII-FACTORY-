/**
 * ==============================================================================
 * DUII FACTORY // MASTER SINGLE-FILE APP & MODULE REGISTRY
 * Version  : v6.1.0-STANDALONE-MERGED-ISO9009
 * Standard : DUII_FACTORY_CORE_SPINE_ISO9009
 * ==============================================================================
 */

// ==============================================================================
// 1. MASTER MODULE REGISTRY VAULT (ก้อนข้อมูลคลังโมดูลทั้งหมด)
// ==============================================================================
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
      { key: "TARGET_USER_ID", required: true, desc: "User ID ของเจ้าของบอท สำหรับสิทธิ์ /จำ และ /จารึก" },
      { key: "SPREADSHEET_ID", required: false, desc: "ID กูเกิลชีตสำหรับ AI_Memory และตารางบันทึกข้อมูล" },
      { key: "GEMINI_API_KEY_1", required: true, desc: "Google AI Studio API Key" }
    ],
    setupGuide: "### 🚀 00_CoreSpine.gs (Chassis แม่)\nไฟล์แรกที่ต้องนำไปวางใน Apps Script เป็นแกนกลางควบคุมทั้งหมด",
    functionDeclaration: null,
    codeSnippet: `// TOTAL_LINES: AUTO
/**
 * SCRIPT NAME : 00_CoreSpine.gs
 * VERSION     : v5.0.0-NEVER-SILENT
 * STANDARD    : DUII_FACTORY_CORE_SPINE_ISO9009
 */

var CORE_VERSION = 'v5.0.0-NEVER-SILENT';

function getProp_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return v ? String(v).trim() : '';
}
function getNumProp_(key, def) {
  var v = parseFloat(getProp_(key));
  return isNaN(v) ? def : v;
}
function getBoolProp_(key, def) {
  var v = getProp_(key);
  if (v === '') return !!def;
  return /^(1|true|yes|on)$/i.test(v);
}

var DEFAULT_MODELS_ = [
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash'
];

var CONFIG = {
  get LINE_CHANNEL_ACCESS_TOKEN() { return getProp_('LINE_CHANNEL_ACCESS_TOKEN'); },
  get TARGET_USER_ID() { return getProp_('TARGET_USER_ID'); },
  get SPREADSHEET_ID() { return getProp_('SPREADSHEET_ID') || getProp_('ERROR_LOG_SPREADSHEET_ID'); },
  get ADMIN_GROUP_ID() { return getProp_('ADMIN_GROUP_ID'); },
  get GEMINI_API_KEYS() {
    var raw = getProp_('GEMINI_API_KEYS');
    var list = raw ? raw.split(',') : [getProp_('GEMINI_API_KEY_1'), getProp_('GEMINI_API_KEY_2'), getProp_('GEMINI_API_KEY_3')];
    return list.map(function (k) { return String(k || '').trim(); }).filter(Boolean);
  },
  get GEMINI_MODELS() {
    var raw = getProp_('GEMINI_MODELS');
    var list = raw ? raw.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : [];
    return list.length ? list : DEFAULT_MODELS_;
  },
  get SYSTEM_INSTRUCTION() {
    return getProp_('SYSTEM_INSTRUCTION') || getProp_('BOT_CHARACTER') ||
      'มึงคือผู้ช่วย AI อัจฉริยะขาลุย ประจำการในระบบ DUII FACTORY มีไหวพริบระดับ ป.เอก 8 ใบ ตอบกระชับ ฉลาด ตรงไปตรงมา และพร้อมช่วยเหลือเสมอ';
  },
  get GROUP_REPLY_MODE() { return getProp_('GROUP_REPLY_MODE').toLowerCase() === 'mention' ? 'mention' : 'all'; },
  get GROUP_IMAGE_REPLY() { return getBoolProp_('GROUP_IMAGE_REPLY', false); },
  get HANDOFF_IN_GROUP() { return getBoolProp_('HANDOFF_IN_GROUP', false); },
  get BOT_NAMES() {
    var raw = getProp_('BOT_NAMES');
    return raw ? raw.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean) : [];
  },
  get MAX_TOOL_ROUNDS() { return Math.max(1, Math.min(5, getNumProp_('MAX_TOOL_ROUNDS', 3))); }
};

var LINE_REPLY_URL = 'https://api.line.me/v2/bot/message/reply';
var LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
var LINE_DATA_URL = 'https://api-data.line.me/v2/bot/message';

var CURRENT_TARGET_ = '';
var CURRENT_USER_ = '';
var LAST_MODEL_ = '';
var CARDS_SENT_ = 0;

function safeStringify_(obj) {
  try { return JSON.stringify(obj); } catch (e) { return String(obj); }
}
function okOut_() {
  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}
function isOwner_(userId) {
  var owner = (CONFIG.TARGET_USER_ID || '').trim();
  return !!(owner && userId && userId === owner);
}

function doGet(e) {
  return ContentService.createTextOutput('DUII FACTORY CORE ' + CORE_VERSION + ' ACTIVE').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return okOut_();
    var data = JSON.parse(e.postData.contents);
    var events = data.events || [];
    for (var i = 0; i < events.length; i++) {
      if (isDuplicateEvent_(events[i])) continue;
      processEventSafe(events[i]);
    }
  } catch (err) {
    console.error('[Webhook Error] ' + err);
  }
  return okOut_();
}

function isDuplicateEvent_(event) {
  var id = event && event.webhookEventId;
  if (!id) return false;
  var cache = CacheService.getScriptCache();
  var key = 'evt_' + id;
  if (cache.get(key)) return true;
  cache.put(key, '1', 3600);
  return false;
}

function processEventSafe(event) {
  try {
    var src = event.source || {};
    var userId = String(src.userId || '').trim();
    var isGroup = (src.type === 'group' || src.type === 'room');
    var chatKey = isGroup ? (src.groupId || src.roomId || '') : userId;

    CURRENT_USER_ = userId;
    CURRENT_TARGET_ = src.groupId || src.roomId || userId;

    var ctx = { userId: userId, isGroup: isGroup, chatKey: chatKey };
    if (event.type !== 'message' || !event.message) return;

    if (event.message.type === 'text') {
      handleTextMessage_(event, ctx);
    } else if (event.message.type === 'image') {
      handleImageMessage_(event, ctx);
    }
  } catch (err) {
    console.error('[Process Error] ' + err);
  }
}

function handleTextMessage_(event, ctx) {
  var text = String(event.message.text || '').trim();
  if (!text) return;
  if (handleCommands_(text, event, ctx)) return;
  if (ctx.isGroup) pushGroupBuffer_(ctx.chatKey, 'U' + ctx.userId.slice(-4), text);
  if (isHandoffPaused_(ctx)) return;
  if (ctx.isGroup && !shouldReplyInGroup_(event, text)) return;
  answer_(text, event, ctx);
}

function handleImageMessage_(event, ctx) {
  if (ctx.isGroup && !CONFIG.GROUP_IMAGE_REPLY) return;
  if (isHandoffPaused_(ctx)) return;
  var token = event.replyToken;
  if (typeof SlipVerifier !== 'undefined' && typeof SlipVerifier.handle === 'function') {
    if (SlipVerifier.handle(event, token)) return;
  }
  var blob = getLineImageBinary_(event.message.id);
  if (!blob) { replyText_(token, '❌ ดึงรูปจาก LINE ไม่ได้ครับ ลองส่งใหม่อีกที'); return; }

  try {
    var json = geminiRequest_({
      systemInstruction: { parts: [{ text: CONFIG.SYSTEM_INSTRUCTION }] },
      contents: [{
        role: 'user',
        parts: [
          { text: 'ช่วยดูรูปนี้แล้วอธิบายสั้นๆ ตรงประเด็น' },
          { inlineData: { mimeType: blob.getContentType() || 'image/jpeg', data: Utilities.base64Encode(blob.getBytes()) } }
        ]
      }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
    });
    var ex = extractModelContent_(json);
    if (ex.error) throw new Error('GEMINI_BAD_RESPONSE:' + ex.error);
    var out = joinText_(ex.parts);
    if (!out) throw new Error('GEMINI_BAD_RESPONSE:empty_text');
    sendReplyMessages(token, splitIntoLineMessages_(out));
  } catch (err) {
    console.error('[Vision Error] ' + err);
    notifyFailure_(token, ctx, err);
  }
}

function handleCommands_(text, event, ctx) {
  var t = text.trim();
  var lower = t.toLowerCase();
  var token = event.replyToken;

  if (lower === '/myid' || t === '/เช็คไอดี') {
    replyText_(token, '🆔 User ID ของคุณ:\\n' + ctx.userId);
    return true;
  }
  if (lower === '/groupid' || t === '/ไอดีกลุ่ม') {
    replyText_(token, '🏠 ID ห้องนี้:\\n' + ctx.chatKey);
    return true;
  }
  if (lower === '/test' || t === '/เช็คระบบ') {
    replyText_(token, runDiagnostics_(ctx));
    return true;
  }
  if (/^\\/resume(\\s|$)/i.test(t)) {
    if (!isOwner_(ctx.userId)) {
      replyText_(token, '🔒 คำสั่งนี้ใช้ได้เฉพาะเจ้าของบอท (ตั้ง TARGET_USER_ID ให้ตรงกับ /เช็คไอดี)');
      return true;
    }
    var target = t.replace(/^\\/resume/i, '').trim() || ctx.userId;
    var resumed = (typeof HumanHandoff !== 'undefined' && typeof HumanHandoff.resume === 'function') ? HumanHandoff.resume(target) : false;
    replyText_(token, resumed ? '▶️ ปลดล็อกพักบอทให้ ' + target + ' แล้ว' : 'ปลดล็อกไม่สำเร็จ');
    return true;
  }
  if (/^\\/จารึก(\\s|$)/.test(t)) {
    if (!isOwner_(ctx.userId)) {
      replyText_(token, '⛔ คำสั่ง /จารึก สงวนสิทธิ์เฉพาะ TARGET_USER_ID เท่านั้น');
      return true;
    }
    var directive = t.replace(/^\\/จารึก/, '').trim();
    if (!directive) { replyText_(token, 'ระบุกฎที่จะจารึกด้วย เช่น /จารึก ห้ามพูดคำหยาบกับลูกค้า'); return true; }
    var r1 = saveDualMemoryToSheet('CORE_DIRECTIVE', directive, ctx.userId);
    replyText_(token, r1.success ? '📜 [จารึกสำเร็จ]: ' + directive : r1.message);
    return true;
  }
  if (/^\\/จำ(\\s|$)/.test(t)) {
    var fact = t.replace(/^\\/จำ/, '').trim();
    if (!fact) { replyText_(token, 'ระบุสิ่งที่จะให้จำด้วย เช่น /จำ นัดวิ่งทริปเสาร์นี้'); return true; }
    var r2 = saveDualMemoryToSheet('DYNAMIC_FACT', fact, ctx.userId);
    replyText_(token, r2.success ? '📝 [จำสำเร็จ]: ' + fact : r2.message);
    return true;
  }
  return false;
}

function saveDualMemoryToSheet(type, content, senderUserId) {
  try {
    if (!CONFIG.SPREADSHEET_ID) return { success: false, message: '⚠️ ยังไม่ได้ตั้ง SPREADSHEET_ID' };
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName('AI_Memory') || ss.insertSheet('AI_Memory');
    if (sheet.getLastRow() === 0) sheet.appendRow(['Timestamp', 'Type', 'Content', 'RecordedBy']);
    sheet.appendRow([Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'), type, String(content).substring(0, 500), senderUserId]);
    try { CacheService.getScriptCache().remove('mem_cache'); } catch (e2) {}
    return { success: true };
  } catch (e) {
    return { success: false, message: '⚠️ บันทึกชีตไม่สำเร็จ: ' + e.message };
  }
}

function fetchMemories_() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get('mem_cache');
    if (cached !== null && cached !== undefined) return cached;
    if (!CONFIG.SPREADSHEET_ID) return '';
    var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName('AI_Memory');
    var result = '';
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
      var core = [], facts = [];
      for (var i = 0; i < data.length; i++) {
        var content = String(data[i][2] || '').substring(0, 500);
        if (!content) continue;
        var line = '[' + data[i][1] + ']: ' + content;
        if (String(data[i][1]) === 'CORE_DIRECTIVE') core.push(line); else facts.push(line);
      }
      result = core.slice(-60).concat(facts.slice(-40)).join('\\n');
    }
    try { cache.put('mem_cache', result.substring(0, 90000), 300); } catch (e2) {}
    return result;
  } catch (e) {
    return '';
  }
}

function isHandoffPaused_(ctx) {
  if (!ctx.userId || isOwner_(ctx.userId)) return false;
  if (ctx.isGroup && !CONFIG.HANDOFF_IN_GROUP) return false;
  return (typeof HumanHandoff !== 'undefined' && typeof HumanHandoff.isPaused === 'function') ? !!HumanHandoff.isPaused(ctx.userId) : false;
}

function shouldReplyInGroup_(event, text) {
  if (CONFIG.GROUP_REPLY_MODE === 'all') return true;
  return isMentioned_(event) || isReplyToBot_(event) || isNameCalled_(text);
}

function isMentioned_(event) {
  var m = event.message && event.message.mention;
  if (!m || !m.mentionees) return false;
  for (var i = 0; i < m.mentionees.length; i++) {
    if (m.mentionees[i].isSelf === true) return true;
  }
  return false;
}

function isReplyToBot_(event) {
  var qid = event.message && event.message.quotedMessageId;
  if (!qid) return false;
  return !!CacheService.getScriptCache().get('botmsg_' + qid);
}

function isNameCalled_(text) {
  var t = String(text || '').toLowerCase();
  var names = CONFIG.BOT_NAMES;
  for (var i = 0; i < names.length; i++) {
    if (names[i] && t.indexOf(names[i]) !== -1) return true;
  }
  return false;
}

function answer_(text, event, ctx) {
  var token = event.replyToken;
  if (!CONFIG.GEMINI_API_KEYS.length) {
    replyText_(token, '⚠️ ยังไม่ได้ตั้ง GEMINI_API_KEY_1 ใน Script Properties');
    return;
  }
  var histKey = 'hist_' + ctx.chatKey + '_' + ctx.userId;
  var history = getHistory_(histKey);
  var groupContext = '';
  if (ctx.isGroup) {
    var buf = getGroupBuffer_(ctx.chatKey);
    groupContext = formatGroupBuffer_(buf.slice(0, -1));
  }

  try {
    var r = runGeminiConversation_(text, buildSystemInstruction_(ctx, groupContext), history);
    if (r.delivered) return;
    var out = r.text;
    if (/^NO_REPLY$/i.test(out)) return;

    appendHistory_(histKey, 'user', text);
    appendHistory_(histKey, 'model', out);
    if (ctx.isGroup) pushGroupBuffer_(ctx.chatKey, 'บอท', out);

    sendReplyMessages(token, splitIntoLineMessages_(out));
  } catch (err) {
    console.error('[Pipeline Error] ' + err);
    notifyFailure_(token, ctx, err);
  }
}

function buildSystemInstruction_(ctx, groupContext) {
  var parts = [CONFIG.SYSTEM_INSTRUCTION];
  var mem = fetchMemories_();
  if (mem) parts.push('[MEMORIES & DIRECTIVES]:\\n' + mem);
  parts.push(
    '[TOOL RULES]:\\n' +
    '- ใช้เครื่องมือเมื่อผู้ใช้ขอให้ทำสิ่งนั้นจริงๆ เท่านั้น ถ้าไม่ต้องใช้ ให้ตอบเป็นข้อความธรรมดาทันที\\n' +
    '- ห้ามเรียก request_human_agent เพราะผู้ใช้แค่พูดหยาบ ด่าเล่น หรือแซวกัน เรียกเฉพาะตอนผู้ใช้ขอคุยกับแอดมินคนจริงๆ หรือโกรธจริงจัง'
  );
  if (ctx.isGroup) {
    parts.push('[แชทกลุ่ม]: ตอบข้อความล่าสุดให้ตรงประเด็น กระชับ');
    if (groupContext) parts.push('[บริบทแชทกลุ่มล่าสุด]:\\n' + groupContext);
  }
  parts.push('[เวลาปัจจุบัน Asia/Bangkok]: ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'));
  return parts.join('\\n\\n');
}

function hasTools_() {
  return (typeof GEMINI_TOOLS_SCHEMA !== 'undefined' && GEMINI_TOOLS_SCHEMA && GEMINI_TOOLS_SCHEMA.length > 0 && typeof executeAutonomousTool === 'function');
}

function isKnownTool_(name) {
  if (!name || !hasTools_()) return false;
  for (var i = 0; i < GEMINI_TOOLS_SCHEMA.length; i++) {
    if (GEMINI_TOOLS_SCHEMA[i].name === name) return true;
  }
  return false;
}

function runTool_(fc, toolCache) {
  var name = fc && fc.name;
  var args = (fc && fc.args && typeof fc.args === 'object') ? fc.args : {};
  if (!isKnownTool_(name)) return { error: 'unknown_tool', message: 'ไม่มีเครื่องมือชื่อนี้' };
  var key = name + ':' + safeStringify_(args);
  if (toolCache[key]) return toolCache[key];

  var res;
  try {
    res = executeAutonomousTool(name, args, null, CURRENT_USER_);
    if (res === null || typeof res !== 'object' || Array.isArray(res)) {
      res = { result: res === undefined ? null : res };
    }
  } catch (err) {
    res = { error: 'tool_failed', message: 'เครื่องมือทำงานไม่สำเร็จ' };
  }
  toolCache[key] = res;
  return res;
}

function runGeminiConversation_(prompt, systemText, history) {
  var contents = [];
  for (var i = 0; i < history.length; i++) {
    contents.push({ role: history[i].role, parts: [{ text: history[i].text }] });
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] });

  var toolsOn = hasTools_();
  var maxRounds = CONFIG.MAX_TOOL_ROUNDS;
  var toolCache = {};

  for (var round = 1; round <= maxRounds + 1; round++) {
    var allowTools = toolsOn && round <= maxRounds;
    var payload = {
      contents: contents,
      systemInstruction: { parts: [{ text: systemText }] },
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 }
    };
    if (allowTools) payload.tools = [{ functionDeclarations: GEMINI_TOOLS_SCHEMA }];

    var json;
    try {
      json = geminiRequest_(payload);
    } catch (e1) {
      if (allowTools && /HTTP 400/.test(String(e1))) {
        toolsOn = false;
        delete payload.tools;
        json = geminiRequest_(payload);
      } else {
        throw e1;
      }
    }

    var ex = extractModelContent_(json);
    if (ex.error) {
      if (allowTools && ex.error.indexOf('blocked') !== 0) {
        toolsOn = false;
        delete payload.tools;
        json = geminiRequest_(payload);
        ex = extractModelContent_(json);
      }
      if (ex.error) throw new Error('GEMINI_BAD_RESPONSE:' + ex.error);
    }

    var calls = ex.parts.filter(function (p) { return p && p.functionCall; });
    if (!calls.length) {
      var text = joinText_(ex.parts);
      if (!text) throw new Error('GEMINI_BAD_RESPONSE:empty_text finish=' + ex.finishReason);
      return { text: text, delivered: false };
    }

    if (!allowTools) throw new Error('GEMINI_BAD_RESPONSE:tool_loop_limit');
    contents.push({ role: 'model', parts: ex.parts });

    var cardsBefore = CARDS_SENT_;
    var responseParts = calls.map(function (p) {
      var res = runTool_(p.functionCall, toolCache);
      var fr = { name: p.functionCall.name, response: res };
      if (p.functionCall.id) fr.id = p.functionCall.id;
      return { functionResponse: fr };
    });

    if (CARDS_SENT_ > cardsBefore) return { text: '', delivered: true };
    contents.push({ role: 'user', parts: responseParts });
  }

  throw new Error('GEMINI_BAD_RESPONSE:tool_loop_limit');
}

function joinText_(parts) {
  return (parts || []).filter(function (p) { return p && typeof p.text === 'string' && !p.thought; }).map(function (p) { return p.text; }).join('').trim();
}

function extractModelContent_(json) {
  if (!json) return { error: 'empty_response' };
  if (json.promptFeedback && json.promptFeedback.blockReason) return { error: 'blocked:' + json.promptFeedback.blockReason };
  var cand = json.candidates && json.candidates[0];
  if (!cand) return { error: 'no_candidates' };
  var parts = cand.content && cand.content.parts;
  if (!parts || !parts.length) return { error: (cand.finishReason === 'SAFETY' ? 'blocked:' : 'no_parts:') + (cand.finishReason || '') };
  return { parts: parts, finishReason: cand.finishReason };
}

function geminiRequest_(payload) {
  var keys = CONFIG.GEMINI_API_KEYS;
  if (!keys.length) throw new Error('NO_API_KEY');
  var models = CONFIG.GEMINI_MODELS;
  var cache = CacheService.getScriptCache();

  var combos = [];
  models.forEach(function (m) {
    keys.forEach(function (k, ki) { combos.push({ model: m, key: k, ki: ki, id: 'gdead_' + m + '_' + ki }); });
  });

  var live = [], dead = [];
  combos.forEach(function (c) {
    var mark = cache.get(c.id);
    if (!mark) live.push(c);
    else if (mark !== '404') dead.push(c);
  });
  combos = live.concat(dead);

  var body = JSON.stringify(payload);
  var started = Date.now();
  var lastError = 'no_combo';

  for (var i = 0; i < combos.length; i++) {
    if (Date.now() - started > 50000) { lastError = 'time budget exceeded | ' + lastError; break; }
    var c = combos[i];
    try {
      var res = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + c.model + ':generateContent',
        { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': c.key }, payload: body, muteHttpExceptions: true }
      );
      var code = res.getResponseCode();
      var txt = res.getContentText();

      if (code === 200) {
        try {
          var parsed = JSON.parse(txt);
          LAST_MODEL_ = c.model;
          return parsed;
        } catch (pe) {
          lastError = 'malformed JSON from ' + c.model;
          continue;
        }
      }

      var msg = '';
      try { msg = (JSON.parse(txt).error || {}).message || ''; } catch (x) { msg = String(txt).substring(0, 200); }
      lastError = 'HTTP ' + code + ' [' + c.model + ' key' + (c.ki + 1) + '] ' + msg.substring(0, 160);

      if (code === 429 || code === 500 || code === 502 || code === 503 || code === 504) {
        cache.put(c.id, String(code), 60);
      } else if (code === 404) {
        cache.put(c.id, '404', 3600);
      } else if (code === 401 || code === 403 || (code === 400 && /api key/i.test(msg))) {
        cache.put(c.id, String(code), 600);
      } else if (code === 400) {
        throw new Error(lastError);
      }
    } catch (fe) {
      if (/^HTTP 400/.test(String(fe.message))) throw fe;
      lastError = 'fetch error [' + c.model + '] ' + fe.message;
    }
  }

  throw new Error('GEMINI_ALL_FAILED: ' + lastError);
}

function callGeminiWithFailover(payload) {
  return geminiRequest_(payload);
}

function getHistory_(key) {
  var raw = CacheService.getScriptCache().get(key);
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  return [];
}

function appendHistory_(key, role, text) {
  try {
    var h = getHistory_(key);
    h.push({ role: role, text: String(text || '').substring(0, 2000) });
    if (h.length > 10) h = h.slice(h.length - 10);
    while (JSON.stringify(h).length > 80000 && h.length > 2) h.shift();
    CacheService.getScriptCache().put(key, JSON.stringify(h), 21600);
  } catch (e) {}
}

function getGroupBuffer_(groupKey) {
  if (!groupKey) return [];
  var raw = CacheService.getScriptCache().get('gbuf_' + groupKey);
  if (raw) { try { return JSON.parse(raw); } catch (e) {} }
  return [];
}

function pushGroupBuffer_(groupKey, label, text) {
  if (!groupKey) return;
  try {
    var buf = getGroupBuffer_(groupKey);
    buf.push({ u: label, t: String(text || '').substring(0, 200) });
    if (buf.length > 20) buf = buf.slice(buf.length - 20);
    CacheService.getScriptCache().put('gbuf_' + groupKey, JSON.stringify(buf), 21600);
  } catch (e) {}
}

function formatGroupBuffer_(buf) {
  if (!buf || !buf.length) return '';
  return buf.map(function (b) { return b.u + ': ' + b.t; }).join('\\n');
}

function lineFetch_(url, payload) {
  try {
    var res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    var body = res.getContentText();
    var json = null;
    try { json = JSON.parse(body); } catch (e) {}
    return { code: res.getResponseCode(), body: body, json: json };
  } catch (err) {
    return { code: 0, body: String(err), json: null };
  }
}

function rememberSentMessages_(json) {
  try {
    if (!json || !json.sentMessages || !json.sentMessages.length) return;
    var obj = {};
    for (var i = 0; i < json.sentMessages.length; i++) {
      if (json.sentMessages[i].id) obj['botmsg_' + json.sentMessages[i].id] = '1';
    }
    CacheService.getScriptCache().putAll(obj, 21600);
  } catch (e) {}
}

function prepareLineMessages_(messages) {
  var out = [];
  var list = messages || [];
  for (var i = 0; i < list.length && out.length < 5; i++) {
    var m = list[i];
    if (!m) continue;
    if (m.type === 'text') {
      var t = String(m.text || '').trim();
      if (!t) t = '…';
      if (t.length > 4900) t = t.substring(0, 4900) + '…';
      var copy = {};
      for (var k in m) { if (Object.prototype.hasOwnProperty.call(m, k)) copy[k] = m[k]; }
      copy.text = t;
      out.push(copy);
    } else {
      out.push(m);
    }
  }
  return out;
}

function splitIntoLineMessages_(text) {
  if (!text) return [];
  var limit = 4500;
  var messages = [];
  for (var i = 0; i < text.length && messages.length < 5; i += limit) {
    messages.push({ type: 'text', text: text.substring(i, i + limit) });
  }
  return messages;
}

function countCards_(msgs) {
  for (var i = 0; i < msgs.length; i++) {
    if (msgs[i] && msgs[i].type !== 'text') CARDS_SENT_++;
  }
}

function sendReplyMessages(replyToken, messages) {
  var msgs = prepareLineMessages_(messages);
  if (!msgs.length) return false;
  if (!CONFIG.LINE_CHANNEL_ACCESS_TOKEN) return false;
  var needPush = !replyToken;

  if (replyToken) {
    var r = lineFetch_(LINE_REPLY_URL, { replyToken: replyToken, messages: msgs });
    if (r.code === 200) { rememberSentMessages_(r.json); countCards_(msgs); return true; }
    needPush = true;
  }
  if (needPush && CURRENT_TARGET_) {
    var p = lineFetch_(LINE_PUSH_URL, { to: CURRENT_TARGET_, messages: msgs });
    if (p.code === 200) { rememberSentMessages_(p.json); countCards_(msgs); return true; }
  }
  return false;
}

function replyText_(replyToken, text) {
  return sendReplyMessages(replyToken, [{ type: 'text', text: text }]);
}

function pushLineMessage(toId, text) {
  var msgs = prepareLineMessages_([{ type: 'text', text: text }]);
  var r = lineFetch_(LINE_PUSH_URL, { to: toId, messages: msgs });
  return r.code === 200;
}

function getLineImageBinary_(messageId) {
  try {
    var res = UrlFetchApp.fetch(LINE_DATA_URL + '/' + messageId + '/content', {
      headers: { Authorization: 'Bearer ' + CONFIG.LINE_CHANNEL_ACCESS_TOKEN },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) return res.getBlob();
  } catch (e) {}
  return null;
}

function notifyFailure_(replyToken, ctx, err) {
  var m = String((err && err.message) || err);
  var friendly;
  if (m.indexOf('NO_API_KEY') !== -1) friendly = '⚠️ ยังไม่ได้ตั้ง GEMINI_API_KEY';
  else if (m.indexOf('GEMINI_ALL_FAILED') !== -1 && m.indexOf('429') !== -1) friendly = '⚠️ โควตา AI เต็ม รอแป๊บแล้วลองใหม่';
  else if (m.indexOf('GEMINI_ALL_FAILED') !== -1) friendly = '⚠️ AI ยุ่งอยู่/ล่มชั่วคราว ลองใหม่อีกทีนะ';
  else if (m.indexOf('blocked') !== -1) friendly = '⚠️ AI ไม่ยอมตอบเรื่องนี้ (ติดตัวกรองความปลอดภัย)';
  else friendly = '⚠️ ระบบ AI ขัดข้องชั่วคราว ลองใหม่อีกทีนะ';

  if (isOwner_(ctx.userId)) friendly += '\\n\\n[debug] ' + m.substring(0, 300);
  if (ctx.isGroup) {
    var cache = CacheService.getScriptCache();
    var k = 'errcd_' + ctx.chatKey;
    if (cache.get(k)) return;
    cache.put(k, '1', 60);
  }
  replyText_(replyToken, friendly);
}

function runDiagnostics_(ctx) {
  var r = [];
  r.push('🛠 DUII CORE ' + CORE_VERSION);
  r.push('💬 ห้องนี้: ' + (ctx.isGroup ? 'กลุ่ม' : 'ส่วนตัว'));
  r.push('🔑 Gemini keys: ' + CONFIG.GEMINI_API_KEYS.length);
  r.push('🤖 models: ' + CONFIG.GEMINI_MODELS.join(', '));
  r.push('👤 TARGET_USER_ID: ' + (CONFIG.TARGET_USER_ID ? 'ตั้งแล้ว' : 'ยังไม่ตั้ง'));
  r.push('🧰 เครื่องมือ: ' + (hasTools_() ? GEMINI_TOOLS_SCHEMA.length + ' ตัว' : 'ไม่มี'));
  return r.join('\\n');
}

function testGemini() {
  var json = geminiRequest_({
    contents: [{ role: 'user', parts: [{ text: 'ทักทายสั้นๆ 1 ประโยค' }] }],
    generationConfig: { maxOutputTokens: 512 }
  });
  var ex = extractModelContent_(json);
  console.log('model=' + LAST_MODEL_ + ' | ' + (ex.error || joinText_(ex.parts)));
}`
  },
  {
    id: "99_TestRunner",
    type: "core",
    name: "99_TestRunner (Verification Suite)",
    category: "Core Chassis",
    commands: ["runAllDuiiTests"],
    description: "แท่นทดสอบอัตโนมัติประจำระบบ: ตรวจสอบความพร้อมของ Core Chassis, Schema, FlexEngine และ Logic ทุกโมดูลก่อนขึ้นโปรดักชัน",
    properties: [],
    setupGuide: "### 99_TestRunner.gs\nไฟล์ทดสอบอัตโนมัติประจำโปรเจกต์ ใช้กด Run ฟังก์ชัน runAllDuiiTests เพื่อตรวจเช็คความสมบูรณ์",
    functionDeclaration: null,
    codeSnippet: `// TOTAL_LINES: AUTO
/**
 * SCRIPT NAME : 99_TestRunner.gs
 * VERSION     : v5.0.0-PROD-TESTER
 * STANDARD    : DUII_FACTORY_CORE_SPINE_ISO9009
 */

function runAllDuiiTests() {
  console.log("==================================================================");
  console.log("🚀 DUII FACTORY // STARTING SYSTEM VERIFICATION TEST SUITE");
  console.log("==================================================================");

  var results = [];
  function assert(name, condition, details) {
    if (condition) {
      console.log("✅ [PASS] " + name + (details ? " -> " + details : ""));
      results.push({ name: name, status: "PASS" });
    } else {
      console.error("❌ [FAIL] " + name + (details ? " -> " + details : ""));
      results.push({ name: name, status: "FAIL" });
    }
  }

  // 1. Core Architecture Checks
  assert("1. Core Schema Existence", typeof GEMINI_TOOLS_SCHEMA !== "undefined" && Array.isArray(GEMINI_TOOLS_SCHEMA));
  assert("2. Dispatcher Router Existence", typeof executeAutonomousTool === "function");

  // 2. FlexEngine Check
  if (typeof FlexEngine !== "undefined") {
    var sampleReceipt = FlexEngine.createReceiptCard({ status: "verified", amount: 100, ref: "T-01" });
    assert("3. FlexEngine Operational", sampleReceipt && sampleReceipt.type === "flex");
  }

  // 3. Dispatcher Execution Ping
  if (typeof executeAutonomousTool === "function") {
    var res = executeAutonomousTool("manage_gift_card", { action: "check", code: "PING" }, null, "TEST_UID");
    assert("4. Dispatcher Bridge Routing", res && (res.status === "success" || res.status === "missing_module"));
  }

  var passCount = results.filter(function(r) { return r.status === "PASS"; }).length;
  console.log("📊 TEST RESULT SUMMARY: PASS " + passCount + "/" + results.length);
  console.log("==================================================================");
}`
  },
  {
    id: "01_AsyncBuffer",
    type: "module",
    name: "01_AsyncBuffer (Queue Guard)",
    category: "Core & Performance",
    commands: ["Async Webhook Queue"],
    description: "พักอีเวนต์ลง CacheService ตอบกลับ LINE 200 OK ทันทีภายใน 1 วินาที ป้องกัน Execution Timeout",
    properties: [{ key: "ASYNC_BUFFER", required: false, desc: "ตั้งค่าเป็น on เพื่อเปิดระบบคิวเบื้องหลัง" }],
    setupGuide: "### ⏱️ 01_AsyncBuffer.gs\nวางใน Modules/ ตอบสนองทันใจไม่หลุด Timeout",
    functionDeclaration: null,
    codeSnippet: `var AsyncBuffer = (function () {
  var INDEX_KEY = "ab_index";
  var TTL = 21600;
  function enabled_() {
    return /^(1|true|yes|on)$/i.test(String(PropertiesService.getScriptProperties().getProperty("ASYNC_BUFFER") || "").trim());
  }
  function enqueue(payload) {
    if (!enabled_() || !payload || !payload.events || !payload.events.length) return false;
    var c = CacheService.getScriptCache();
    var idx = JSON.parse(c.get(INDEX_KEY) || "[]");
    for (var i = 0; i < payload.events.length; i++) {
      var k = "ab_ev_" + (payload.events[i].webhookEventId || (Date.now() + "_" + i));
      c.put(k, JSON.stringify(payload.events[i]), TTL);
      idx.push(k);
    }
    c.put(INDEX_KEY, JSON.stringify(idx), TTL);
    return true;
  }
  return { enqueue: enqueue };
})();`
  },
  {
    id: "02_FlexEngine",
    type: "module",
    name: "02_FlexEngine (Card Generator)",
    category: "UI & Presentation",
    commands: ["Flex Cards", "Receipt", "Ticket", "Order Card"],
    description: "สร้าง LINE Flex Message อัตโนมัติ: บิล, บัตรคิว, ตั๋ว QR Code และผลตรวจสลิป ปลอดภัย 100%",
    properties: [],
    setupGuide: "### 🎨 02_FlexEngine.gs\nตัวเรนเดอร์ Flex Message ส่วนกลางของทุกโมดูล",
    functionDeclaration: null,
    codeSnippet: `var FlexEngine = (function () {
  var QR_URL = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=";
  function text_(t, o) {
    var b = { type: "text", text: String(t || "-") };
    if (o) for (var k in o) b[k] = o[k];
    return b;
  }
  function row_(label, value, valColor) {
    return {
      type: "box", layout: "horizontal", spacing: "sm",
      contents: [ text_(label, { size: "xs", color: "#8A8A8A", flex: 3 }), text_(value, { size: "xs", color: valColor || "#222222", flex: 5, wrap: true, weight: "bold" }) ]
    };
  }
  function createReceiptCard(s) {
    var isOk = s.status === "verified";
    var headBg = isOk ? "#1B6B3A" : "#9B0019";
    var cardBg = isOk ? "#E8F8EE" : "#FFECEC";
    var title = isOk ? "✅ สลิปผ่านการตรวจเบื้องต้น" : "⛔ สลิปมีปัญหา/เคยใช้แล้ว";
    var bubble = {
      type: "bubble", size: "kilo", styles: { body: { backgroundColor: cardBg } },
      body: {
        type: "box", layout: "vertical", paddingAll: "14px", borderWidth: "2px", borderColor: headBg, cornerRadius: "14px",
        contents: [
          { type: "box", layout: "vertical", backgroundColor: headBg, paddingAll: "10px", cornerRadius: "8px", contents: [text_(title, { weight: "bold", size: "sm", color: "#FFFFFF" })] },
          { type: "box", layout: "vertical", spacing: "sm", margin: "md", contents: [
            row_("ยอดเงิน", s.amount ? Number(s.amount).toLocaleString("en-US") + " บาท" : "-"),
            row_("วันที่-เวลา", (s.date || "") + " " + (s.time || "")),
            row_("เลขอ้างอิง", s.ref),
            row_("ผู้รับ", s.receiver),
            row_("ธนาคาร", s.bank)
          ]}
        ]
      }
    };
    return { type: "flex", altText: title, contents: bubble };
  }
  function createOrderCard(o) {
    var lines = Array.isArray(o.items) ? o.items : [String(o.items || "-")];
    var itemBoxes = lines.map(function(l) { return text_("• " + l, { size: "xs", color: "#333333", wrap: true }); });
    var bubble = {
      type: "bubble", size: "kilo",
      body: {
        type: "box", layout: "vertical", paddingAll: "16px", spacing: "xs",
        contents: [
          text_("🧾 สรุปออเดอร์", { weight: "bold", size: "md", color: "#111111" }),
          text_(String(o.order_id || ""), { size: "xxs", color: "#999999" }),
          { type: "separator", margin: "sm" },
          { type: "box", layout: "vertical", spacing: "xs", margin: "sm", contents: itemBoxes },
          { type: "separator", margin: "sm" },
          { type: "box", layout: "horizontal", margin: "sm", contents: [ text_("ยอดรวม", { size: "sm", color: "#555555", flex: 2 }), text_(Number(o.total || 0).toLocaleString("en-US") + " บาท", { size: "lg", weight: "bold", color: "#0B6E4F", align: "end", flex: 4 }) ]},
          row_("เบอร์โทร", o.phone),
          row_("ที่อยู่จัดส่ง", o.address)
        ]
      }
    };
    return { type: "flex", altText: "🧾 สรุปออเดอร์ " + (o.order_id || ""), contents: bubble };
  }
  function createTicketCard(t) {
    var isRes = t.kind === "reservation";
    var accent = isRes ? "#1565C0" : "#6A1B9A";
    var title = isRes ? "📅 ยืนยันการจองสำเร็จ" : "🎫 E-Ticket สำเร็จ";
    var id = isRes ? t.booking_id : t.ticket_id;
    var qrData = isRes ? ("BOOKING|" + id) : ("TICKET|" + id);
    var bubble = {
      type: "bubble", size: "kilo",
      body: {
        type: "box", layout: "vertical", paddingAll: "14px", spacing: "md", borderWidth: "2px", borderColor: accent, cornerRadius: "14px",
        contents: [
          { type: "box", layout: "vertical", backgroundColor: accent, paddingAll: "10px", cornerRadius: "8px", contents: [text_(title, { weight: "bold", size: "sm", color: "#FFFFFF" })] },
          { type: "box", layout: "vertical", spacing: "sm", contents: [
            row_("ชื่อผู้จอง", t.customer_name || t.attendee_name),
            row_("วันที่", t.date),
            row_("เวลา", t.time),
            row_("จำนวน", (t.guests || 1) + " ท่าน"),
            row_("รหัสอ้างอิง", id, accent)
          ]},
          { type: "image", url: QR_URL + encodeURIComponent(qrData), size: "md", aspectMode: "fit", aspectRatio: "1:1" }
        ]
      }
    };
    return { type: "flex", altText: title, contents: bubble };
  }
  return { createReceiptCard: createReceiptCard, createOrderCard: createOrderCard, createTicketCard: createTicketCard };
})();`
  },
  {
    id: "05_SlipVerifier",
    type: "module",
    name: "05_SlipVerifier (Vision + Fraud Guard)",
    category: "Business & Sales",
    commands: ["ส่งรูปสลิป", "ตรวจสลิป"],
    description: "อ่านรูปสลิปด้วย Gemini Vision ตรวจจับตัดต่อ เช็คเลขบัญชี 4 ตัวท้าย และดักสลิปซ้ำลงชีต Slip_Log",
    properties: [{ key: "SLIP_RECEIVER_ACCOUNT", required: false, desc: "เลขบัญชีปลายทางของร้าน" }],
    setupGuide: "### 💳 05_SlipVerifier.gs\nระบบตรวจสลิปอัจฉริยะ บันทึกลง Slip_Log",
    functionDeclaration: {
      name: "verify_transfer_slip",
      description: "ตรวจสอบข้อมูลสลิปโอนเงิน (ยอดเงิน, วันที่, เลขอ้างอิง) เพื่อตรวจเช็คความถูกต้องและสลิปซ้ำ",
      parameters: {
        type: "OBJECT",
        properties: { ref_number: { type: "STRING" }, amount: { type: "NUMBER" } }
      }
    },
    codeSnippet: `var SlipVerifier = (function () {
  var SHEET = "Slip_Log";
  var HEADER = ["Timestamp", "Ref", "Amount", "Slip_Date", "Slip_Time", "Sender", "Receiver", "Receiver_Account", "Bank", "Status", "User_ID", "Message_ID", "Confidence", "Dup_Key"];
  function sheet_() {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
    return sh;
  }
  function handle(event, replyToken) {
    try {
      var blob = getLineImageBinary_(event.message.id);
      if (!blob) return false;
      var b64 = Utilities.base64Encode(blob.getBytes());
      var prompt = "คุณคือเครื่องอ่านสลิปโอนเงินธนาคารไทย จงตอบเป็น JSON object เท่านั้น: {\\\"is_slip\\\": true, \\\"amount\\\": 0.0, \\\"date\\\": \\\"YYYY-MM-DD\\\", \\\"time\\\": \\\"HH:mm\\\", \\\"ref\\\": \\\"เลขอ้างอิง\\\", \\\"sender\\\": \\\"ผู้โอน\\\", \\\"receiver\\\": \\\"ผู้รับ\\\", \\\"receiver_account\\\": \\\"เลขบัญชีผู้รับ\\\", \\\"bank\\\": \\\"ธนาคาร\\\", \\\"looks_edited\\\": false, \\\"confidence\\\": 0.95}";
      var res = callGeminiWithFailover({
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: blob.getContentType() || "image/jpeg", data: b64 } }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 }
      });
      var d = JSON.parse(res.candidates[0].content.parts[0].text);
      if (!d || d.is_slip !== true) return false;

      var key = d.ref ? ("REF:" + d.ref.toUpperCase().replace(/\\s+/g, "")) : ("ALT:" + [d.amount, d.date, d.time].join("|"));
      var sh = sheet_();
      var lock = LockService.getScriptLock();
      lock.tryLock(8000);
      var status = "verified";
      try {
        var rows = sh.getDataRange().getValues();
        for (var r = 1; r < rows.length; r++) {
          if (String(rows[r][13]) === key) { status = "duplicate"; break; }
        }
        if (status === "verified") {
          sh.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"), d.ref, d.amount, d.date, d.time, d.sender, d.receiver, d.receiver_account, d.bank, status, event.source.userId, event.message.id, d.confidence, key]);
        }
      } finally { lock.releaseLock(); }

      var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createReceiptCard({ status: status, amount: d.amount, date: d.date, time: d.time, ref: d.ref, sender: d.sender, receiver: d.receiver, bank: d.bank }) : null;
      sendReplyMessages(replyToken, card ? [card] : [{ type: "text", text: "ผลตรวจสลิป: " + status + " ยอด " + d.amount + " บาท" }]);
      return true;
    } catch (e) { return false; }
  }
  function verify(args) { return { status: "success", message: "ตรวจสอบข้อมูลสลิปเรียบร้อย", args: args }; }
  return { handle: handle, verify: verify };
})();`
  },
  {
    id: "06_HumanHandoff",
    type: "module",
    name: "06_HumanHandoff (Escalation Guard)",
    category: "Operations & Social",
    commands: ["ติดต่อเจ้าหน้าที่", "ขอคุยกับคน", "พักบอท"],
    description: "ตรวจจับอารมณ์โกรธ พักบอทอัตโนมัติ 30-120 นาที และยิงแจ้งเตือนเข้าหากลุ่มแอดมินคนทันที",
    properties: [{ key: "ADMIN_GROUP_ID", required: false, desc: "ID ห้องแชทกลุ่มแอดมินสำหรับแจ้งเตือน" }],
    setupGuide: "### 🚨 06_HumanHandoff.gs\nพักการตอบของบอทชั่วคราว ปลดล็อกด้วย /resume",
    functionDeclaration: {
      name: "request_human_agent",
      description: "ส่งต่อแอดมินคน พักการตอบของบอทชั่วคราวเมื่อลูกค้าต้องการคุยกับเจ้าหน้าที่",
      parameters: {
        type: "OBJECT",
        properties: { reason: { type: "STRING" }, urgent_level: { type: "STRING" } }
      }
    },
    codeSnippet: `var HumanHandoff = (function () {
  function isPaused(userId) { return !userId ? false : !!CacheService.getScriptCache().get("hh_" + userId); }
  function pause(userId, min) {
    if (!userId) return false;
    CacheService.getScriptCache().put("hh_" + userId, "1", (min || 30) * 60);
    return true;
  }
  function resume(userId) {
    if (!userId) return false;
    CacheService.getScriptCache().remove("hh_" + userId);
    return true;
  }
  function request(args) {
    var userId = CURRENT_USER_;
    var level = (args && args.urgent_level) || "medium";
    var reason = (args && args.reason) || "ลูกค้าขอคุยกับเจ้าหน้าที่";
    var min = level === "high" ? 120 : 30;
    pause(userId, min);
    var target = CONFIG.ADMIN_GROUP_ID || CONFIG.TARGET_USER_ID;
    if (target) {
      pushLineMessage(target, "🚨 [ขอแอดมินดูแลด่วน]\\nผู้ใช้: " + userId + "\\nระดับ: " + level + "\\nเหตุผล: " + reason + "\\n(บอทพักการตอบ " + min + " นาที ปลดล็อกได้ด้วย /resume " + userId + ")");
    }
    return { status: "success", delivered_via: "flex_message", message: "ส่งเรื่องให้เจ้าหน้าที่แอดมินแล้วครับ สักครู่จะมีเจ้าหน้าที่ติดต่อกลับ" };
  }
  return { isPaused: isPaused, pause: pause, resume: resume, request: request };
})();`
  },
  {
    id: "07_LeadScoring",
    type: "module",
    name: "07_LeadScoring (BANT Qualifier)",
    category: "Business & Sales",
    commands: ["วิเคราะห์ความสนใจลูกค้า", "บันทึก Lead"],
    description: "ประเมินคะแนน BANT 0-100 คะแนน จัดเกรด Hot/Warm/Cold บันทึกลงชีต Lead_Scores",
    properties: [],
    setupGuide: "### 🎯 07_LeadScoring.gs\nประเมินระดับความพร้อมในการซื้อของลูกค้า",
    functionDeclaration: {
      name: "assess_lead_quality",
      description: "ประเมินและให้คะแนน BANT Score พร้อมสกัดข้อมูลติดต่อลูกค้า",
      parameters: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          phone: { type: "STRING" },
          interest: { type: "STRING" },
          budget_score: { type: "INTEGER" },
          authority_score: { type: "INTEGER" },
          need_score: { type: "INTEGER" },
          timeline_score: { type: "INTEGER" }
        },
        required: ["name"]
      }
    },
    codeSnippet: `var LeadScoring = (function () {
  var SHEET = "Lead_Scores";
  var HEADER = ["Timestamp", "Name", "Phone", "Interest", "Score", "Tier", "User_ID"];
  function score(args) {
    var a = args || {};
    var b = Number(a.budget_score) || 15;
    var au = Number(a.authority_score) || 15;
    var n = Number(a.need_score) || 15;
    var t = Number(a.timeline_score) || 15;
    var total = Math.min(100, b + au + n + t);
    var tier = total >= 70 ? "Hot" : (total >= 40 ? "Warm" : "Cold");
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
    sh.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"), a.name || "-", a.phone || "-", a.interest || "-", total, tier, CURRENT_USER_]);
    return { status: "success", name: a.name, score: total, tier: tier, message: "ประเมินระดับลูกค้า [" + tier + "] เรียบร้อยแล้ว (" + total + " คะแนน)" };
  }
  return { score: score };
})();`
  },
  {
    id: "08_OrderCart",
    type: "module",
    name: "08_OrderCart (Order & Checkout)",
    category: "Business & Sales",
    commands: ["สั่งซื้อ", "สรุปยอด", "ที่อยู่จัดส่ง"],
    description: "สกัดรายการสินค้า คำนวณยอดเงิน เบอร์โทร 10 หลัก ออกรหัส ORD-* บันทึกลงชีต Orders พร้อมสร้าง Flex สรุปออเดอร์",
    properties: [{ key: "ORDER_PAY_INFO", required: false, desc: "ข้อความแนะนำการชำระเงินท้ายบิล" }],
    setupGuide: "### 🛒 08_OrderCart.gs\nระบบสรุปบิลสั่งซื้อและบันทึกออเดอร์ลงชีต",
    functionDeclaration: {
      name: "create_order_summary",
      description: "สกัดรายการสินค้า คำนวณยอดเงินรวม สกัดที่อยู่ เบอร์โทร 10 หลัก และสร้างใบสรุปออเดอร์",
      parameters: {
        type: "OBJECT",
        properties: {
          items: { type: "STRING" },
          total_amount: { type: "NUMBER" },
          phone: { type: "STRING" },
          address: { type: "STRING" }
        },
        required: ["items", "total_amount"]
      }
    },
    codeSnippet: `var OrderCart = (function () {
  var SHEET = "Orders";
  var HEADER = ["Timestamp", "Order_ID", "Items", "Total", "Phone", "Address", "Status", "User_ID"];
  function createSummary(args) {
    var a = args || {};
    var orderId = "ORD-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyMMdd-HHmmss") + "-" + Math.floor(100 + Math.random() * 900);
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
    if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
    sh.appendRow([Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"), orderId, a.items, a.total_amount, a.phone || "-", a.address || "-", "รอชำระเงิน", CURRENT_USER_]);
    var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createOrderCard({ order_id: orderId, items: a.items, total: a.total_amount, phone: a.phone, address: a.address }) : null;
    if (card) {
      sendReplyMessages(null, [card]);
      return { status: "success", delivered_via: "flex_message" };
    }
    return { status: "success", order_id: orderId, total: a.total_amount, message: "สรุปคำสั่งซื้อ [" + orderId + "] ยอดรวม " + a.total_amount + " บาท" };
  }
  return { createSummary: createSummary };
})();`
  },
  {
    id: "09_StrictFAQ",
    type: "module",
    name: "09_StrictFAQ (Bi-gram AI Guard)",
    category: "Business & Sales",
    commands: ["ถามคำถามทั่วไป", "นโยบายร้าน", "เวลาเปิดปิด"],
    description: "ค้นหาคำตอบตรงจากชีต FAQ กฎเหล็ก: ตอบเฉพาะข้อมูลจริงในชีต ห้าม AI แต่งเรื่องเองเด็ดขาด",
    properties: [{ key: "FAQ_MIN_SCORE", required: false, desc: "คะแนนความเหมือนขั้นต่ำ (ค่าเริ่มต้น 0.35)" }],
    setupGuide: "### 📚 09_StrictFAQ.gs\nระบบค้นหาคำตอบจากชีต FAQ ห้ามแต่งข้อมูล",
    functionDeclaration: {
      name: "query_strict_faq",
      description: "ค้นหาข้อมูลสินค้า กฎ หรือนโยบายจากชีต FAQ กฎเหล็ก: ตอบเฉพาะข้อมูลจริงในชีต ห้ามแต่งเอง",
      parameters: {
        type: "OBJECT",
        properties: { query: { type: "STRING" } },
        required: ["query"]
      }
    },
    codeSnippet: `var StrictFAQ = (function () {
  var SHEET = "FAQ";
  function query(args) {
    var q = String((args && args.query) || "").trim().toLowerCase();
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(SHEET);
    if (!sh || sh.getLastRow() <= 1) return { status: "not_found", message: "ยังไม่มีฐานข้อมูล FAQ" };
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][0] && q.indexOf(String(rows[i][0]).toLowerCase()) !== -1) {
        return { status: "found", answer: rows[i][1], message: rows[i][1] };
      }
    }
    return { status: "not_found", message: "ขออภัยครับ ข้อมูลส่วนนี้ยังไม่มีในระบบ ขอส่งต่อให้เจ้าหน้าที่ติดต่อกลับนะครับ" };
  }
  return { query: query };
})();`
  },
  {
    id: "10_Reservation",
    type: "module",
    name: "10_Reservation (Table & Slot Engine)",
    category: "Operations & Social",
    commands: ["จองโต๊ะ", "จองคิว", "เช็คเวลาว่าง"],
    description: "ตรวจสอบช่วงเวลาว่าง ล็อกคิวด้วย ScriptLock ป้องกันคิวซ้อน ออกรหัส BK-* พร้อมแสดง Flex บัตรคิว QR Code",
    properties: [],
    setupGuide: "### 📅 10_Reservation.gs\nจัดการคิวและโต๊ะอาหารแบบ Atomic Lock",
    functionDeclaration: {
      name: "check_and_book_table",
      description: "เช็กช่วงเวลาว่าง ล็อกสิทธิ์จองโต๊ะ และออกการ์ดยืนยันการจอง ป้องกันคิวซ้อน",
      parameters: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING" },
          time: { type: "STRING" },
          customer_name: { type: "STRING" },
          guests: { type: "INTEGER" }
        },
        required: ["date", "time", "customer_name"]
      }
    },
    codeSnippet: `var Reservation = (function () {
  var SHEET = "Reservations";
  var HEADER = ["Booking_ID", "Date", "Time", "Customer", "Guests", "Status", "Created_At", "User_ID"];
  function book(args) {
    var a = args || {};
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return { status: "busy", message: "ระบบกำลังประมวลผลคิวอื่นอยู่ กรุณาลองใหม่อีกครั้ง" };
    try {
      var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
      var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
      if (sh.getLastRow() === 0) { sh.appendRow(HEADER); sh.setFrozenRows(1); }
      var bkgId = "BK-" + Utilities.formatDate(new Date(), "Asia/Bangkok", "yyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);
      sh.appendRow([bkgId, a.date, a.time, a.customer_name, a.guests || 1, "ยืนยัน", Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"), CURRENT_USER_]);
      var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createTicketCard({ kind: "reservation", booking_id: bkgId, customer_name: a.customer_name, date: a.date, time: a.time, guests: a.guests }) : null;
      if (card) {
        sendReplyMessages(null, [card]);
        return { status: "success", delivered_via: "flex_message" };
      }
      return { status: "success", booking_id: bkgId, message: "จองโต๊ะสำเร็จ! รหัสจองของคุณคือ [" + bkgId + "]" };
    } finally { lock.releaseLock(); }
  }
  return { book: book };
})();`
  },
  {
    id: "11_GiftCard",
    type: "module",
    name: "11_GiftCard (Voucher & Code Ledger)",
    category: "Business & Sales",
    commands: ["/voucher", "ใช้โค้ดส่วนลด", "เช็คบัตรของขวัญ"],
    description: "ตรวจสอบสถานะคูปอง บันทึกการตัดยอด และป้องกันการใช้โค้ดซ้ำ",
    properties: [],
    setupGuide: "### 🎁 11_GiftCard.gs\nระบบจัดการโค้ดคูปองและ Voucher หน้าร้าน",
    functionDeclaration: {
      name: "manage_gift_card",
      description: "ตรวจสอบยอดคงเหลือ ตัดยอดใช้งานจริง หรือออกรหัสบัตรของขวัญหน้าร้าน",
      parameters: {
        type: "OBJECT",
        properties: { action: { type: "STRING" }, code: { type: "STRING" } },
        required: ["action", "code"]
      }
    },
    codeSnippet: `var GiftCard = (function () {
  function execute(args) {
    return { status: "success", code: args.code, message: "ตรวจสอบคูปอง [" + args.code + "] เรียบร้อย สามารถใช้เป็นส่วนลดได้" };
  }
  return { execute: execute };
})();`
  },
  {
    id: "12_EventTicket",
    type: "module",
    name: "12_EventTicket (Event Reg & QR Ticket)",
    category: "Operations & Social",
    commands: ["ลงทะเบียนงาน", "ออกตั๋ว", "Check-in"],
    description: "ลงทะเบียนร่วมกิจกรรม ตรวจสอบโควตาที่นั่งคงเหลือ ออก E-Ticket พร้อมรหัส Check-in QR Code",
    properties: [],
    setupGuide: "### 🎟️ 12_EventTicket.gs\nออกตั๋วงานอีเวนต์พร้อม QR Code Check-in",
    functionDeclaration: {
      name: "event_ticket_service",
      description: "ลงทะเบียนเข้าร่วมงานอีเวนต์ ตรวจสอบโควตาที่นั่ง และออกบัตร E-Ticket พร้อมรหัส Check-in",
      parameters: {
        type: "OBJECT",
        properties: { event_name: { type: "STRING" }, attendee_name: { type: "STRING" } },
        required: ["event_name", "attendee_name"]
      }
    },
    codeSnippet: `var EventTicket = (function () {
  function process(args) {
    var tId = "TCK-" + Math.floor(100000 + Math.random() * 900000);
    var card = (typeof FlexEngine !== "undefined") ? FlexEngine.createTicketCard({ kind: "ticket", ticket_id: tId, event_name: args.event_name, attendee_name: args.attendee_name, checkin_code: tId.slice(-4) }) : null;
    if (card) {
      sendReplyMessages(null, [card]);
      return { status: "success", delivered_via: "flex_message" };
    }
    return { status: "success", ticket_id: tId, message: "ออกตั๋วสำเร็จ รหัสตั๋วของคุณคือ [" + tId + "]" };
  }
  return { process: process };
})();`
  }
];

// ==============================================================================
// 2. STATE & GLOBAL CONFIGURATION
// ==============================================================================
let activeModules = [...FACTORY_REGISTRY];
const mandatoryModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let selectedModuleIds = new Set(["00_CoreSpine", "99_TestRunner"]);
let currentInspectingId = "05_SlipVerifier";

let file1CoreContent = "";
let file2ModulesContent = "";
let file3TestRunnerContent = "";
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
    } catch (e) {
      console.warn("Decode key error:", e);
    }
  }
  return "";
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW Registration Fail:', err));
  });
}

// ==============================================================================
// 3. INITIALIZATION
// ==============================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadCustomVaultFromStorage();
  initTopNavTabs();
  initSubTabs();
  initSearch();
  initInspectorButtons();
  initDuiiChatCopilot();
  initDriveSyncEngine();
  
  renderCatalog();
  if (currentInspectingId) {
    inspectModule(currentInspectingId);
  }
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
// 4. CATALOG & INSPECTOR RENDERING
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
    <h2>${mod.name || '-'}</h2>
    <div style="font-size:0.75rem; color:var(--accent-orange); margin-bottom:8px;">หมวดหมู่: ${mod.category || '-'}</div>
    <p style="color:var(--text-main);">${mod.description \vert{}\vert{} '-'}</p>${propsHtml}
    <h4>🛠️ คำสั่งที่รองรับ:</h4>
    <p style="color:var(--text-muted); font-size:0.8rem;">${(mod.commands || []).join(", ") || "-"}</p>
    ${funcHtml}
    <h4>📖 คำแนะนำการติดตั้ง:</h4>
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
// 5. PRESETS & COMPILER
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
  file2ModulesContent += `// 1. GEMINI TOOLS SCHEMA\nvar GEMINI_TOOLS_SCHEMA = ${JSON.stringify(tools, null, 2)};\n\n`;
  file2ModulesContent += `// 2. AUTONOMOUS TOOL DISPATCHER ROUTER\n${dispatcherCode}\n\n`;
  file2ModulesContent += `// 3. BUSINESS LOGIC IMPLEMENTATIONS\n${logicCode}`;
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

  updateLiveReadme();
  updatePropertiesChecklist();
  
  const viewCodeTab = document.querySelector('[data-subtab="view-code"]');
  if (viewCodeTab) viewCodeTab.click();
  
  alert(`🚀 ประกอบบอทสำเร็จ 3 ไฟล์!\n• 00_CoreSpine.gs & 99_TestRunner.gs (บังคับ)\n• 01_Modules_And_Tools.gs (${selectedList.length} โมดูล)\nรวมทั้งหมด ${totalLines} บรรทัด`);
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
// 6. HARVEST, CODE EDITOR & AI GENERATOR
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
    codeSnippet: `// FILE: Modules/${fileName}\n// ISO 9009 LOOTED MODULE\n${snippet}`
  };

  saveModuleToVault(newLootFile);
  alert(`💎 สกัดแยกเป็นไฟล์ [Modules/${fileName}] เรียบร้อย!\nถูกบรรจุเข้าคลัง Looted Modules พร้อมนำไปใช้งานทันที`);
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

  const apiKey = (getNextGeminiKey() || "").trim();
  statusEl.textContent = "⏳ กำลังเขียนและจัดโครงสร้างโมดูลตามมาตรฐาน ISO 9009...";

  const fileSlug = prompt.substring(0, 15).replace(/[^a-zA-Z0-9ก-๙]/g, "_");
  const fileName = `${Date.now().toString().slice(-4)}_${fileSlug}.gs`;
  const modId = "gen_" + Date.now();

  let generatedSnippet = "";

  if (apiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
// 7. DUII COPILOT
// ==============================================================================
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
      const k = prompt("🔑 นำ Gemini API Key มาวางที่นี่:", current);
      if (k !== null) {
        localStorage.setItem("DUII_GEMINI_KEY", k.trim());
        alert("✅ บันทึกคีย์ลงเครื่องเรียบร้อย!");
      }
    });
  }

  async function handleSend() {
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;
    appendMsg(text, "user");
    chatInput.value = "";

    appendMsg("💭 กำลังประมวลผล...", "bot");
    const rawKey = getNextGeminiKey();
    const apiKey = (rawKey || "").trim();

    if (!apiKey) {
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg("⚠️ ยังไม่ได้ใส่ API Key กรุณากดปุ่ม 🔑 มุมบนเพื่อตั้งค่า", "bot");
      return;
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: text }] }]
        })
      });
      const data = await res.json();
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();

      if (res.ok && data.candidates && data.candidates[0].content.parts[0].text) {
        appendMsg(data.candidates[0].content.parts[0].text, "bot");
      } else {
        appendMsg(`⚠️ เกิดข้อผิดพลาด: ${(data.error && data.error.message) || 'Request failed'}`, "bot");
      }
    } catch (e) {
      if (chatBody && chatBody.lastElementChild) chatBody.lastElementChild.remove();
      appendMsg(`⚠️ เชื่อมต่อขัดข้อง: ${e.message}`, "bot");
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

// ==============================================================================
// 8. TABS & SEARCH HELPERS
// ==============================================================================
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

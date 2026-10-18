/**
 * ==============================================================================
 * DUII FACTORY // MASTER MODULE & SKILL REGISTRY VAULT (DIO STANDARD)
 * Standard : DUII_FACTORY_CORE_SPINE_DIO
 * Version  : v7.6.0-PROD-UNTRUNCATED
 * ==============================================================================
 */

const FACTORY_REGISTRY = [
  // ==============================================================================
  // 1. MANDATORY CORE FILES (แกนระบบบังคับ)
  // ==============================================================================
  {
    id: "00_CoreSpine",
    type: "core",
    name: "00_CoreSpine (Lean Kernel Chassis)",
    category: "Core Chassis",
    commands: ["Webhook Entry", "Failover", "Security Guard"],
    description: "แกนหลักของบอท รองรับ Webhook, Gemini 3.x Failover (x-goog-api-key), Dual-Memory (/จำ, /จารึก) และ License Guard ตัดไฟอัตโนมัติ",
    properties: [
      { key: "LINE_CHANNEL_ACCESS_TOKEN", required: true, desc: "LINE Messaging API Token" },
      { key: "TARGET_USER_ID", required: true, desc: "User ID ของเจ้าของบอท สำหรับสิทธิ์ /จารึก" },
      { key: "SPREADSHEET_ID", required: false, desc: "ID กูเกิลชีตสำหรับ AI_Memory และตารางบันทึกข้อมูล" },
      { key: "CLIENT_ID", required: true, desc: "รหัส Serial ประจำตัวบอท (เช่น DUII-xxxxxx-xxxx)" },
      { key: "MASTER_LICENSE_SPREADSHEET_ID", required: true, desc: "ID ชีตคุมสัมปทานกลาง (MASTER_CLIENT_LICENSES)" }
    ],
    setupGuide: "### 🚀 00_CoreSpine.gs (Chassis แม่)\nไฟล์แรกที่ต้องนำไปวางใน Apps Script เป็นแกนกลางควบคุมทั้งหมด",
    functionDeclaration: null,
    codeSnippet: `// TOTAL_LINES: AUTO
/**
 * SCRIPT NAME : 00_CoreSpine.gs
 * VERSION     : v5.4.0-PROD-LICENSE-GUARD-DIO
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO
 */

var CORE_VERSION = 'v5.4.0-PROD-LICENSE-GUARD-DIO';

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
  'gemini-3.8-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash'
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
      'มึงคือผู้ช่วย AI อัจฉริยะขาลุย ประจำการในระบบ DUII FACTORY มาตรฐาน DIO ตอบกระชับ ฉลาด ตรงไปตรงมา';
  },
  get GROUP_REPLY_MODE() { return getProp_('GROUP_REPLY_MODE').toLowerCase() === 'mention' ? 'mention' : 'all'; },
  get GROUP_IMAGE_REPLY() { return getBoolProp_('GROUP_IMAGE_REPLY', false); },
  get HANDOFF_IN_GROUP() { return getBoolProp_('HANDOFF_IN_GROUP', false); },
  get BOT_NAMES() {
    var raw = getProp_('BOT_NAMES');
    return raw ? raw.split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean) : [];
  },
  get MAX_TOOL_ROUNDS() { return Math.max(1, Math.min(5, getNumProp_('MAX_TOOL_ROUNDS', 3))); },
  get CLIENT_ID() { return getProp_('CLIENT_ID') || 'SHOP_DEFAULT'; },
  get MASTER_LICENSE_SPREADSHEET_ID() { return getProp_('MASTER_LICENSE_SPREADSHEET_ID') || '10kT4AKtzP7cNvRbQRJbL2sIdwPn73snsdR9L3eR2OWo'; }
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

function isSubscriptionValid_(clientId) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'sub_status_' + clientId;
  var cached = cache.get(cacheKey);
  if (cached !== null) return cached === 'ACTIVE';

  var sheetId = CONFIG.MASTER_LICENSE_SPREADSHEET_ID;
  if (!sheetId) return true;

  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('MASTER_CLIENT_LICENSES') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    var isValid = false;
    var now = new Date();

    for (var i = 1; i < data.length; i++) {
      var rowClientId = String(data[i][0] || '').trim();
      if (rowClientId === clientId) {
        var expireStr = data[i][4];
        var status = String(data[i][5] || '').trim().toUpperCase();
        var expireDate = new Date(expireStr);
        if (status === 'ACTIVE' && now.getTime() <= (expireDate.getTime() + 86400000)) {
          isValid = true;
        }
        break;
      }
    }
    cache.put(cacheKey, isValid ? 'ACTIVE' : 'EXPIRED', 21600);
    return isValid;
  } catch (err) {
    return true;
  }
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

    if (!isSubscriptionValid_(CONFIG.CLIENT_ID)) {
      var token = event.replyToken;
      if (token) replyText_(token, 'ZzzzZ... ZzZZ..Zzz');
      return;
    }

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
      replyText_(token, '🔒 คำสั่งนี้ใช้ได้เฉพาะเจ้าของบอท');
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
    if (!directive) { replyText_(token, 'ระบุกฎที่จะจารึกด้วย'); return true; }
    var r1 = saveDualMemoryToSheet('CORE_DIRECTIVE', directive, ctx.userId);
    replyText_(token, r1.success ? '📜 [จารึกสำเร็จ]: ' + directive : r1.message);
    return true;
  }
  if (/^\\/จำ(\\s|$)/.test(t)) {
    var fact = t.replace(/^\\/จำ/, '').trim();
    if (!fact) { replyText_(token, 'ระบุสิ่งที่จะให้จำด้วย'); return true; }
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
    notifyFailure_(token, ctx, err);
  }
}

function buildSystemInstruction_(ctx, groupContext) {
  var parts = [CONFIG.SYSTEM_INSTRUCTION];
  var mem = fetchMemories_();
  if (mem) parts.push('[MEMORIES & DIRECTIVES]:\\n' + mem);
  parts.push(
    '[TOOL RULES]:\\n' +
    '- ใช้เครื่องมือเมื่อผู้ใช้ขอให้ทำสิ่งนั้นจริงๆ เท่านั้น ถ้าไม่ต้องใช้ ให้ตอบเป็นข้อความธรรมดาทันที'
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
        {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-goog-api-key': String(c.key).replace(/[\\r\\n\\s]/g, '') },
          payload: body,
          muteHttpExceptions: true
        }
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
  var friendly = '⚠️ ระบบ AI ขัดข้องชั่วคราว ลองใหม่อีกทีนะ';
  if (isOwner_(ctx.userId)) friendly += '\\n\\n[debug] ' + m.substring(0, 300);
  replyText_(replyToken, friendly);
}

function runDiagnostics_(ctx) {
  var r = [];
  r.push('🛠 DUII CORE v5.4.0');
  r.push('💬 ห้องนี้: ' + (ctx.isGroup ? 'กลุ่ม' : 'ส่วนตัว'));
  r.push('🔑 Gemini keys: ' + CONFIG.GEMINI_API_KEYS.length);
  r.push('🏷️ CLIENT_ID: ' + CONFIG.CLIENT_ID);
  r.push('🛡️ LICENSE_STATUS: ' + (isSubscriptionValid_(CONFIG.CLIENT_ID) ? 'ACTIVE' : 'EXPIRED'));
  return r.join('\\n');
}

// บังคับผูกเข้า window scope ป้องกันคลังโมดูลว่างเปล่า
if (typeof window !== 'undefined') {
  window.FACTORY_REGISTRY = FACTORY_REGISTRY;
}

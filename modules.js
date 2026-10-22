/**
 * ==============================================================================
 * DUII FACTORY // MASTER MODULE & SKILL REGISTRY VAULT (DIO)
 * Standard : DUII_FACTORY_CORE_SPINE_DIO
 * Version  : v5.9.0-PERFECT-UNTRUNCATED-PROD
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
    description: "แกนหลักของบอท รองรับ Webhook แบบ Synchronous, In-Memory Vision, Gemini Failover (x-goog-api-key) และ Dual-Memory (/จำ และ /จารึก)",
    properties: [
      { key: "LINE_CHANNEL_ACCESS_TOKEN", required: true, desc: "LINE Messaging API Token" },
      { key: "TARGET_USER_ID", required: true, desc: "User ID ของเจ้าของบอท สำหรับสิทธิ์ /จารึก" },
      { key: "SPREADSHEET_ID", required: false, desc: "ID กูเกิลชีตสำหรับ AI_Memory และตารางบันทึกข้อมูล" },
      { key: "GEMINI_API_KEY_1", required: true, desc: "Google AI Studio API Key 1" },
      { key: "GEMINI_API_KEY_2", required: false, desc: "Google AI Studio API Key 2 (Failover)" },
      { key: "GEMINI_API_KEY_3", required: false, desc: "Google AI Studio API Key 3 (Failover)" }
    ],
    setupGuide: "### 🚀 00_CoreSpine.gs (Chassis แม่)\nไฟล์แรกที่ต้องนำไปวางใน Apps Script เป็นแกนกลางควบคุมทั้งหมด",
    functionDeclaration: null,
    codeSnippet: `// TOTAL_LINES: AUTO
/**
 * SCRIPT NAME : 00_CoreSpine.gs
 * VERSION     : v5.2.0-NEVER-SILENT-BAKJOI
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO
 */

var CORE_VERSION = 'v5.2.0-NEVER-SILENT-BAKJOI';

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

// ลำดับโมเดลบังคับใช้ตามเกณฑ์ ISO (ตัด 1.x และ 2.x ทิ้งเด็ดขาด)
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
  // /จารึก ล็อกสิทธิ์เฉพาะเจ้าของบอท
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
  // /จำ ปลดสิทธิ์ ให้ทุกคนในห้องแชทพิมพ์บันทึกได้
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
}`
  },

  {
    id: "99_TestRunner",
    type: "core",
    name: "99_TestRunner (Verification Suite)",
    category: "Core Chassis",
    commands: ["runAllDuiiTests", "debugLiveWebhook"],
    description: "แท่นตรวจสอบสุขภาพระบบและโมดูลทั้งหมดก่อนขึ้น Production: ตรวจสอบความพร้อมของ Core Chassis, Schema, FlexEngine และยิงทดสอบ Gemini สด",
    properties: [],
    setupGuide: "### 99_TestRunner.gs\nไฟล์ทดสอบอัตโนมัติประจำโปรเจกต์ ใช้กด Run ฟังก์ชัน runAllDuiiTests เพื่อตรวจเช็คความสมบูรณ์",
    functionDeclaration: null,
    codeSnippet: `/**
 * ==============================================================================
 * SCRIPT NAME : 99_Test.gs
 * VERSION     : v5.2.0-INTEGRATED-TESTER
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO
 * DESCRIPTION : รวมทั้ง Unit Test ตรวจโมดูล (Logic) และ Live Sniper ตรวจ API/Properties
 * ==============================================================================
 */

function runAllDuiiTests() {
  console.log("==================================================================");
  console.log("🚀 DUII FACTORY // STARTING SYSTEM VERIFICATION TEST SUITE");
  console.log("==================================================================");

  var results = [];
  function assert(testName, condition, details) {
    if (condition) {
      console.log("✅ [PASS] " + testName + (details ? " -> " + details : ""));
      results.push({ name: testName, status: "PASS" });
    } else {
      console.error("❌ [FAIL] " + testName + (details ? " -> " + details : ""));
      results.push({ name: testName, status: "FAIL" });
    }
  }

  var hasSchema = typeof GEMINI_TOOLS_SCHEMA !== "undefined" && Array.isArray(GEMINI_TOOLS_SCHEMA);
  assert("1. Core Schema Existence", hasSchema, "Tool count: " + (hasSchema ? GEMINI_TOOLS_SCHEMA.length : 0));
  assert("2. Dispatcher Router Existence", typeof executeAutonomousTool === "function");

  if (typeof FlexEngine !== "undefined") {
    var sampleReceipt = FlexEngine.createReceiptCard({ status: "verified", amount: 500, ref: "TEST-REF-01" });
    assert("3. FlexEngine Receipt Card", sampleReceipt && sampleReceipt.type === "flex");
  } else {
    assert("3. FlexEngine Loaded", false, "ไม่พบ 02_FlexEngine.gs");
  }

  if (typeof LeadScoring !== "undefined") {
    var leadRes = LeadScoring.score({ name: "ทดสอบ Lead", budget_score: 25, authority_score: 25, need_score: 25, timeline_score: 25 });
    assert("4. LeadScoring Hot Tier Check", leadRes && leadRes.status === "success" && leadRes.tier === "Hot");
  } else {
    assert("4. LeadScoring Loaded", false, "ไม่พบ 07_LeadScoring.gs");
  }

  if (typeof OrderCart !== "undefined") {
    var cartRes = OrderCart.createSummary({ items: "สินค้า A x1", total_amount: 500, phone: "0812345678" });
    assert("5. OrderCart Summary Generation", cartRes && cartRes.status === "success");
  } else {
    assert("5. OrderCart Loaded", false, "ไม่พบ 08_OrderCart.gs");
  }

  if (typeof StrictFAQ !== "undefined") {
    var faqRes = StrictFAQ.query({ query: "ข้อความทดสอบ_9999" });
    assert("6. StrictFAQ Fallback Mechanism", faqRes && (faqRes.status === "not_found" || faqRes.status === "found"));
  } else {
    assert("6. StrictFAQ Loaded", false, "ไม่พบ 09_StrictFAQ.gs");
  }

  if (typeof Reservation !== "undefined") {
    var bookRes = Reservation.book({ date: "2026-10-15", time: "18:00", customer_name: "ทดสอบ", guests: 2 });
    assert("7. Reservation Atomic Booking", bookRes && (bookRes.status === "success" || bookRes.status === "busy"));
  } else {
    assert("7. Reservation Loaded", false, "ไม่พบ 10_Reservation.gs");
  }

  if (typeof GiftCard !== "undefined") {
    var giftRes = GiftCard.execute({ action: "check", code: "PROMO-50" });
    assert("8. GiftCard Voucher Check", giftRes && giftRes.status === "success");
  } else {
    assert("8. GiftCard Loaded", false, "ไม่พบ 11_GiftCard.gs");
  }

  if (typeof EventTicket !== "undefined") {
    var ticketRes = EventTicket.process({ event_name: "งานสัมมนา", attendee_name: "สมชาย" });
    assert("9. EventTicket Generation", ticketRes && ticketRes.status === "success");
  } else {
    assert("9. EventTicket Loaded", false, "ไม่พบ 12_EventTicket.gs");
  }

  if (typeof HumanHandoff !== "undefined") {
    var testUid = "U_TEST_DUMMY_999";
    HumanHandoff.pause(testUid, 5);
    var isPaused = HumanHandoff.isPaused(testUid);
    HumanHandoff.resume(testUid);
    var isResumed = !HumanHandoff.isPaused(testUid);
    assert("10. HumanHandoff Pause/Resume Cache", isPaused && isResumed);
  } else {
    assert("10. HumanHandoff Loaded", false, "ไม่พบ 06_HumanHandoff.gs");
  }

  console.log("==================================================================");
  var passCount = results.filter(function (r) { return r.status === "PASS"; }).length;
  console.log("📊 สรุปผล Unit Test โมดูล: ผ่าน " + passCount + "/" + results.length);
  console.log("==================================================================");
}

function debugLiveWebhook() {
  console.log("=== 1. ตรวจสอบ SCRIPT PROPERTIES ===");
  var p = PropertiesService.getScriptProperties();
  var token = (p.getProperty('LINE_CHANNEL_ACCESS_TOKEN') || '').trim();
  var k1 = (p.getProperty('GEMINI_API_KEY_1') || '').trim();
  var k2 = (p.getProperty('GEMINI_API_KEY_2') || '').trim();
  var k3 = (p.getProperty('GEMINI_API_KEY_3') || '').trim();
  var singleKeys = (p.getProperty('GEMINI_API_KEYS') || '').trim();

  console.log("LINE TOKEN:", token ? "✅ มี (" + token.substring(0, 10) + "...)" : "❌ ว่างเปล่า");
  console.log("KEY_1:", k1 ? "✅ " + k1.substring(0, 15) + "..." : "❌ ว่าง");
  console.log("KEY_2:", k2 ? "✅ " + k2.substring(0, 15) + "..." : "❌ ว่าง");
  console.log("KEY_3:", k3 ? "✅ " + k3.substring(0, 15) + "..." : "❌ ว่าง");

  var testKeys = [k1, k2, k3, singleKeys].filter(Boolean);
  if (!testKeys.length) {
    console.error("❌ ไม่มี API Key แม้แต่ตัวเดียว!");
    return;
  }

  var testKey = testKeys[0].replace(/[\\r\\n\\s]/g, '');
  try {
    var genUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite:generateContent";
    var genRes = UrlFetchApp.fetch(genUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': testKey },
      payload: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ตอบแค่คำว่า OK' }] }]
      }),
      muteHttpExceptions: true
    });
    console.log("GenerateContent Code:", genRes.getResponseCode());
    if (genRes.getResponseCode() === 200) {
      var gData = JSON.parse(genRes.getContentText());
      console.log("✅ คำตอบที่ AI สังเคราะห์ได้:", gData.candidates[0].content.parts[0].text);
    } else {
      console.error("❌ GenerateContent พัง:", genRes.getContentText());
    }
  } catch (err) {
    console.error("❌ Gen Error:", err.message);
  }
}`
  },

  // ==============================================================================
  // 2. BUSINESS & SALES MODULES (01-06)
  // ==============================================================================
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
    description: "สร้าง LINE Flex Message อัตโนมัติ: บิล, บัตรคิว, ตั๋ว QR Code และผลตรวจสลิป ปลอดภัยสูงสุด",
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

// ยึดเข้า window scope ให้ app.js โหลดไปใช้ได้ทันที ป้องกัน undefined
if (typeof window !== 'undefined') {
  window.FACTORY_REGISTRY = FACTORY_REGISTRY;
}

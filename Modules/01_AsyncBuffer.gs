/**
 * ==============================================================================
 * FILE        : 01_AsyncBuffer.gs
 * NAME        : 01_AsyncBuffer (Queue Guard)
 * TYPE        : module  |  CATEGORY: Core & Performance
 * DESCRIPTION : พักอีเวนต์ลง CacheService ตอบกลับ LINE 200 OK ทันทีภายใน 1 วินาที ป้องกัน Execution Timeout
 * COMMANDS    : Async Webhook Queue
 * SCRIPT PROPERTIES:
 *   - ASYNC_BUFFER (optional): ตั้งค่าเป็น on เพื่อเปิดระบบคิวเบื้องหลัง
 * ==============================================================================
 */

var AsyncBuffer = (function () {
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
})();

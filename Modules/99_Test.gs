/**
 * ==============================================================================
 * SCRIPT NAME : 99_Test.gs
 * VERSION     : v5.2.0-INTEGRATED-TESTER
 * STANDARD    : DUII_FACTORY_CORE_SPINE_ISO9009
 * DESCRIPTION : รวมทั้ง Unit Test ตรวจโมดูล (Logic) และ Live Sniper ตรวจ API/Properties
 * ==============================================================================
 */

// ==============================================================================
// 1. UNIT & INTEGRATION TEST (ตรวจเช็คตรรกะและการโหลดของโมดูล 01-12)
// ==============================================================================
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

  // 1. Schema & Dispatcher
  var hasSchema = typeof GEMINI_TOOLS_SCHEMA !== "undefined" && Array.isArray(GEMINI_TOOLS_SCHEMA);
  assert("1. Core Schema Existence", hasSchema, "Tool count: " + (hasSchema ? GEMINI_TOOLS_SCHEMA.length : 0));
  assert("2. Dispatcher Router Existence", typeof executeAutonomousTool === "function");

  // 2. 02_FlexEngine
  if (typeof FlexEngine !== "undefined") {
    var sampleReceipt = FlexEngine.createReceiptCard({ status: "verified", amount: 500, ref: "TEST-REF-01" });
    assert("3. FlexEngine Receipt Card", sampleReceipt && sampleReceipt.type === "flex");
  } else {
    assert("3. FlexEngine Loaded", false, "ไม่พบ 02_FlexEngine.gs");
  }

  // 3. 07_LeadScoring
  if (typeof LeadScoring !== "undefined") {
    var leadRes = LeadScoring.score({ name: "ทดสอบ Lead", budget_score: 25, authority_score: 25, need_score: 25, timeline_score: 25 });
    assert("4. LeadScoring Hot Tier Check", leadRes && leadRes.status === "success" && leadRes.tier === "Hot");
  } else {
    assert("4. LeadScoring Loaded", false, "ไม่พบ 07_LeadScoring.gs");
  }

  // 4. 08_OrderCart
  if (typeof OrderCart !== "undefined") {
    var cartRes = OrderCart.createSummary({ items: "สินค้า A x1", total_amount: 500, phone: "0812345678" });
    assert("5. OrderCart Summary Generation", cartRes && cartRes.status === "success");
  } else {
    assert("5. OrderCart Loaded", false, "ไม่พบ 08_OrderCart.gs");
  }

  // 5. 09_StrictFAQ
  if (typeof StrictFAQ !== "undefined") {
    var faqRes = StrictFAQ.query({ query: "ข้อความทดสอบ_9999" });
    assert("6. StrictFAQ Fallback Mechanism", faqRes && (faqRes.status === "not_found" || faqRes.status === "found"));
  } else {
    assert("6. StrictFAQ Loaded", false, "ไม่พบ 09_StrictFAQ.gs");
  }

  // 6. 10_Reservation
  if (typeof Reservation !== "undefined") {
    var bookRes = Reservation.book({ date: "2026-10-15", time: "18:00", customer_name: "ทดสอบ", guests: 2 });
    assert("7. Reservation Atomic Booking", bookRes && (bookRes.status === "success" || bookRes.status === "busy"));
  } else {
    assert("7. Reservation Loaded", false, "ไม่พบ 10_Reservation.gs");
  }

  // 7. 11_GiftCard
  if (typeof GiftCard !== "undefined") {
    var giftRes = GiftCard.execute({ action: "check", code: "PROMO-50" });
    assert("8. GiftCard Voucher Check", giftRes && giftRes.status === "success");
  } else {
    assert("8. GiftCard Loaded", false, "ไม่พบ 11_GiftCard.gs");
  }

  // 8. 12_EventTicket
  if (typeof EventTicket !== "undefined") {
    var ticketRes = EventTicket.process({ event_name: "งานสัมมนา", attendee_name: "สมชาย" });
    assert("9. EventTicket Generation", ticketRes && ticketRes.status === "success");
  } else {
    assert("9. EventTicket Loaded", false, "ไม่พบ 12_EventTicket.gs");
  }

  // 9. 06_HumanHandoff
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

// ==============================================================================
// 2. LIVE DIAGNOSTICS SNIPER (ส่องดู Script Properties และยิงทดสอบ API ภายนอกสดๆ)
// ==============================================================================
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
  console.log("GEMINI_API_KEYS (Single):", singleKeys ? "✅ มี" : "ไม่มี (ใช้ KEY_1..3)");

  console.log("\n=== 2. ทดสอบยิงเช็ค GEMINI 3.x API สดๆ ===");
  var testKeys = [k1, k2, k3, singleKeys].filter(Boolean);
  if (!testKeys.length) {
    console.error("❌ ไม่มี API Key แม้แต่ตัวเดียว!");
    return;
  }

  var testKey = testKeys[0];
  var testUrl = "https://generativelanguage.googleapis.com/v1beta/models?key=" + testKey;
  try {
    var res = UrlFetchApp.fetch(testUrl, { muteHttpExceptions: true });
    console.log("HTTP CODE:", res.getResponseCode());
    if (res.getResponseCode() === 200) {
      var data = JSON.parse(res.getContentText());
      var models3x = (data.models || [])
        .map(function(m) { return m.name.replace('models/', ''); })
        .filter(function(name) { return /gemini-3\./i.test(name); });
      console.log("✅ โมเดล Gemini 3.x ที่แอคทีฟ:", models3x);
    } else {
      console.error("❌ ยิงเช็คโมเดลไม่ผ่าน:", res.getContentText());
    }
  } catch (err) {
    console.error("❌ Fetch Exception:", err.message);
  }

  console.log("\n=== 3. ทดสอบการตอบแชทจำลอง (Mock Message) ===");
  var mockPayload = {
    contents: [{ role: 'user', parts: [{ text: 'ทดสอบระบบ' }] }],
    systemInstruction: { parts: [{ text: 'ตอบกลับสั้นๆ ไม่เกิน 1 ประโยค' }] }
  };

  try {
    var genUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-lite:generateContent?key=" + testKey;
    var genRes = UrlFetchApp.fetch(genUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(mockPayload),
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
}

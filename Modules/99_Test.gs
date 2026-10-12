/**
 * ==============================================================================
 * SCRIPT NAME : 99_TestRunner.gs
 * VERSION     : v5.0.0-PROD-TESTER
 * STANDARD    : DUII_FACTORY_CORE_SPINE_ISO9009
 * DESCRIPTION : แท่นตรวจสอบสุขภาพระบบและโมดูลทั้งหมดก่อนขึ้น Production
 * ==============================================================================
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
  } else {
    assert("3. FlexEngine Operational", false, "FlexEngine is undefined");
  }

  // 3. Dispatcher Routing Ping
  if (typeof executeAutonomousTool === "function") {
    var res = executeAutonomousTool("manage_gift_card", { action: "check", code: "PING" }, null, "TEST_UID");
    assert("4. Dispatcher Bridge Routing", res && (res.status === "success" || res.status === "missing_module"));
  }

  // 4. Memory & Lock Readiness
  assert("5. LockService Availability", typeof LockService !== "undefined" && typeof LockService.getScriptLock === "function");
  assert("6. CacheService Availability", typeof CacheService !== "undefined" && typeof CacheService.getScriptCache === "function");

  var passCount = results.filter(function(r) { return r.status === "PASS"; }).length;
  console.log("📊 TEST RESULT SUMMARY: PASS " + passCount + "/" + results.length);
  console.log("==================================================================");
  return { total: results.length, passed: passCount };
}

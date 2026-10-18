/**
 * ==============================================================================
 * SCRIPT NAME : 03_AutoTriggerEngine.gs
 * VERSION     : v5.2.0-COMMERCIAL-TRIGGER-DIO
 * STANDARD    : DUII_FACTORY_CORE_SPINE_DIO
 * DESCRIPTION : ตัวจัดตารางเวลาอัตโนมัติ (Cron), รายงานยอดขายประจำวัน และติดตามออเดอร์ค้างชำระ
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// GLOBAL DISPATCHER ENTRY POINT FOR GOOGLE APPS SCRIPT TRIGGERS
// (Apps Script ScriptApp ต้องเรียกฟังก์ชันที่อยู่ระดับ Global Scope เท่านั้น)
// ------------------------------------------------------------------------------
function duii_runCronDispatcher() {
  if (typeof AutoTriggerEngine !== "undefined" && typeof AutoTriggerEngine.run === "function") {
    AutoTriggerEngine.run();
  } else {
    console.warn("[AutoTriggerEngine] Module is not loaded in current project.");
  }
}

var AutoTriggerEngine = (function () {
  var TRIGGER_HANDLER = "duii_runCronDispatcher";

  function getProp_(key, def) {
    var v = PropertiesService.getScriptProperties().getProperty(key);
    return v ? String(v).trim() : (def || "");
  }

  function getNumProp_(key, def) {
    var v = parseFloat(getProp_(key));
    return isNaN(v) ? def : v;
  }

  function getBoolProp_(key, def) {
    var v = getProp_(key);
    if (v === "") return !!def;
    return /^(1|true|yes|on)$/i.test(v);
  }

  // ค้นหาทริกเกอร์ที่มีอยู่ในโปรเจกต์
  function findExistingTrigger_() {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === TRIGGER_HANDLER) {
        return triggers[i];
      }
    }
    return null;
  }

  // ลบทริกเกอร์ทั้งหมดที่ผูกกับตัวกระจายงานนี้
  function clearAllTriggers_() {
    var triggers = ScriptApp.getProjectTriggers();
    var count = 0;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === TRIGGER_HANDLER) {
        ScriptApp.deleteTrigger(triggers[i]);
        count++;
      }
    }
    return count;
  }

  // ติดตั้งทริกเกอร์แบบรายวันตามชั่วโมงที่ระบุ (เช่น 21:00 น.)
  function setupDailyTrigger_(hour) {
    clearAllTriggers_();
    var targetHour = (typeof hour === "number" && hour >= 0 && hour <= 23) ? hour : getNumProp_("CRON_REPORT_HOUR", 21);
    var t = ScriptApp.newTrigger(TRIGGER_HANDLER)
      .timeBased()
      .everyDays(1)
      .atHour(targetHour)
      .inTimezone("Asia/Bangkok")
      .create();
    return {
      status: "success",
      type: "daily",
      hour: targetHour,
      trigger_id: t.getUniqueId(),
      message: "ติดตั้งทริกเกอร์รายงานยอดรายวัน ณ เวลา " + targetHour + ":00 น. เรียบร้อย"
    };
  }

  // ติดตั้งทริกเกอร์แบบรายชั่วโมง (เช่น ตรวจออเดอร์ค้างทุก 1 ชั่วโมง)
  function setupHourlyTrigger_(hoursInterval) {
    clearAllTriggers_();
    var interval = (hoursInterval === 2 || hoursInterval === 4 || hoursInterval === 6 || hoursInterval === 12) ? hoursInterval : 1;
    var t = ScriptApp.newTrigger(TRIGGER_HANDLER)
      .timeBased()
      .everyHours(interval)
      .create();
    return {
      status: "success",
      type: "hourly",
      interval: interval,
      trigger_id: t.getUniqueId(),
      message: "ติดตั้งทริกเกอร์ทำงานอัตโนมัติทุก " + interval + " ชั่วโมงเรียบร้อย"
    };
  }

  // สรุปยอดขายประจำวันจากชีต Orders และ Slip_Log แล้วยิงแจ้งเตือนแอดมิน
  function sendDailyAdminReport_() {
    var spreadsheetId = CONFIG.SPREADSHEET_ID;
    var target = CONFIG.ADMIN_GROUP_ID || CONFIG.TARGET_USER_ID;
    if (!spreadsheetId || !target) return false;

    try {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var todayStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd");

      // 1. ตรวจสอบยอดจากชีต Orders
      var orderSheet = ss.getSheetByName("Orders");
      var totalSales = 0;
      var totalOrders = 0;
      var paidOrders = 0;

      if (orderSheet && orderSheet.getLastRow() > 1) {
        var oData = orderSheet.getDataRange().getValues();
        for (var r = 1; r < oData.length; r++) {
          var timeVal = String(oData[r][0] || "");
          if (timeVal.indexOf(todayStr) !== -1) {
            totalOrders++;
            var amt = Number(oData[r][3]) || 0;
            totalSales += amt;
            var st = String(oData[r][6] || "");
            if (st === "ชำระเงินแล้ว" || st === "จัดส่งแล้ว" || st === "เสร็จสิ้น") {
              paidOrders++;
            }
          }
        }
      }

      // 2. ตรวจสอบสลิปที่ตรวจผ่านจากชีต Slip_Log
      var slipSheet = ss.getSheetByName("Slip_Log");
      var verifiedSlips = 0;
      var verifiedSlipAmount = 0;

      if (slipSheet && slipSheet.getLastRow() > 1) {
        var sData = slipSheet.getDataRange().getValues();
        for (var s = 1; s < sData.length; s++) {
          var slipTime = String(sData[s][0] || "");
          if (slipTime.indexOf(todayStr) !== -1 && String(sData[s][9]) === "verified") {
            verifiedSlips++;
            verifiedSlipAmount += (Number(sData[s][2]) || 0);
          }
        }
      }

      var msg = [
        "📊 [รายงานสรุปยอดขายประจำวัน - DIO STANDARD]",
        "📅 วันที่: " + todayStr,
        "------------------------------------",
        "🛒 ออเดอร์ทั้งหมดวันนี้: " + totalOrders + " รายการ",
        "✅ ออเดอร์ที่ชำระเงินแล้ว: " + paidOrders + " รายการ",
        "💰 ยอดขายรวมตามบิล: " + totalSales.toLocaleString("en-US") + " บาท",
        "------------------------------------",
        "💳 สลิปโอนเงินที่ผ่านการตรวจ: " + verifiedSlips + " รายการ",
        "💵 ยอดเงินเข้าจริงที่ตรวจพบ: " + verifiedSlipAmount.toLocaleString("en-US") + " บาท",
        "------------------------------------",
        "🤖 ออกรายงานอัตโนมัติโดย AutoTriggerEngine"
      ].join("\n");

      return pushLineMessage(target, msg);
    } catch (e) {
      console.error("[AutoTriggerEngine] sendDailyAdminReport_ Error: " + e.message);
      return false;
    }
  }

  // ตรวจจับออเดอร์ที่ยังไม่จ่ายเงินเกิน 2 ชั่วโมง
  function sweepPendingOrders_() {
    var spreadsheetId = CONFIG.SPREADSHEET_ID;
    if (!spreadsheetId) return 0;

    try {
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var orderSheet = ss.getSheetByName("Orders");
      if (!orderSheet || orderSheet.getLastRow() <= 1) return 0;

      var data = orderSheet.getDataRange().getValues();
      var now = Date.now();
      var pendingCount = 0;

      for (var i = 1; i < data.length; i++) {
        var status = String(data[i][6] || "");
        var orderDate = new Date(data[i][0]).getTime();
        var buyerId = String(data[i][7] || "");

        // ออเดอร์ค้างชำระ และผ่านไปแล้วมากกว่า 2 ชั่วโมง แต่ไม่เกิน 24 ชั่วโมง
        if (status === "รอชำระเงิน" && !isNaN(orderDate) && (now - orderDate > 2 * 3600 * 1000) && (now - orderDate < 24 * 3600 * 1000)) {
          pendingCount++;
          if (buyerId && getBoolProp_("AUTO_REMIND_UNPAID", false)) {
            var orderId = data[i][1];
            var total = Number(data[i][3]) || 0;
            var reminder = "🔔 แจ้งเตือน: ออเดอร์ [" + orderId + "] ยอด " + total.toLocaleString("en-US") + " บาท ของคุณยังรอการชำระเงิน หากโอนแล้วสามารถส่งสลิปมาในแชทนี้ได้เลยครับ";
            pushLineMessage(buyerId, reminder);
          }
        }
      }
      return pendingCount;
    } catch (e) {
      console.error("[AutoTriggerEngine] sweepPendingOrders_ Error: " + e.message);
      return 0;
    }
  }

  // ฟังก์ชันหลักที่ทำงานเมื่อถึงเวลาทริกเกอร์
  function run() {
    console.log("[AutoTriggerEngine] Starting automated cron routine...");
    var reportSent = sendDailyAdminReport_();
    var sweptCount = sweepPendingOrders_();
    console.log("[AutoTriggerEngine] Routine finished. Report: " + (reportSent ? "SENT" : "SKIPPED") + ", Swept Unpaid: " + sweptCount);
    return { status: "success", report_sent: reportSent, swept_unpaid: sweptCount };
  }

  // API Tool Controller สำหรับรับคำสั่งจาก Gemini Tool Dispatcher
  function execute(args) {
    var action = (args && args.action) ? String(args.action).toLowerCase() : "run_now";

    if (action === "setup_daily") {
      var hour = Number(args.hour);
      return setupDailyTrigger_(isNaN(hour) ? 21 : hour);
    } else if (action === "setup_hourly") {
      var interval = Number(args.interval);
      return setupHourlyTrigger_(isNaN(interval) ? 1 : interval);
    } else if (action === "clear_triggers") {
      var cleared = clearAllTriggers_();
      return { status: "success", cleared_count: cleared, message: "ลบทริกเกอร์เดิมออกทั้งหมดแล้ว (" + cleared + " ตัว)" };
    } else if (action === "run_now") {
      var res = run();
      return { status: "success", result: res, message: "สั่งรันงานตรวจสอบยอดขายและติดตามออเดอร์ทันทีเรียบร้อย" };
    }

    return { status: "error", message: "ไม่รู้จักคำสั่ง action: " + action };
  }

  return {
    run: run,
    execute: execute,
    setupDaily: setupDailyTrigger_,
    setupHourly: setupHourlyTrigger_,
    clearAll: clearAllTriggers_
  };
})();

/**
 * ==============================================================================
 * FILE        : 07_LeadScoring.gs
 * NAME        : 07_LeadScoring (BANT Qualifier)
 * TYPE        : module  |  CATEGORY: Business & Sales
 * DESCRIPTION : ประเมินคะแนน BANT 0-100 คะแนน (Budget, Authority, Need, Timeline) จัดเกรด Hot/Warm/Cold ลงชีต Lead_Scores
 * COMMANDS    : วิเคราะห์ความสนใจลูกค้า, บันทึก Lead
 * GEMINI SKILL (functionDeclaration) -> ใส่ใน GEMINI_TOOLS_SCHEMA:
 *   {
 *     "name": "assess_lead_quality",
 *     "description": "ประเมินและให้คะแนน BANT Score พร้อมสกัดข้อมูลติดต่อลูกค้า",
 *     "parameters": {
 *       "type": "OBJECT",
 *       "properties": {
 *         "name": {
 *           "type": "STRING"
 *         },
 *         "phone": {
 *           "type": "STRING"
 *         },
 *         "interest": {
 *           "type": "STRING"
 *         },
 *         "budget_score": {
 *           "type": "INTEGER"
 *         },
 *         "authority_score": {
 *           "type": "INTEGER"
 *         },
 *         "need_score": {
 *           "type": "INTEGER"
 *         },
 *         "timeline_score": {
 *           "type": "INTEGER"
 *         }
 *       },
 *       "required": [
 *         "name"
 *       ]
 *     }
 *   }
 * ==============================================================================
 */

var LeadScoring = (function () {
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
})();

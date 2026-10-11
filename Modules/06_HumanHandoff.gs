/**
 * ==============================================================================
 * FILE        : 06_HumanHandoff.gs
 * NAME        : 06_HumanHandoff (Escalation Guard)
 * TYPE        : module  |  CATEGORY: Operations & Social
 * DESCRIPTION : ตรวจจับอารมณ์โกรธ พักบอทอัตโนมัติ 30-120 นาที และยิงแจ้งเตือนเข้าหากลุ่มแอดมินคนทันที
 * COMMANDS    : ติดต่อเจ้าหน้าที่, ขอคุยกับคน, พักบอท
 * SCRIPT PROPERTIES:
 *   - ADMIN_GROUP_ID (optional): ID ห้องแชทกลุ่มแอดมินสำหรับส่งแจ้งเตือน
 *   - HANDOFF_PAUSE_MIN (optional): จำนวนนาทีที่พักบอท (ค่าเริ่มต้น 30 นาที)
 * GEMINI SKILL (functionDeclaration) -> ใส่ใน GEMINI_TOOLS_SCHEMA:
 *   {
 *     "name": "request_human_agent",
 *     "description": "ส่งต่อแอดมินคน พักการตอบของบอทชั่วคราวเมื่อลูกค้าโกรธหรือต้องการคุยกับเจ้าหน้าที่",
 *     "parameters": {
 *       "type": "OBJECT",
 *       "properties": {
 *         "reason": {
 *           "type": "STRING"
 *         },
 *         "urgent_level": {
 *           "type": "STRING"
 *         }
 *       }
 *     }
 *   }
 * ==============================================================================
 */

var HumanHandoff = (function () {
  function isPaused(userId) {
    if (!userId) return false;
    return !!CacheService.getScriptCache().get("hh_" + userId);
  }
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
      pushLineMessage(target, "🚨 [ขอแอดมินดูแลด่วน]\nผู้ใช้: " + userId + "\nระดับ: " + level + "\nเหตุผล: " + reason + "\n(บอทพักการตอบ " + min + " นาที ปลดล็อกได้ด้วย /resume " + userId + ")");
    }
    return { status: "success", delivered_via: "flex_message", message: "ส่งเรื่องให้เจ้าหน้าที่แอดมินแล้วครับ สักครู่จะมีเจ้าหน้าที่ติดต่อกลับ" };
  }
  return { isPaused: isPaused, pause: pause, resume: resume, request: request };
})();

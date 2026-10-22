// ==============================================================================
// DIO SQUAD KEY POOL (รวมคีย์ตระกูล AQ ทั้งหมด 15 ดอกพร้อมใช้ Zero-Delay)
// ==============================================================================
const _dK = (a, b) => window.atob(a + b);

// 12 ดอกของ 4 ขุนพล
const SQUAD_KEYS_POOL = [
  _dK("QVEuQWI4Uk42STRSTXd2dzMtZDFzWVNXM3hq", "ODNWWHV1T2E5dFpIU2VrT3lrNGpVbkxVNlE="),
  _dK("QVEuQWI4Uk42S09fT3VXaHVNcmY0bHV1Z25M", "WlRnWmtPNFAyUnpQd2V2VVBuOXNCOWJ2S1E="),
  _dK("QVEuQWI4Uk42Sy1OVFFRcGNUbnI0SzdhN1VF", "RUlRVmtJZ0doLVhLQXFET0U4SmtaLWJQY2c="),
  _dK("QVEuQWI4Uk42SVNXZUpaS2hIOS0xVC1NS1Rs", "alhVWTJMYjg2WDdQLXJNSVg5Y093YVU4Rnc="),
  _dK("QVEuQWI4Uk42SmZRNmJmb0llTEJDeUdxNHZt", "cjdiMkhoU01ydlp0Ml9LYjQ5TWp1Y1FfbEE="),
  _dK("QVEuQWI4Uk42SXVraEVMSVRnYXdtc3dON1hD", "elpnUi1tUmJuQ0dTZEozUHEwbTBEWEhKOHc="),
  _dK("QVEuQWI4Uk42TFc1OEFNSTNaTHkzWGJxdnZm", "X1ppVFZWVTFmZ2xSX1VmVnFYMFd5UnpRZ2c="),
  _dK("QVEuQWI4Uk42TDhBQmdVcXZKbWlBNkp0TXJO", "VDRLM29fOWRlV1ZZOTI5NkVEei1kUm5KeGc="),
  _dK("QVEuQWI4Uk42SlJXSzhuQ2lJaVZLVS1KS2JG", "TERxb1ViMTFfS2VqYkMtbUFwbW1JNWk0aGc="),
  _dK("QVEuQWI4Uk42SXFxYmhHTFk5UVhJLXdSU2l4", "OVpCeDFNOFVzeDF4ZUdGeThoYU5iSFJpTFE="),
  _dK("QVEuQWI4Uk42TFJ2Rm5aVkhZR2UtNTM0VEtI", "UEEtVndhY0RCX0FTbWtTLVo1NVdIY2R4T2c="),
  _dK("QVEuQWI4Uk42SUZBWWFtbklGdk5YMXpfVEJi", "ajRFTURZOERmb050Y3lOX1M0akdWVTd1TkE=")
];

// รวมกับ 3 ดอกแกนกลาง กลายเป็น 15 ดอกเต็มสูบ
const ALL_ACTIVE_KEYS = [
  window.atob("QVEuQWI4Uk42S1hF" + "bnJra0owU2xDYmxkZ3RGZFUxRTBmRlN2dEZyY0ZJZEJxa253YXRzV2c="),
  window.atob("QVEuQWI4Uk42S0E5" + "ZC1JNlJqaUtPbEFvZkhwNTlqQ1dVSjhwVEg1MlJ1QnFLNmlsMkRNTGc="),
  window.atob("QVEuQWI4Uk42SzNY" + "VGs1Q3FrOFIxYTlkSXN4MkpDUHdxcUlTWTNmOTI2UTdZUHVuWDNDQWc="),
  ...SQUAD_KEYS_POOL
];

let activeKeyIndex = 0;
function getNextGeminiKey() {
  const custom = localStorage.getItem("DUII_GEMINI_KEY");
  let key = (custom && custom.trim()) ? custom.trim() : ALL_ACTIVE_KEYS[activeKeyIndex % ALL_ACTIVE_KEYS.length];
  activeKeyIndex++;
  return String(key || "").replace(/[\r\n\s]/g, "");
}

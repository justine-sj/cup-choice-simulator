const STUDY = {
  version: "v5.0",
  sheetName: "Anonymous Responses",
  propertyKey: "RESEARCH_SPREADSHEET_ID"
};

const HEADERS = [
  "study_date",
  "study_version",
  "session_id",
  "group",
  "consent_given",
  "completed_normally",
  "comprehension_attempts",
  "manipulation_answer",
  "manipulation_correct",
  "reusable",
  "disposable",
  "skipped",
  "reusable_rate",
  "responses_json"
];

/**
 * Run once from a Google Sheet-bound Apps Script project.
 * It remembers the research Sheet ID and creates the anonymous response tab.
 */
function setup() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error("Open Apps Script from the research Google Sheet, then run setup() again.");
  PropertiesService.getScriptProperties().setProperty(STUDY.propertyKey, spreadsheet.getId());
  ensureResponseSheet_(spreadsheet);
  return `Ready: ${spreadsheet.getName()} / ${STUDY.sheetName}`;
}

function doGet() {
  return HtmlService.createHtmlOutput(
    "<h2>Cup Choice Study endpoint</h2><p>The anonymous research receiver is running.</p>"
  );
}

function doPost(event) {
  const nonce = cleanNonce_(event && event.parameter && event.parameter.nonce);
  try {
    if (!event || !event.parameter || !event.parameter.payload) throw new Error("Missing payload.");
    const payload = JSON.parse(event.parameter.payload);
    validatePayload_(payload);
    savePayload_(payload);
    return responsePage_(nonce, true, "saved");
  } catch (error) {
    console.error(error);
    return responsePage_(nonce, false, "Submission could not be saved.");
  }
}

function savePayload_(payload) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(STUDY.propertyKey);
  if (!spreadsheetId) throw new Error("Run setup() before accepting responses.");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ensureResponseSheet_(spreadsheet);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (hasSession_(sheet, payload.sessionId)) return;
    const timezone = spreadsheet.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || "Asia/Taipei";
    const studyDate = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");
    sheet.appendRow([
      studyDate,
      payload.studyVersion,
      payload.sessionId,
      payload.group,
      payload.consentGiven,
      payload.completedNormally,
      payload.comprehensionAttempts,
      payload.manipulationAnswer,
      payload.manipulationCorrect,
      payload.reusable,
      payload.disposable,
      payload.skipped,
      payload.reusableRate,
      JSON.stringify(payload.responses)
    ]);
  } finally {
    lock.releaseLock();
  }
}

function ensureResponseSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(STUDY.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(STUDY.sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#315f4b").setFontColor("#ffffff");
  }
  return sheet;
}

function hasSession_(sheet, sessionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const finder = sheet.getRange(2, 3, lastRow - 1, 1).createTextFinder(sessionId).matchEntireCell(true);
  return Boolean(finder.findNext());
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid payload.");
  if (payload.studyVersion !== STUDY.version) throw new Error("Unexpected study version.");
  if (!/^p_[a-f0-9]{24}$/.test(payload.sessionId)) throw new Error("Invalid session ID.");
  if (!["GAIN", "LOSS"].includes(payload.group)) throw new Error("Invalid group.");
  if (payload.consentGiven !== true || payload.completedNormally !== true) throw new Error("Incomplete submission.");
  if (!["GAIN", "LOSS", "DONT_REMEMBER"].includes(payload.manipulationAnswer)) throw new Error("Invalid manipulation answer.");
  if (!Array.isArray(payload.responses) || payload.responses.length !== 5) throw new Error("Expected five responses.");
  const allowedChoices = ["reusable", "disposable", "skip"];
  payload.responses.forEach((response, index) => {
    if (response.trial !== index + 1) throw new Error("Invalid trial order.");
    if (!allowedChoices.includes(response.choice)) throw new Error("Invalid choice.");
    if (!Number.isFinite(response.responseTimeMs) || response.responseTimeMs < 0 || response.responseTimeMs > 600000) {
      throw new Error("Invalid response time.");
    }
  });
  const counts = payload.responses.reduce((result, response) => {
    result[response.choice]++;
    return result;
  }, { reusable: 0, disposable: 0, skip: 0 });
  if (counts.reusable !== payload.reusable || counts.disposable !== payload.disposable || counts.skip !== payload.skipped) {
    throw new Error("Summary does not match responses.");
  }
}

function cleanNonce_(value) {
  const nonce = String(value || "");
  return /^n_[a-f0-9]{24}$/.test(nonce) ? nonce : "invalid";
}

function responsePage_(nonce, success, message) {
  const data = JSON.stringify({ type: "cup-study-submission", nonce, success, message });
  const html = `<!doctype html><meta charset="utf-8"><script>parent.postMessage(${data}, "*");<\/script>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

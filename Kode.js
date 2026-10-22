/**
 * Job Application Tracker - Backend (Code.gs)
 * Pembaruan v2.4 - Penambahan Fitur Hapus (CRUD Lengkap)
 */

const SHEET_NAME = "Lamaran";
const HEADERS = [
  "Nomor", "ID Unik", "Tanggal Melamar", "Nama Perusahaan", "Posisi",
  "Tautan Lowongan", "Sumber Lowongan", "Status", "Gaji", "Catatan"
];
const VALID_STATUS = ["Applied", "Interview", "Offered", "Rejected", "Resign"];

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Job Application Tracker")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange("C:C").setNumberFormat("yyyy-mm-dd");
  }
  applySheetStyling_(sheet);
  return sheet;
}

function applySheetStyling_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = HEADERS.length;
  if (lastRow < 1) return;

  const headerRange = sheet.getRange(1, 1, 1, lastCol);
  headerRange.setBackground("#1e293b");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 35);

  const fullRange = sheet.getRange(1, 1, Math.max(lastRow, 10), lastCol);
  fullRange.setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  const widths = [70, 190, 130, 180, 160, 180, 140, 120, 130, 200];
  widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));
}

function serializeValue_(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyy-MM-dd");
  }
  return (val === null || val === undefined) ? "" : val;
}

function toDate_(isoString) {
  const [y, m, d] = isoString.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function validateInput_(p) {
  const required = ["tanggalMelamar", "namaPerusahaan", "posisi", "sumberLowongan", "status"];
  required.forEach(k => {
    if (!p[k] || !String(p[k]).trim()) {
      throw new Error("Field wajib kosong: " + k);
    }
  });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.tanggalMelamar)) {
    throw new Error("Format tanggal harus YYYY-MM-DD.");
  }
  if (VALID_STATUS.indexOf(p.status) === -1) {
    throw new Error("Status tidak valid: " + p.status);
  }
  return {
    tanggalMelamar: p.tanggalMelamar,
    namaPerusahaan: String(p.namaPerusahaan).trim(),
    posisi: String(p.posisi).trim(),
    tautanLowongan: String(p.tautanLowongan || "").trim(),
    sumberLowongan: String(p.sumberLowongan).trim(),
    status: p.status,
    gaji: (p.gaji === "" || p.gaji == null) ? "" : Number(p.gaji),
    catatan: String(p.catatan || "").trim()
  };
}

function sortSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const n = lastRow - 1;

  sheet.getRange(2, 1, n, HEADERS.length)
       .sort([{ column: 3, ascending: false }]);

  const formulas = [];
  for (let i = 0; i < n; i++) {
    formulas.push(['=IF(B' + (i + 2) + '=""; ""; ROW()-1)']);
  }
  sheet.getRange(2, 1, n, 1).setFormulas(formulas);
  applySheetStyling_(sheet);
}

function apiGetAll() {
  try {
    return { success: true, data: getAllApplications() };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function apiCreate(payload) {
  try {
    return createApplication(payload);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function apiUpdate(idUnik, payload) {
  try {
    return updateApplication(idUnik, payload);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function apiDelete(idUnik) {
  try {
    return deleteApplication(idUnik);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function apiExportReport(format) {
  try {
    return exportReport_(format);
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function getAllApplications() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const rows = values
    .map(r => ({
      nomor: r[0],
      idUnik: String(r[1]),
      tanggalMelamar: serializeValue_(r[2]),
      namaPerusahaan: String(r[3]),
      posisi: String(r[4]),
      tautanLowongan: String(r[5]),
      sumberLowongan: String(r[6]),
      status: String(r[7]),
      gaji: serializeValue_(r[8]),
      catatan: String(r[9])
    }))
    .filter(r => r.idUnik !== "");

  rows.sort((a, b) => b.tanggalMelamar.localeCompare(a.tanggalMelamar));
  return rows;
}

function createApplication(p) {
  const v = validateInput_(p);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const id = "APP-" + Date.now() + "-" + Utilities.getUuid().slice(0, 4);
    sheet.appendRow([
      "", id, toDate_(v.tanggalMelamar), v.namaPerusahaan, v.posisi,
      v.tautanLowongan, v.sumberLowongan, v.status, v.gaji, v.catatan
    ]);
    sortSheet_(sheet);
    return { success: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

function updateApplication(idUnik, p) {
  const v = validateInput_(p);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Data belum ada.");

    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    const idx = ids.indexOf(idUnik);
    if (idx === -1) throw new Error("ID tidak ditemukan: " + idUnik);

    sheet.getRange(idx + 2, 3, 1, 8).setValues([[
      toDate_(v.tanggalMelamar), v.namaPerusahaan, v.posisi, v.tautanLowongan,
      v.sumberLowongan, v.status, v.gaji, v.catatan
    ]]);
    sortSheet_(sheet);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function deleteApplication(idUnik) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Data belum ada.");

    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    const idx = ids.indexOf(idUnik);
    if (idx === -1) throw new Error("ID tidak ditemukan: " + idUnik);

    sheet.deleteRow(idx + 2);
    sortSheet_(sheet);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function onEditTrigger(e) {
  if (!e || e.range.getSheet().getName() !== SHEET_NAME) return;
  if (e.range.getRow() < 2) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    sortSheet_(getSheet_());
  } finally {
    lock.releaseLock();
  }
}

function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === "onEditTrigger") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onEditTrigger")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
}

function exportReport_(format) {
  if (format !== "pdf" && format !== "docx") throw new Error("Format tidak didukung: " + format);

  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const rows = getAllApplications();
  const stamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm");

  const tempDoc = DocumentApp.create("Laporan Job Tracker " + stamp);
  const body = tempDoc.getBody();
  body.appendParagraph("Laporan Lamaran Kerja").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("Dibuat: " + stamp);
  body.appendParagraph("Total lamaran: " + rows.length);

  const count = s => rows.filter(r => r.status === s).length;
  body.appendParagraph("Applied: " + count("Applied")
    + " | Interview: " + count("Interview")
    + " | Offered: " + count("Offered")
    + " | Rejected: " + count("Rejected")
    + " | Resign: " + count("Resign"));

  const table = [["Tanggal", "Perusahaan", "Posisi", "Sumber", "Status", "Gaji", "Catatan"]];
  rows.forEach(r => table.push([
    r.tanggalMelamar, r.namaPerusahaan, r.posisi, r.sumberLowongan,
    r.status, String(r.gaji), r.catatan
  ]));
  body.appendTable(table);
  tempDoc.saveAndClose();

  const tempFile = DriveApp.getFileById(tempDoc.getId());
  const blob = format === "pdf"
    ? tempFile.getAs(MimeType.PDF)
    : tempFile.getAs(MimeType.MICROSOFT_WORD);
  const ext = format === "pdf" ? ".pdf" : ".docx";
  blob.setName("Laporan-Job-Tracker-" + stamp.replace(/[: ]/g, "-") + ext);

  const outFile = DriveApp.createFile(blob);
  tempFile.setTrashed(true);

  return { success: true, url: outFile.getUrl(), name: outFile.getName() };
}
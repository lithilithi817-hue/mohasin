// ============================================================
// মহাসিন ফার্ম - Google Apps Script (সম্পূর্ণ নতুন)
// ============================================================
// ব্যবহারের নিয়ম:
// ১. Google Sheet খুলুন
// ২. Extensions → Apps Script
// ৩. পুরনো সব কোড মুছে এই কোড paste করুন
// ৪. Deploy → New Deployment → Web App
//    Execute as: Me | Who has access: Anyone
// ৫. নতুন URL কপি করে ওয়েবসাইটের সেটআপে দিন
// ============================================================

// ─── Sheet নাম ───────────────────────────────────────────────
const SHEET_NAMES = {
  cow:         'গরুর হিসাব',
  goat:        'ছাগলের হিসাব',
  chicken:     'মুরগির হিসাব',
  fish:        'মাছের হিসাব',
  agriculture: 'কৃষি হিসাব',
  other:       'অন্যান্য হিসাব'
};

// ─── হেডার (শেষে _ID কলাম — row খোঁজার জন্য) ───────────────
const HEADERS = {
  cow:         ['তারিখ', 'গরুর সংখ্যা', 'দুধ উৎপাদন (লিটার)', 'দুধ বিক্রয় (৳)', 'খাবার খরচ (৳)', 'চিকিৎসা খরচ (৳)', 'গরু কেনা (সংখ্যা)', 'গরু কেনার মূল্য (৳)', 'গরু বিক্রি (সংখ্যা)', 'গরু বিক্রির মূল্য (৳)', 'মন্তব্য', '_ID'],
  goat:        ['তারিখ', 'ছাগলের সংখ্যা', 'খাবার খরচ (৳)', 'চিকিৎসা খরচ (৳)', 'ছাগল কেনা (সংখ্যা)', 'ছাগল কেনার মূল্য (৳)', 'ছাগল বিক্রি (সংখ্যা)', 'ছাগল বিক্রির মূল্য (৳)', 'মন্তব্য', '_ID'],
  chicken:     ['তারিখ', 'মুরগির সংখ্যা', 'ডিম উৎপাদন (হালি)', 'ডিম বিক্রয় (৳)', 'খাবার খরচ (৳)', 'ওষুধ খরচ (৳)', 'মুরগি বিক্রি (সংখ্যা)', 'মুরগি বিক্রির মূল্য (৳)', 'মন্তব্য', '_ID'],
  fish:        ['তারিখ', 'পুকুর/ঘেরের নাম', 'মাছের প্রজাতি', 'মাছের পরিমাণ (কেজি)', 'খাবার/ওষুধ খরচ (৳)', 'বিক্রয় পরিমাণ (কেজি)', 'বিক্রয় মূল্য (৳)', 'মন্তব্য', '_ID'],
  agriculture: ['তারিখ', 'ফসলের নাম', 'জমির পরিমাণ (বিঘা)', 'বীজ খরচ (৳)', 'সার খরচ (৳)', 'সেচ খরচ (৳)', 'শ্রমিক খরচ (৳)', 'উৎপাদন (মণ)', 'বিক্রয় মূল্য (৳)', 'মন্তব্য', '_ID'],
  other:       ['তারিখ', 'ধরন', 'বিবরণ', 'পরিমাণ (৳)', 'মন্তব্য', '_ID']
};

// ─── মূল POST Handler ────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action || 'add'; // 'add' | 'delete' | 'edit'
    const type    = payload.type;

    if (!SHEET_NAMES[type]) {
      return respond({ success: false, message: 'অজানা বিভাগ: ' + type });
    }

    const ss        = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_NAMES[type];

    // ── ADD ────────────────────────────────────────────────
    if (action === 'add') {
      const sheet   = getOrCreateSheet(ss, type, sheetName);
      const rowData = payload.data;      // array of cell values
      const rowId   = payload.id || '';  // unique _id from website

      sheet.appendRow([...rowData, rowId]);

      // alternating row color
      const lastRow = sheet.getLastRow();
      if (lastRow % 2 === 0) {
        sheet.getRange(lastRow, 1, 1, rowData.length + 1).setBackground('#f0f7f0');
      }

      return respond({ success: true, message: 'ডেটা সফলভাবে সংরক্ষিত হয়েছে!' });
    }

    // ── DELETE ─────────────────────────────────────────────
    if (action === 'delete') {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return respond({ success: false, message: 'Sheet পাওয়া যায়নি।' });
      }

      const rowIndex = findRowById(sheet, payload.id);
      if (rowIndex === -1) {
        return respond({ success: false, message: 'Google Sheet-এ এন্ট্রিটি পাওয়া যায়নি।' });
      }

      sheet.deleteRow(rowIndex);
      return respond({ success: true, message: 'Google Sheet থেকে এন্ট্রি মুছে ফেলা হয়েছে!' });
    }

    // ── EDIT ───────────────────────────────────────────────
    if (action === 'edit') {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        return respond({ success: false, message: 'Sheet পাওয়া যায়নি।' });
      }

      const rowIndex = findRowById(sheet, payload.id);
      if (rowIndex === -1) {
        return respond({ success: false, message: 'Google Sheet-এ এন্ট্রিটি পাওয়া যায়নি।' });
      }

      const rowData = payload.data;
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      return respond({ success: true, message: 'Google Sheet এ এন্ট্রি আপডেট হয়েছে!' });
    }

    return respond({ success: false, message: 'অজানা action: ' + action });

  } catch (err) {
    return respond({ success: false, message: 'সার্ভার ত্রুটি: ' + err.message });
  }
}

// ─── Sheet খোঁজো বা নতুন তৈরি করো ───────────────────────────
function getOrCreateSheet(ss, type, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers     = HEADERS[type];
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setBackground('#1a4a2e');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setFontSize(11);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

// ─── ID দিয়ে row নম্বর খোঁজো (শেষ কলামে _ID থাকে) ─────────
function findRowById(sheet, id) {
  if (!id) return -1;

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const lastCol = sheet.getLastColumn();
  // শুধু শেষ কলাম (ID কলাম) পড়ো — দ্রুত
  const idColumn = sheet.getRange(2, lastCol, lastRow - 1, 1).getValues();

  for (let i = 0; i < idColumn.length; i++) {
    if (String(idColumn[i][0]).trim() === String(id).trim()) {
      return i + 2; // +2: header row (1) + 0-index offset
    }
  }
  return -1;
}

// ─── GET Handler (status check) ──────────────────────────────
function doGet(e) {
  return respond({ status: 'মহাসিন ফার্ম Apps Script সচল আছে! ✅' });
}

// ─── JSON Response Builder ────────────────────────────────────
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

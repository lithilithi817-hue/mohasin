// ============================================================
// মহাসিন ফার্ম - Google Apps Script
// ============================================================
// ধাপ ১: আপনার Google Sheet খুলুন
//         https://docs.google.com/spreadsheets/d/18mHjHmAzy7ifoNdFNDycjb3f6ms6ZHyb8Las6N4EBG0/edit
// ধাপ ২: Extensions → Apps Script ক্লিক করুন
// ধাপ ৩: বিদ্যমান সব কোড মুছে এই কোড paste করুন
// ধাপ ৪: Deploy → New Deployment → Web App
//         Execute as: Me
//         Who has access: Anyone
//         → Deploy বাটন চাপুন
// ধাপ ৫: প্রাপ্ত Web App URL কপি করুন
// ধাপ ৬: ওয়েবসাইটে গিয়ে "সেটআপ করুন" বাটনে URL paste করুন
// ============================================================

const SHEET_NAMES = {
  cow: 'গরুর হিসাব',
  goat: 'ছাগলের হিসাব',
  chicken: 'মুরগির হিসাব',
  fish: 'মাছের হিসাব',
  agriculture: 'কৃষি হিসাব',
  other: 'অন্যান্য হিসাব'
};

const HEADERS = {
  cow: ['তারিখ', 'গরুর সংখ্যা', 'দুধ উৎপাদন (লিটার)', 'দুধ বিক্রয় মূল্য (৳)', 'খাবার খরচ (৳)', 'চিকিৎসা খরচ (৳)', 'গরু কেনা (সংখ্যা)', 'গরু কেনার মূল্য (৳)', 'গরু বিক্রি (সংখ্যা)', 'গরু বিক্রির মূল্য (৳)', 'মন্তব্য'],
  goat: ['তারিখ', 'ছাগলের সংখ্যা', 'খাবার খরচ (৳)', 'চিকিৎসা খরচ (৳)', 'ছাগল কেনা (সংখ্যা)', 'ছাগল কেনার মূল্য (৳)', 'ছাগল বিক্রি (সংখ্যা)', 'ছাগল বিক্রির মূল্য (৳)', 'মন্তব্য'],
  chicken: ['তারিখ', 'মুরগির সংখ্যা', 'ডিম উৎপাদন (হালি)', 'ডিম বিক্রয় মূল্য (৳)', 'খাবার খরচ (৳)', 'ওষুধ খরচ (৳)', 'মুরগি বিক্রি (সংখ্যা)', 'মুরগি বিক্রির মূল্য (৳)', 'মন্তব্য'],
  fish: ['তারিখ', 'পুকুর/ঘেরের নাম', 'মাছের প্রজাতি', 'মাছের পরিমাণ (কেজি)', 'খাবার/ওষুধ খরচ (৳)', 'বিক্রয় পরিমাণ (কেজি)', 'বিক্রয় মূল্য (৳)', 'মন্তব্য'],
  agriculture: ['তারিখ', 'ফসলের নাম', 'জমির পরিমাণ (বিঘা)', 'বীজ খরচ (৳)', 'সার খরচ (৳)', 'সেচ খরচ (৳)', 'শ্রমিক খরচ (৳)', 'উৎপাদন (মণ)', 'বিক্রয় মূল্য (৳)', 'মন্তব্য'],
  other: ['তারিখ', 'ধরন', 'বিবরণ', 'পরিমাণ (৳)', 'মন্তব্য']
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const type = data.type;
    const rowData = data.data;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_NAMES[type];
    
    if (!sheetName) {
      return buildResponse({ success: false, message: 'অজানা বিভাগ: ' + type });
    }
    
    // শিট খোঁজো অথবা নতুন তৈরি করো
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // হেডার সারি যোগ করো
      const headers = HEADERS[type];
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setBackground('#1a4a2e');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      headerRange.setFontSize(11);
      sheet.setFrozenRows(1);
      // কলাম প্রস্থ স্বয়ংক্রিয়ভাবে ঠিক করো
      sheet.autoResizeColumns(1, headers.length);
    }
    
    // ডেটা যোগ করো
    sheet.appendRow(rowData);
    
    // Alternating row colors
    const lastRow = sheet.getLastRow();
    if (lastRow % 2 === 0) {
      sheet.getRange(lastRow, 1, 1, rowData.length).setBackground('#f0f7f0');
    }
    
    return buildResponse({ 
      success: true, 
      message: 'ডেটা সফলভাবে সংরক্ষিত হয়েছে!',
      row: lastRow,
      sheet: sheetName
    });
    
  } catch (err) {
    return buildResponse({ success: false, message: 'ত্রুটি: ' + err.message });
  }
}

function doGet(e) {
  return buildResponse({ status: 'মহাসিন ফার্ম Apps Script সচল আছে! ✅' });
}

function buildResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

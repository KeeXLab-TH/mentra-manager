// ==============================================================================
// Mentra Manager — Google Apps Script (GAS)
// ==============================================================================
// วิธี Deploy:
//   1. วาง code นี้ใน script.google.com แทน code เดิม
//   2. กด ▶ Run → เลือก "testAuth" → กด Allow
//   3. Deploy → New deployment → Web app → Execute as Me → Anyone
// ==============================================================================
// *** ไม่ใช้ UrlFetchApp เลย — ไม่ต้องขอ scope external_request ***
// ==============================================================================

// ==============================================================================
// testAuth — Run ก่อน Deploy เพื่อให้ Google ขอสิทธิ์ DriveApp
// ==============================================================================
function testAuth() {
  const root = DriveApp.getRootFolder();
  Logger.log('✅ DriveApp OK: ' + root.getName());
  const token = ScriptApp.getOAuthToken();
  Logger.log('✅ Token OK (first 20): ' + token.substring(0, 20) + '...');
  Logger.log('=== Auth test complete — พร้อม Deploy ===');
}

// ==============================================================================
// doGet — GET request (list files in folder)
// ==============================================================================
function doGet(e) {
  try {
    var folderId = e.parameter.folderId;
    if (!folderId) return jsonResponse({ error: 'folderId required' });
    return jsonResponse(listFilesInFolder(folderId));
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ==============================================================================
// doPost — POST request (actions)
// ==============================================================================
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;

    if (action === 'getUploadUrl')   return handleGetUploadToken(body);
    if (action === 'createFolder')   return handleCreateFolder(body);
    if (action === 'uploadChunk')    return handleUploadChunk(body);
    if (action === 'deleteFile')     return handleDeleteFile(body);
    if (action === 'createGoogleDoc') return handleCreateGoogleDoc(body);

    // Legacy: base64 upload
    if (body.base64 && body.filename) return handleLegacyUpload(body);

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleGetUploadToken
// *** ไม่ใช้ UrlFetchApp — ส่งแค่ OAuth token ให้ browser ไปสร้าง
// resumable upload session เอง ***
// ==============================================================================
function handleGetUploadToken(body) {
  var filename = body.filename;
  var folderId = body.folderId;

  if (!filename || !folderId) {
    return jsonResponse({ status: 'error', message: 'filename and folderId required' });
  }

  try {
    // ตรวจสอบ folder — ใช้ DriveApp (ไม่ต้อง UrlFetchApp)
    DriveApp.getFolderById(folderId);

    // ส่ง OAuth token กลับ — browser จะใช้ token นี้
    // เรียก Drive API โดยตรงจาก browser เอง
    var token = ScriptApp.getOAuthToken();

    return jsonResponse({
      status: 'success',
      token: token,
      folderId: folderId
    });
  } catch (err) {
    Logger.log('handleGetUploadToken error: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleCreateFolder
// ==============================================================================
function handleCreateFolder(body) {
  var folderName = body.folderName;
  var parentFolderId = body.parentFolderId;

  if (!folderName) return jsonResponse({ status: 'error', message: 'folderName required' });

  try {
    var parent;
    try {
      parent = parentFolderId ? DriveApp.getFolderById(parentFolderId) : DriveApp.getRootFolder();
    } catch (e) {
      parent = DriveApp.getRootFolder();
    }

    var existing = parent.getFoldersByName(folderName);
    if (existing.hasNext()) {
      var f = existing.next();
      return jsonResponse({ status: 'exists', folderId: f.getId(), folderUrl: f.getUrl() });
    }

    var newF = parent.createFolder(folderName);
    return jsonResponse({ status: 'created', folderId: newF.getId(), folderUrl: newF.getUrl() });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleUploadChunk — Fallback chunked base64 upload
// ==============================================================================
function handleUploadChunk(body) {
  var folderId = body.folderId;
  var filename = body.filename;
  var mimeType = body.mimeType;
  var chunk = body.chunk;
  var fileId = body.fileId;
  var isFirst = body.isFirst;
  var isLast = body.isLast;

  if (!folderId || !filename || !chunk) {
    return jsonResponse({ status: 'error', message: 'folderId, filename, chunk required' });
  }

  try {
    var props = PropertiesService.getScriptProperties();
    var propKey = 'chunk_' + Utilities.base64Encode(filename).slice(0, 40);
    var chunkBytes = Utilities.base64Decode(chunk);
    var resultFileId = fileId;

    if (isFirst) {
      var folder = DriveApp.getFolderById(folderId);
      var blob = Utilities.newBlob(chunkBytes, mimeType || 'application/octet-stream', filename);
      var file = folder.createFile(blob);
      resultFileId = file.getId();
      props.setProperty(propKey, resultFileId);
    } else {
      var storedId = fileId || props.getProperty(propKey);
      if (!storedId) return jsonResponse({ status: 'error', message: 'fileId not found' });
      resultFileId = storedId;

      var existingFile = DriveApp.getFileById(storedId);
      var existingBlob = existingFile.getBlob();
      var existingBytes = existingBlob.getBytes();
      var combinedBytes = existingBytes.concat(Array.from(chunkBytes));
      var newBlob = Utilities.newBlob(combinedBytes, mimeType || 'application/octet-stream', filename);
      existingFile.setContent(newBlob.getDataAsString());
    }

    if (isLast) props.deleteProperty(propKey);

    return jsonResponse({
      status: 'success',
      fileId: resultFileId,
      fileUrl: 'https://drive.google.com/file/d/' + resultFileId + '/view'
    });
  } catch (err) {
    Logger.log('handleUploadChunk error: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleDeleteFile
// ==============================================================================
function handleDeleteFile(body) {
  if (!body.fileId) return jsonResponse({ status: 'error', message: 'fileId required' });
  try {
    DriveApp.getFileById(body.fileId).setTrashed(true);
    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleLegacyUpload — base64 ทั้งก้อน (ไฟล์เล็ก)
// ==============================================================================
function handleLegacyUpload(body) {
  try {
    var folder = body.folderId ? DriveApp.getFolderById(body.folderId) : DriveApp.getRootFolder();
    var bytes = Utilities.base64Decode(body.base64);
    var blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.filename);
    var file = folder.createFile(blob);
    return jsonResponse({ status: 'success', fileId: file.getId(), fileUrl: file.getUrl() });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// listFilesInFolder
// ==============================================================================
function listFilesInFolder(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var files = folder.getFiles();
  var result = [];
  while (files.hasNext()) {
    var f = files.next();
    result.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      size: f.getSize(),
      webViewLink: f.getUrl(),
      createdTime: f.getDateCreated().toISOString(),
      modifiedTime: f.getLastUpdated().toISOString()
    });
  }
  return result;
}

// ==============================================================================
// handleCreateGoogleDoc — สร้างหรือคัดลอก Google Doc จากเทมเพลตและแทนที่ข้อความ
// ==============================================================================
function handleCreateGoogleDoc(body) {
  try {
    var templateId = body.templateId;
    var folderId = body.folderId || '1a0B6l56PAVCZ4v8lzSeIRslq78XSJh8e';
    var title = body.title || ('หนังสือบริษัท - ' + (body.docNo || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss')));
    var replacements = body.replacements || {};
    var letter = body.letterData || {};

    var targetFolder;
    try {
      targetFolder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
    } catch (fErr) {
      targetFolder = DriveApp.getRootFolder();
    }

    var newDocId;
    var newDoc;

    if (templateId) {
      // 1. คัดลอกและแทนที่ตัวแปรใน Google Docs Template
      var templateFile = DriveApp.getFileById(templateId);
      var copiedFile = templateFile.makeCopy(title, targetFolder);
      newDocId = copiedFile.getId();
      newDoc = DocumentApp.openById(newDocId);
      var docBody = newDoc.getBody();

      for (var key in replacements) {
        if (replacements.hasOwnProperty(key)) {
          var val = replacements[key] === null || replacements[key] === undefined ? '' : String(replacements[key]);
          docBody.replaceText(key, val);
        }
      }
      newDoc.saveAndClose();
    } else {
      // 2. สร้างเอกสารใหม่ตามรูปแบบมาตรฐานหนังสือบริษัท
      newDoc = DocumentApp.create(title);
      newDocId = newDoc.getId();
      var docFile = DriveApp.getFileById(newDocId);
      docFile.moveTo(targetFolder);

      var docBody = newDoc.getBody();
      docBody.setMarginTop(54);
      docBody.setMarginBottom(54);
      docBody.setMarginLeft(72);
      docBody.setMarginRight(72);

      buildCompanyLetterDoc(docBody, letter);
      newDoc.saveAndClose();
    }

    var docUrl = 'https://docs.google.com/document/d/' + newDocId + '/edit';
    var pdfUrl = 'https://docs.google.com/document/d/' + newDocId + '/export?format=pdf';

    return jsonResponse({
      status: 'success',
      docId: newDocId,
      docUrl: docUrl,
      pdfUrl: pdfUrl,
      title: title
    });
  } catch (err) {
    Logger.log('handleCreateGoogleDoc error: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// Helper: สร้างเนื้อหาเอกสารมาตรฐาน
function buildCompanyLetterDoc(body, letter) {
  var companyName = letter.companyName || 'บริษัท เมนทร้า โซลูชั่น จำกัด';
  var companyAddress = letter.companyAddress || '';
  var companyContact = letter.companyContact || '';
  var docNo = letter.docNo || '-';
  var docDate = letter.docDate || '';
  var subject = letter.subject || '-';
  var recipient = letter.recipient || '-';
  var reference = letter.reference || '';
  var attachments = letter.attachments || [];
  var content = letter.content || '';
  var paragraphs = letter.paragraphs || [];
  var signatoryName = letter.signatoryName || '';
  var signatoryPosition = letter.signatoryPosition || '';
  var companyTaxId = letter.companyTaxId || '';

  // หัวจดหมายบริษัท
  var headerTable = body.appendTable([
    [companyName + (companyAddress ? '\n' + companyAddress : '') + (companyTaxId ? '\nเลขประจำตัวผู้เสียภาษี: ' + companyTaxId : '') + (companyContact ? '\nโทร: ' + companyContact : ''), '']
  ]);
  headerTable.setBorderWidth(0);

  body.appendHorizontalRule();

  // เลขที่และวันที่
  var metaTable = body.appendTable([
    ['ที่: ' + docNo, 'วันที่: ' + docDate]
  ]);
  metaTable.setBorderWidth(0);

  // เรื่องและเรียน
  var pSub = body.appendParagraph('เรื่อง: ' + subject);
  pSub.setBold(true);
  pSub.setSpacingAfter(4);

  var pRec = body.appendParagraph('เรียน: ' + recipient);
  pRec.setSpacingAfter(4);

  if (reference) {
    var pRef = body.appendParagraph('อ้างถึง: ' + reference);
    pRef.setSpacingAfter(4);
  }

  if (attachments && attachments.length > 0) {
    var attachText = 'สิ่งที่ส่งมาด้วย: ';
    if (attachments.length === 1) {
      body.appendParagraph(attachText + attachments[0]);
    } else {
      body.appendParagraph(attachText);
      for (var a = 0; a < attachments.length; a++) {
        body.appendParagraph('   ' + (a + 1) + '. ' + attachments[a]);
      }
    }
  }

  body.appendParagraph('').setSpacingAfter(6);

  // ย่อหน้าเนื้อหา
  if (paragraphs && paragraphs.length > 0) {
    for (var i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].trim()) {
        var p = body.appendParagraph('       ' + paragraphs[i].trim());
        p.setLineSpacing(1.15);
        p.setSpacingAfter(6);
      }
    }
  } else if (content) {
    var rawParas = content.split('\n');
    for (var j = 0; j < rawParas.length; j++) {
      if (rawParas[j].trim()) {
        var pRaw = body.appendParagraph('       ' + rawParas[j].trim());
        pRaw.setLineSpacing(1.15);
        pRaw.setSpacingAfter(6);
      }
    }
  }

  // ตารางรายการส่งมอบ (ถ้ามี)
  if (letter.items && letter.items.length > 0) {
    var itemTableData = [['ลำดับ', 'รายการ', 'จำนวน', 'หน่วย', 'หมายเหตุ']];
    for (var k = 0; k < letter.items.length; k++) {
      var itm = letter.items[k];
      itemTableData.push([
        String(k + 1),
        itm.name || '',
        String(itm.qty || ''),
        itm.unit || '',
        itm.remark || ''
      ]);
    }
    var tbl = body.appendTable(itemTableData);
    tbl.setBorderWidth(0.5);
    tbl.getRow(0).editAsText().setBold(true);
  }

  // คำลงท้าย
  var pClose = body.appendParagraph('       จึงเรียนมาเพื่อโปรดทราบและพิจารณา');
  pClose.setSpacingBefore(12);
  pClose.setSpacingAfter(24);

  // ลายมือชื่อ
  var sigTable = body.appendTable([
    ['', 'ขอแสดงความนับถือ\n\n\n\n(' + (signatoryName || '....................................................') + ')\n' + (signatoryPosition || 'กรรมการผู้จัดการ') + '\n' + companyName]
  ]);
  sigTable.setBorderWidth(0);
}

// ==============================================================================
// jsonResponse helper
// ==============================================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

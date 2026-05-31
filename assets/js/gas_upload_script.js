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

    if (action === 'getUploadUrl') return handleGetUploadToken(body);
    if (action === 'createFolder') return handleCreateFolder(body);
    if (action === 'uploadChunk') return handleUploadChunk(body);
    if (action === 'deleteFile') return handleDeleteFile(body);

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
// jsonResponse helper
// ==============================================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

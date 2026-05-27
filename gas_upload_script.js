// ==============================================================================
// Mentra Manager — Google Apps Script (GAS)
// วาง code นี้ทั้งหมดใน script.google.com แทนที่ code เดิม
// Deploy ใหม่ด้วย: Deploy → New deployment → Web app
//   Execute as: Me
//   Who has access: Anyone
// ==============================================================================

// ===== CONFIG =====
// ไม่ต้องแก้ไข — FOLDER_ID จะรับจาก frontend ทุกครั้ง

// ==============================================================================
// Entry Point — รับ GET request (สำหรับ list files)
// ==============================================================================
function doGet(e) {
  try {
    const folderId = e.parameter.folderId;
    if (!folderId) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'folderId required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    const files = listFilesInFolder(folderId);
    return ContentService.createTextOutput(JSON.stringify(files))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==============================================================================
// Entry Point — รับ POST request (สำหรับ action ต่างๆ)
// ==============================================================================
function doPost(e) {
  try {
    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return jsonResponse({ status: 'error', message: 'Invalid JSON: ' + parseErr.message });
    }

    const action = body.action;

    // ── getUploadUrl: สร้าง Resumable Upload session URL สำหรับอัพโหลดตรงถึง Drive ──
    if (action === 'getUploadUrl') {
      return handleGetUploadUrl(body);
    }

    // ── createFolder: สร้างโฟลเดอร์ใน Drive ──
    if (action === 'createFolder') {
      return handleCreateFolder(body);
    }

    // ── uploadChunk: รับ base64 chunk แล้วประกอบไฟล์ (fallback เท่านั้น) ──
    if (action === 'uploadChunk') {
      return handleUploadChunk(body);
    }

    // ── deleteFile: ลบไฟล์จาก Drive ──
    if (action === 'deleteFile') {
      return handleDeleteFile(body);
    }

    // ── Legacy: รับ base64 ไฟล์ทั้งหมดในครั้งเดียว (เก่า ใช้ได้แค่ไฟล์เล็ก) ──
    if (body.base64 && body.filename) {
      return handleLegacyUpload(body);
    }

    return jsonResponse({ status: 'error', message: 'Unknown action: ' + action });

  } catch (err) {
    Logger.log('doPost error: ' + err.message + '\n' + err.stack);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleGetUploadUrl — สร้าง Resumable Upload URL
// Frontend จะ PUT ไฟล์ตรงไปที่ URL นี้ โดยไม่ต้องผ่าน GAS อีก
// นี่คือวิธีที่เร็วที่สุด เหมาะกับไฟล์ขนาดใหญ่ทุกขนาด
// ==============================================================================
function handleGetUploadUrl(body) {
  const { filename, mimeType, folderId } = body;

  if (!filename || !folderId) {
    return jsonResponse({ status: 'error', message: 'filename and folderId are required' });
  }

  try {
    // ตรวจสอบว่า folder มีอยู่จริง (ใช้ DriveApp ซึ่งมีสิทธิ์เสมอ)
    DriveApp.getFolderById(folderId);

    // ดึง OAuth token ของ script (ต้องมี scope: drive + script.external_request)
    const token = ScriptApp.getOAuthToken();
    const uploadMimeType = mimeType || 'application/octet-stream';

    // metadata ของไฟล์ที่จะสร้างใน Drive
    const metadata = {
      name: filename,
      parents: [folderId],
      mimeType: uploadMimeType
    };

    // เรียก Drive API v3 เพื่อขอ Resumable Upload session URI
    // ต้องการ scope: https://www.googleapis.com/auth/script.external_request
    // → เพิ่มใน appsscript.json แล้ว Re-authorize script
    const response = UrlFetchApp.fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink,mimeType',
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': uploadMimeType,
          'X-Upload-Content-Length': ''
        },
        payload: JSON.stringify(metadata),
        muteHttpExceptions: true
      }
    );

    const responseCode = response.getResponseCode();
    const headers = response.getHeaders();

    // Drive API จะ return 200 พร้อม Location header ที่เป็น upload URL
    if ((responseCode === 200 || responseCode === 201) && headers['Location']) {
      return jsonResponse({
        status: 'success',
        uploadUrl: headers['Location']
      });
    }

    // ถ้า fail ให้ log และ return error ที่ชัดเจน
    const respText = response.getContentText();
    Logger.log('Drive API error: ' + responseCode + ' — ' + respText);
    return jsonResponse({
      status: 'error',
      message: 'Drive API returned ' + responseCode + ': ' + respText.slice(0, 200)
    });

  } catch (err) {
    Logger.log('handleGetUploadUrl error: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleCreateFolder — สร้างโฟลเดอร์ (หรือใช้ที่มีอยู่แล้ว)
// ==============================================================================
function handleCreateFolder(body) {
  const { folderName, parentFolderId } = body;

  if (!folderName) {
    return jsonResponse({ status: 'error', message: 'folderName is required' });
  }

  try {
    let parentFolder;
    if (parentFolderId) {
      try {
        parentFolder = DriveApp.getFolderById(parentFolderId);
      } catch (e) {
        parentFolder = DriveApp.getRootFolder();
      }
    } else {
      parentFolder = DriveApp.getRootFolder();
    }

    // ค้นหาว่ามีโฟลเดอร์ชื่อนี้อยู่แล้วหรือเปล่า
    const existingFolders = parentFolder.getFoldersByName(folderName);
    if (existingFolders.hasNext()) {
      const existingFolder = existingFolders.next();
      return jsonResponse({
        status: 'exists',
        folderId: existingFolder.getId(),
        folderUrl: existingFolder.getUrl()
      });
    }

    // ถ้าไม่มี → สร้างใหม่
    const newFolder = parentFolder.createFolder(folderName);
    return jsonResponse({
      status: 'created',
      folderId: newFolder.getId(),
      folderUrl: newFolder.getUrl()
    });

  } catch (err) {
    Logger.log('handleCreateFolder error: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleUploadChunk — รับ Base64 chunk แล้วต่อไฟล์ (Fallback สำหรับกรณีพิเศษ)
// ใช้ PropertiesService เก็บ temporary data ระหว่าง chunk
// ==============================================================================
function handleUploadChunk(body) {
  const { folderId, filename, mimeType, chunk, fileId, isFirst, isLast } = body;

  if (!folderId || !filename || !chunk) {
    return jsonResponse({ status: 'error', message: 'folderId, filename, chunk required' });
  }

  try {
    const props = PropertiesService.getScriptProperties();
    const propKey = 'chunk_' + filename.replace(/[^a-zA-Z0-9]/g, '_');

    // Decode Base64 chunk
    const chunkBytes = Utilities.base64Decode(chunk);

    let resultFileId = fileId;

    if (isFirst) {
      // chunk แรก: สร้างไฟล์ใหม่ใน Drive ด้วย chunk แรก
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(chunkBytes, mimeType || 'application/octet-stream', filename);
      const file = folder.createFile(blob);
      resultFileId = file.getId();
      props.setProperty(propKey, resultFileId);
    } else {
      // chunk ถัดไป: append เข้าไฟล์เดิม
      const storedFileId = fileId || props.getProperty(propKey);
      if (!storedFileId) {
        return jsonResponse({ status: 'error', message: 'fileId not found for chunk append' });
      }
      resultFileId = storedFileId;

      // ดึงเนื้อหาเดิม + ต่อ chunk ใหม่
      const existingFile = DriveApp.getFileById(storedFileId);
      const existingBytes = existingFile.getBlob().getBytes();
      const combined = existingBytes.concat(chunkBytes);
      existingFile.setContent(Utilities.newBlob(combined, mimeType || 'application/octet-stream', filename).getDataAsString());
    }

    if (isLast) {
      props.deleteProperty(propKey);
    }

    return jsonResponse({
      status: 'success',
      fileId: resultFileId,
      fileUrl: `https://drive.google.com/file/d/${resultFileId}/view`
    });

  } catch (err) {
    Logger.log('handleUploadChunk error: ' + err.message);
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleDeleteFile — ลบไฟล์จาก Drive
// ==============================================================================
function handleDeleteFile(body) {
  const { fileId } = body;
  if (!fileId) return jsonResponse({ status: 'error', message: 'fileId required' });

  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// handleLegacyUpload — รับ base64 ทั้งหมดในครั้งเดียว (เก่า ใช้ได้แค่ไฟล์เล็ก ~5MB)
// ==============================================================================
function handleLegacyUpload(body) {
  const { filename, mimeType, base64, folderId } = body;

  try {
    const folder = DriveApp.getFolderById(folderId || DriveApp.getRootFolder().getId());
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', filename);
    const file = folder.createFile(blob);

    return jsonResponse({
      status: 'success',
      fileId: file.getId(),
      fileUrl: file.getUrl()
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

// ==============================================================================
// listFilesInFolder — list ไฟล์ใน folder สำหรับ GET request
// ==============================================================================
function listFilesInFolder(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const result = [];

  while (files.hasNext()) {
    const file = files.next();
    result.push({
      id: file.getId(),
      name: file.getName(),
      mimeType: file.getMimeType(),
      size: file.getSize(),
      webViewLink: file.getUrl(),
      createdTime: file.getDateCreated().toISOString(),
      modifiedTime: file.getLastUpdated().toISOString()
    });
  }

  return result;
}

// ==============================================================================
// Helper: สร้าง JSON response พร้อม CORS headers
// ==============================================================================
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

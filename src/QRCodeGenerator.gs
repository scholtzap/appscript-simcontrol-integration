// Version: 1.0.0
// QRCodeGenerator - WhatsApp QR code generation

/**
 * QRCodeGenerator module provides functions for generating WhatsApp QR codes
 * from messages in a Google Sheet
 */

/**
 * Sanitize filename by removing invalid characters
 * @param {string} name - Raw filename
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(name) {
  if (!name) return 'qr-code';

  // Remove invalid filename characters and limit length
  return name.toString()
    .replace(/[\\\/:*?"<>|]/g, '')
    .substring(0, 50);
}


/**
 * Generate WhatsApp QR codes from messages in active sheet
 * Reads messages from configured column and row, generates QR codes,
 * saves to Drive, and inserts images into sheet
 */
function generateWhatsAppQRCodes() {
  // Get configuration
  var config = Config.get();
  var qrcodeConfig = config.integrations.qrcode;

  if (!qrcodeConfig || !qrcodeConfig.enabled) {
    Logger.log('QR Code generation is not enabled');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'QR Code generation is not enabled in configuration',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var whatsappNumber = qrcodeConfig.whatsappNumber || '27600139923';
  var folderName = qrcodeConfig.driveFolderName || 'QR Codes';
  var startRow = qrcodeConfig.startRow || 9;
  var messageCol = qrcodeConfig.messageColumn || 1; // Column A
  var qrCol = qrcodeConfig.qrColumn || 13; // Column M

  Logger.log('=== Generating WhatsApp QR Codes ===');
  Logger.log('WhatsApp Number: ' + whatsappNumber);
  Logger.log('Drive Folder: ' + folderName);
  Logger.log('Start Row: ' + startRow);

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < startRow) {
    Logger.log('No data found in sheet');
    SpreadsheetApp.getActiveSpreadsheet().toast('No messages to process', 'ℹ️ Info', 5);
    return;
  }

  // Get messages
  var messages = sheet.getRange(startRow, messageCol, lastRow - startRow + 1, 1).getValues();

  // Get or create Drive folder
  var qrFolder = SheetHelpers.getOrCreateFolder(folderName, DriveApp.getRootFolder());

  var successCount = 0;
  var skipCount = 0;
  var errorCount = 0;

  for (var i = 0; i < messages.length; i++) {
    var row = startRow + i;
    var message = messages[i][0];

    if (!message) {
      Logger.log('Skipped row ' + row + ' - empty message');
      skipCount++;
      continue;
    }

    try {
      // Create WhatsApp URL
      var encodedMessage = encodeURIComponent(message);
      var whatsappURL = 'https://wa.me/' + whatsappNumber + '?text=' + encodedMessage;

      // Generate QR code using api.qrserver.com
      var qrAPI = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' +
                  encodeURIComponent(whatsappURL);

      Logger.log('Generating QR for row ' + row);

      var response = UrlFetchApp.fetch(qrAPI);
      var blob = response.getBlob().setName(sanitizeFilename(message) + '.png');

      // Save image to Drive
      var file = qrFolder.createFile(blob);

      // Set file to shareable
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      // Get direct URL
      var fileId = file.getId();
      var directUrl = 'https://drive.google.com/uc?export=view&id=' + fileId;

      // Insert image formula in sheet
      var formula = '=IMAGE("' + directUrl + '")';
      sheet.getRange(row, qrCol).setFormula(formula);

      Logger.log('✅ QR for row ' + row + ' saved as "' + file.getName() + '"');
      successCount++;

    } catch (error) {
      Logger.logError('Error generating QR for row ' + row, error);
      errorCount++;
    }
  }

  Logger.log('✅ QR code generation complete');
  Logger.log('Success: ' + successCount + ', Skipped: ' + skipCount + ', Errors: ' + errorCount);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Generated ' + successCount + ' QR codes\n' +
    'Skipped: ' + skipCount + ', Errors: ' + errorCount,
    '✅ Done',
    10
  );
}


/**
 * Upload QR code to Drive
 * Helper function for manual QR code uploads
 * @param {Blob} blob - Image blob
 * @param {string} folderName - Drive folder name
 * @returns {File} Drive file object
 */
function uploadQRCodeToDrive(blob, folderName) {
  if (!blob) {
    Logger.logError('No blob provided for upload');
    return null;
  }

  folderName = folderName || 'QR Codes';

  try {
    var folder = SheetHelpers.getOrCreateFolder(folderName, DriveApp.getRootFolder());
    var file = folder.createFile(blob);

    // Set file to shareable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    Logger.log('✅ Uploaded QR code to Drive: ' + file.getName());
    return file;

  } catch (e) {
    Logger.logError('Failed to upload QR code to Drive', e);
    return null;
  }
}


/**
 * Clear QR code images from sheet
 * Clears the QR code column but preserves messages
 */
function clearQRSheet() {
  // Get configuration
  var config = Config.get();
  var qrcodeConfig = config.integrations.qrcode;

  if (!qrcodeConfig || !qrcodeConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'QR Code integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var startRow = qrcodeConfig.startRow || 9;
  var qrCol = qrcodeConfig.qrColumn || 13; // Column M

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < startRow) {
    Logger.log('No QR codes to clear');
    return;
  }

  // Clear QR code column
  var qrRange = sheet.getRange(startRow, qrCol, lastRow - startRow + 1, 1);
  qrRange.clearContent();

  Logger.log('QR codes cleared from column ' + qrCol);
  SpreadsheetApp.getActiveSpreadsheet().toast('QR codes cleared!', '✅ Done', 5);
}


/**
 * Delete QR code files from Drive folder
 * WARNING: This permanently deletes files from Drive
 */
function deleteQRCodesFromDrive() {
  // Get configuration
  var config = Config.get();
  var qrcodeConfig = config.integrations.qrcode;

  if (!qrcodeConfig || !qrcodeConfig.enabled) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'QR Code integration is not enabled',
      '⚠️ Not Enabled',
      5
    );
    return;
  }

  var folderName = qrcodeConfig.driveFolderName || 'QR Codes';

  // Confirm deletion
  var ui = SpreadsheetApp.getUi();
  var response = ui.alert(
    'Delete QR Codes from Drive',
    'This will permanently delete all files in the "' + folderName + '" folder. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    Logger.log('QR code deletion cancelled by user');
    return;
  }

  Logger.log('Deleting QR codes from Drive folder: ' + folderName);

  try {
    var parentFolder = DriveApp.getRootFolder();
    var folders = parentFolder.getFoldersByName(folderName);

    if (!folders.hasNext()) {
      Logger.log('Folder not found: ' + folderName);
      SpreadsheetApp.getActiveSpreadsheet().toast('Folder not found', 'ℹ️ Info', 5);
      return;
    }

    var folder = folders.next();
    var files = folder.getFiles();
    var deleteCount = 0;

    while (files.hasNext()) {
      var file = files.next();
      file.setTrashed(true);
      deleteCount++;
    }

    Logger.log('✅ Deleted ' + deleteCount + ' QR code files');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Deleted ' + deleteCount + ' files from Drive',
      '✅ Done',
      5
    );

  } catch (e) {
    Logger.logError('Failed to delete QR codes from Drive', e);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Error deleting files. See debug log.',
      '❌ Error',
      5
    );
  }
}

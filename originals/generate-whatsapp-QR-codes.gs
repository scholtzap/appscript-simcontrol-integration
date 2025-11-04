function generateWhatsAppQRCodes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const startRow = 9;
  const messageCol = 1; // Column A
  const qrCol = 13;     // Column M
  const lastRow = sheet.getLastRow();

  logToSheet("INFO", "QR code generation started.");

  const messages = sheet.getRange(startRow, messageCol, lastRow - startRow + 1).getValues();

  // Create a folder in Drive to store QR codes
  const folderName = "WhatsApp QR Codes";
  const parentFolder = DriveApp.getRootFolder();
  let qrFolder = getOrCreateFolder(folderName, parentFolder);

  for (let i = 0; i < messages.length; i++) {
    const row = startRow + i;
    const message = messages[i][0];

    if (message) {
      try {
        const encodedMessage = encodeURIComponent(message);
        const whatsappURL = `https://wa.me/27600139923?text=${encodedMessage}`;
        const qrAPI = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(whatsappURL)}`;

        const response = UrlFetchApp.fetch(qrAPI);
        const blob = response.getBlob().setName(sanitizeFilename(message) + ".png");

        // Save image in Drive
        const file = qrFolder.createFile(blob);

        // Set file to shareable
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const fileId = file.getId();
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        const formula = `=IMAGE("${directUrl}")`;
        sheet.getRange(row, qrCol).setFormula(formula);

        logToSheet("SUCCESS", `QR for row ${row} saved as '${file.getName()}' and inserted.`);
      } catch (error) {
        logToSheet("ERROR", `Row ${row}: ${error}`);
      }
    } else {
      logToSheet("INFO", `Skipped row ${row} — empty message.`);
    }
  }

  logToSheet("INFO", "QR code generation complete.");
}

function getOrCreateFolder(name, parent) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function sanitizeFilename(name) {
  return name.toString().replace(/[\\\/:*?"<>|]/g, "").substring(0, 50); // keep it safe and under 50 chars
}
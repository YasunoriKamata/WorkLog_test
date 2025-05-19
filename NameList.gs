function doGet(e) {
  // 1番目のシートを指定
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

  // データ範囲を一括取得（A列とB列のみ）
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();

  // 空行を除外（A列＝名前が空でなければ有効とみなす）
  const filtered = data.filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined);

  return ContentService
    .createTextOutput(JSON.stringify(filtered))
    .setMimeType(ContentService.MimeType.JSON);
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🧠 SIMcontrol Tools')
    .addItem('⬇️ Download All Data Usage History from ' + START_DATE, 'fetchAllHistoricalUsage')
    .addItem('⏱ Fetch Yesterday\'s Usage', 'fetchPreviousDayUsage')
    .addItem('📋 Generate SIM Usage Summary', 'generateSIMUsageSummary')
    .addItem("📶 Fetch Recharges (Today & Yesterday)", "fetchRecentRechargesToSheet")
    .addSeparator()
    .addItem('🛑 Cancel Running Script', 'cancelExecution')
    .addSeparator()
    //.addItem('🧹 Clear Data Usage Sheet', 'clearDataUsage')
    .addItem('🧹 Clear Debug Log', 'clearDebugLog')
    .addSeparator()
    .addItem('🧪 Test API Key', 'testSimcontrolApiKey')
    .addItem('📊 Check API Rate Limit', 'checkApiRateLimit')
    .addToUi();
}
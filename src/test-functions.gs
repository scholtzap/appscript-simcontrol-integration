function testSimcontrolApiKey() {
  const apiKey = getApiKey();
  if (!apiKey) {
    logToSheet('ERROR', 'API key not found in Script Properties.');
    return;
  }

  try {
    const response = UrlFetchApp.fetch('https://app.simcontrol.co.za/api/organisations/balance', {
      method: 'get',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      },
      muteHttpExceptions: true
    });

    const statusCode = response.getResponseCode();
    const result = response.getContentText();

    if (statusCode === 200) {
      logToSheet('INFO', 'API key is valid. Balance response: ' + result);
    } else {
      logToSheet('ERROR', `API test failed. Status Code: ${statusCode}, Response: ${result}`);
    }
  } catch (error) {
    logToSheet('ERROR', 'Error making API request: ' + error);
  }
}

function testUpdateSimDescription() {
  const iccid = '89440000000031512470';  // Replace with a known-good ICCID from your account
  const description = 'WGID: WVVT - HBID: ';

  const url = `https://app.simcontrol.co.za/api/sims?iccid=${encodeURIComponent(iccid)}`;
  const options = {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify({ description }),
    headers: {
      'x-api-key': getApiKey(),
      'Accept': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const status = response.getResponseCode();
    const text = response.getContentText();

    if (status === 200 || status === 202) {
      logToSheet('INFO', `✅ Test update succeeded for ICCID ${iccid}`);
    } else {
      logToSheet('ERROR', `❌ Test update failed (Status ${status}) → ${text}`);
    }
  } catch (err) {
    logToSheet('ERROR', `❌ Exception during test update: ${err}`);
  }
}

function testSingleSimDayUsage() {
  const msisdn = '+27836119431';
  const date = '2025-07-08';
  const usage = fetchUsageForSimOnDate(msisdn, date);
  if (usage) {
    Logger.log(`Data: ${usage.airtime_usage}, Data: ${usage.data_usage}, SMS: ${usage.sms_usage}`);
  }
}

function testFetchRechargesToLog() {
  const start = '2025-07-01';
  const end = '2025-07-10';
  const recharges = fetchRechargesBetweenDates(start, end);

  if (!recharges || recharges.length === 0) {
    logToSheet('INFO', `No recharges found between ${start} and ${end}`);
    return;
  }

  logToSheet('INFO', `📥 Recharge fetch returned ${recharges.length} entries`);

  // Inspect first recharge object
  const first = recharges[0];
  logToSheet('DEBUG', 'First recharge object raw: ' + JSON.stringify(first, null, 2));

  // Then attempt to print all with fallback
  for (const r of recharges) {
    const id = r.transaction_id || 'N/A';
    const sim = r.msisdn || 'N/A';
    const status = r.status || 'N/A';
    const reference = r.reference || '';

    const summary = `RechargeID ${id} | SIM ${sim} | ${status} | Reference: ${reference}`;
    logToSheet('INFO', summary);
  }

  logToSheet('INFO', '✅ Finished logging recharge details');
}

function grantTriggerPermissions() {
  ScriptApp.newTrigger('dummy')
    .timeBased()
    .after(1 * 60 * 1000)
    .create();
}

// Googlesheet 憑證
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { resourceLimits } = require('worker_threads');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listMajors(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return;
  }
  console.log('Name, Major:');
  rows.forEach((row) => {
    // Print columns A and E, which correspond to indices 0 and 4.
    console.log(`${row[0]}, ${row[4]}`);
  });
}



function writeData(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  let values = [
    ['Chris', 'Male', '1. Freshman', 'FL', 'Art', 'Baseball'],
    ['張哲銓', '300萬', 200]
    // Potential next row
  ];
  const resource = {
    values,
  };
  // 檢查第一列是否有相同的資料
  // chatGPT給的參考程式碼
  sheets.spreadsheets.values.get({
    spreadsheetId: "1Ipl7O6g3Z4RFwALNhb6cwrEeyq0REZ_V9fU-p4DNFGg",
    range: "工作表1!A1",
  }, (err, result) => {
    if(err) {
      // Handler error
      console.log(err);
    } else {
      console.log(result.data.values);
      const existingValues = result.data.values[0];
      const newValues = values[0];
      const match = existingValues.every((val, i) => val === newValues[i]);

      //  Only write the new row if there is no match
      if (!match) {
        const resource = { values };
        sheets.spreadsheets.values.append(
          {
            spreadsheetId: "1Ipl7O6g3Z4RFwALNhb6cwrEeyq0REZ_V9fU-p4DNFGg",
            range: "工作表1!A2",
            valueInputOption: "RAW",
            resource,
          },
          (err, result) => {
            if (err) {
              // Handle error;
            } else {
              console.log(
                '%d cells updated on range: %s',
                result.data.updates.updatedCells,
                result.data.updates.updatedRange
              );
            }
          }
        );
      }
    }
  });
}


authorize().then(writeData).catch(console.error);


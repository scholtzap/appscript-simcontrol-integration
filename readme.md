1. Download node.js
2. Download clasp using cmd, enter: 
    npm install -g @google/clasp
3. Then verify the install by checking clasp version, enter:
    clasp -v
4. Download login credentials from google cloud platform:
    Go to: https://console.cloud.google.com/apis/credentials
    Create a new credential > OAuth Client ID > Desktop Application Type > and call it clasp
    Save the JSON output somewhere safe (e.g .ignore)
5. Go to the saved client_secret.json file, right click and "copy as path"
6. Run in cmd with your path from the previous step:
    clasp login --creds path/to/client_secret.json
7. Run:
    copy %USERPROFILE%\.clasprc.json %USERPROFILE%\.clasprc-account1.json
    This saves a file to your user documents.
8. Go to C:\Users\<YourUsername>\.clasprc.json and save this to your .ignore folder
    If you have multiple accounts needing authentication, do the following:
    Run in cmd: 
        clasp logout
        clasp login --creds path/to/client_secret.json (using a new path by repeating steps 4-6)
        copy %USERPROFILE%\.clasprc.json %USERPROFILE%\.clasprc-account2.json
        clasp logout
9. Open / Create your Google Sheet
    Go to settings and select "Show "appsscript.json" manifest file in editor"
    Copy your Script ID and save it somewhere
10. Create the required script properties:
    AIRTIME_OR_DATA         AIRTIME / DATA         What information are we pulling from the API, data usage or airtime usage?
    USAGE_SHEET_NAME        e.g [API] Data Usage   What is the sheet's name where you want to save the usage data?
    CANCEL_SIM_JOB          false                  Manual execution cancellation flag defined to allow stopping the script early during long-running loops.
    CURRENT_ROW_INDEX       1                      Allows side-stepping of the 6-min execution runtime limit by tracking what the last processed row was and continuing from it
    SIMCONTROL_API_KEY      (yours)                Get it from the SimControl settings page
    LAST_PROCESSED_DATE     2025-01-01             ?
    RATE_LIMIT_HIT          false                  Flags if SimControl has notified of a rate limit.

require('dotenv').config();
const { google } = require('googleapis');

const SPREADSHEET_ID = '1ij_i-W-6cLBQnL_X3d9htwy0-rlRQWT4RcT8gq8FCo0';

async function debugLookup() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'credentials.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // 1. Fetch Address ADDR_00005
        console.log('Fetching Addresses...');
        const addrRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Addresses!A:K', // Just need ID and Zip (A..K)
        });
        const addrRows = addrRes.data.values;
        const targetId = 'ADDR_00005';
        const addressRow = addrRows.find(r => r[0] === targetId);

        if (!addressRow) {
            console.log(`Address ${targetId} not found.`);
            return;
        }

        const zip = addressRow[10]; // Column K is index 10
        console.log(`Found Address ${targetId}, Zip: "${zip}"`);

        // 2. Fetch Zoning
        console.log('Fetching Zip Code Zoning...');
        const zoneRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Zip Code Zoning!A:D',
        });
        const zoneRows = zoneRes.data.values;

        // 3. Simulate Lookup
        console.log(`Scanning ${zoneRows.length} zone rows for zip "${zip}"...`);
        let match = null;
        zoneRows.slice(1).forEach(row => {
            if (row[0] && row[0].toString().trim() === zip.toString().trim()) {
                match = {
                    zip: row[0],
                    zone: row[1],
                    dayLetter: row[2],
                    day: row[3]
                };
            }
        });

        if (match) {
            console.log('✅ MATCH FOUND:', match);
        } else {
            console.log('❌ NO MATCH FOUND.');
            // Debug fuzzy matches
            const fuzzy = zoneRows.find(r => r[0] && r[0].toString().includes(zip));
            if (fuzzy) console.log('Did you mean:', fuzzy);
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

debugLookup();

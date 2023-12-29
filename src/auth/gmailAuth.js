import { promises as fs } from "fs";
import process from "process";
import path from "path";

import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify'
];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), "token.json");

async function loadSavedCredentialsIfExist() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        console.log(err);
        return null;
    }
}

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
    
    console.log(payload);

    await fs.writeFile(TOKEN_PATH, payload);
}
  
async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    
    if(client) {
        return client;
    }

    client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH
    });

    if(client.credentials) {
        await saveCredentials(client);
    }

    return client;
}

export { authorize };
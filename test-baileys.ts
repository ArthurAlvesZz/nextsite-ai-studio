import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '.baileys_auth'));
  console.log("State loaded");

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'info' }) as any
  });

  sock.ev.on('connection.update', (update) => {
    console.log("Update:", update);
  });

  sock.ev.on('creds.update', saveCreds);
}

test();

import WebSocket from "ws";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { WebSocketServer } from "ws";
import util from "util";

dotenv.config();

const OAUTH_TOKEN = process.env.OAUTH_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CHAT_CHANNEL_USER_ID = process.env.CHAT_CHANNEL_USER_ID;
const EVENTSUB_WEBSOCKET_URL = process.env.EVENTSUB_WEBSOCKET_URL;

let websocketSessionID;

// Servidor Express
const app = express();
const PORT = 4000;
app.use(express.static(path.join(process.cwd())));

app.listen(PORT, () => {
  console.log(`Events server running at http://localhost:${PORT}`);
});

// WebSocket interno para enviar pro front
const wss = new WebSocketServer({ port: 4001 });

function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(msg));
  });
}

// Twitch EventSub
(async () => {
  await getAuth();
  startWebSocketClient();
})();

async function getAuth() {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: "OAuth " + OAUTH_TOKEN }
  });
  if (res.status !== 200) {
    console.error("Token inválido");
    process.exit(1);
  }
  console.log("Token validado");
}

function startWebSocketClient() {
  const wsClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

  wsClient.on("open", () => console.log("Conectado ao EventSub Twitch"));
  wsClient.on("message", data => handleMessage(JSON.parse(data.toString())));
  wsClient.on("error", console.error);

  return wsClient;
}

async function registerEvent(type, version, condition) {
  let body = {
    type,
    version,
    condition,
    transport: {
      method: "websocket",
      session_id: websocketSessionID // ou o id que você tem do WebSocket
    }
  };
  
  const response = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
  method: "POST",
  headers: {
    "Client-ID": CLIENT_ID,
    "Authorization": `Bearer ${OAUTH_TOKEN}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

const data = await response.json();
console.log("Register Event Result:", JSON.stringify(data, null, 2)); // ⚠️ log para ver se foi aceito
return data;

}

async function registerEventSubListeners() {
  await registerEvent("channel.follow", "2", { broadcaster_user_id: CHAT_CHANNEL_USER_ID, moderator_user_id:"1304533065" });
  await registerEvent("channel.subscribe", "1", { broadcaster_user_id: CHAT_CHANNEL_USER_ID });
  await registerEvent("channel.subscription.gift", "1", { broadcaster_user_id: CHAT_CHANNEL_USER_ID });
  await registerEvent("channel.cheer", "1", { broadcaster_user_id: CHAT_CHANNEL_USER_ID });
  await registerEvent("channel.raid", "1", { to_broadcaster_user_id: CHAT_CHANNEL_USER_ID });
}

function handleMessage(data) {
  if (data.metadata.message_type === "session_welcome") {
    websocketSessionID = data.payload.session.id;
    registerEventSubListeners(); // registra todos os eventos
  }

  if (data.metadata.message_type === "notification") {
    const type = data.metadata.subscription_type;
    const event = data.payload.event;

    switch (type) {
      case "channel.follow":
        console.log(`✨ Novo follower: ${event.user_login}`, JSON.stringify(event, null, 2));
        break;

      case "channel.subscribe":
        console.log(`🎉 Novo sub: ${event.user_login} (Tier: ${event.tier})`, JSON.stringify(event, null, 2));
        break;

      case "channel.subscription.gift":
        console.log(`🎁 Subgift de ${event.user_login} (${event.total} gifts)`, JSON.stringify(event, null, 2));
        break;

      case "channel.cheer":
        console.log(`💎 Bits de ${event.user_login}: ${event.bits}`, JSON.stringify(event, null, 2));
        break;

      case "channel.raid":
        console.log(`🚀 Raid de ${event.from_broadcaster_user_name} com ${event.viewers} viewers`, JSON.stringify(event, null, 2));
        break;

      default:
        console.log("Evento desconhecido:", type, event);
        break;
    }
  }
  
    console.log("Mensagem recebida:", util.inspect(data, { depth: null, colors: true }));

}

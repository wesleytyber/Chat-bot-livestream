import WebSocket from 'ws';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import bodyParser from "body-parser";
import { WebSocketServer } from 'ws';

dotenv.config();

const BOT_USER_ID = process.env.BOT_USER_ID;
const OAUTH_TOKEN = process.env.OAUTH_TOKEN;
const CHAT_CHANNEL_USER_ID = process.env.CHAT_CHANNEL_USER_ID;
const EVENTSUB_WEBSOCKET_URL = process.env.EVENTSUB_WEBSOCKET_URL;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
    
const app = express();
const PORT = 3000;
let websocketSessionID;

let oauthToken = null; // variável global

app.use(bodyParser.json());

// Sessões em memória (para múltiplos usuários)
global.sessions = {}; 

// Config padrão ou carregada de arquivo
let config = {
  streamerColor: "#9146FF",
  streamerMsgColor: "#CCCCCC",
  modColor: "#00FF00",
  modMsgColor: "#CCCCCC",
  subColor: "#FFA500",
  subMsgColor: "#CCCCCC",
  userColor: "#FFFFFF",
  userMsgColor: "#CCCCCC",
  fontSize: "18px",
  fontWeight: "normal",
  background: "transparent"
};

// tenta carregar do arquivo
const configFile = path.join(process.cwd(), "config.json");
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, "utf-8")); } catch (e) { console.warn("Erro lendo config.json:", e); }
}

// rota para retornar config atual (útil para o painel preencher)
app.get("/config", (req, res) => {
  res.json(config);
});

// rota para atualizar config (painel -> server)
app.post("/config", (req, res) => {
  config = { ...config, ...req.body };
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("Erro salvando config:", e);
  }
  broadcast({ type: "config", config });
  return res.json({ ok: true, config });
});

// Middleware para JSON
app.use(express.json());

// Servir HTML estático
app.use(express.static(path.join(process.cwd(), 'public')));


app.listen(PORT, () => {
  console.log(`HTTP server running at http://localhost:${PORT}`);
});

// WebSocket server
const wss = new WebSocketServer({ port: 3001 });

function broadcast(msg) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(msg));
  });
}

// Twitch EventSub bot
(async () => {
  await getAuth();
  startWebSocketClient();
})();

// server-side
app.get('/api/config', (req, res) => {
  res.json(global.chatConfig || {});
});

app.post('/api/config', (req, res) => {
  try {
    const cfg = req.body;
    global.chatConfig = cfg; // salva em memória
    console.log("Config salva:", cfg);
    // se quiser notificar WebSocket
    broadcast({ type: "config", config: cfg });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao salvar config" });
  }
});

app.get("/api/auth/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Faltando code");

    const tokenRes = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
  if (tokenData.error) return res.status(400).send(tokenData.error);

    // Pega info do usuário autenticado
    const userResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Client-Id": CLIENT_ID
      }
    });
    const userData = await userResponse.json();

    // Salva os dados no backend (memória)
    const sessionId = Math.random().toString(36).substring(2);
    global.sessions = global.sessions || {};
    global.sessions[sessionId] = {
      BOT_USER_ID: userData.data[0].id,
      LOGIN: userData.data[0].login,
      OAUTH_TOKEN: tokenData.access_token,
      REFRESH_TOKEN: tokenData.refresh_token,
      CLIENT_ID: CLIENT_ID
    };
    
    // Agora sim, salva o token
    oauthToken = tokenData.access_token;

    // Valida token
    await getAuth();

    // Conecta WebSocket
    startWebSocketClient();
    return res.redirect(`/panel.html?session=${sessionId}`);

    res.json(tokenData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro interno no servidor");
  }
});

// Função que valida o token
async function getAuth() {
  if (!oauthToken) return; // evita chamar sem token

  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { "Authorization": "OAuth " + oauthToken }
  });
  if (res.status !== 200) {
    console.error("Token inválido");
    return;
  }
  console.log("Token validado");
}

function startWebSocketClient() {
  if (!oauthToken) return;

  const wsClient = new WebSocket(EVENTSUB_WEBSOCKET_URL, {
    headers: { Authorization: "Bearer " + oauthToken }
  });

  wsClient.on("open", () => console.log("Conectado ao EventSub Twitch"));
  wsClient.on("message", data => handleMessage(JSON.parse(data.toString())));
  wsClient.on("error", console.error);

  return wsClient;
}

async function registerEventSubListeners() {
  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + oauthToken,
      "Client-Id": CLIENT_ID,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      condition: {
        broadcaster_user_id: CHAT_CHANNEL_USER_ID,
        user_id: BOT_USER_ID
      },
      transport: { method: "websocket", session_id: websocketSessionID }
    })
  });

  if (res.status !== 202) {
    console.error(await res.json());
  } else {
    console.log("Inscrito em channel.chat.message");
  }
}

function handleMessage(data) {
  if (data.metadata.message_type === "session_welcome") {
    websocketSessionID = data.payload.session.id;
    registerEventSubListeners();
  }

  if (
    data.metadata.message_type === "notification" &&
    data.metadata.subscription_type === "channel.chat.message"
  ) {
    const event = data.payload.event;

    // Detecta a role via badges
    let role = "user";
    if (event.badges) {
      if (event.badges.some(b => b.set_id === "broadcaster")) {
        role = "streamer";
      } else if (event.badges.some(b => b.set_id === "moderator")) {
        role = "mod";
      } else if (event.badges.some(b => b.set_id === "subscriber")) {
        role = "sub";
      }
    }

    const chatMsg = {
      user: event.chatter_user_login,
      message: event.message.text,
      role,
      badges: event.badges?.map(b => b.set_id) || []
    };

    console.log(chatMsg.user + " (" + role + "): " + chatMsg.message);
    broadcast(chatMsg);
  }
}

if (EVENTSUB_WEBSOCKET_URL && OAUTH_TOKEN) {
  import('ws').then(({ default: WebSocketClient }) => {
    const wsClient = new WebSocketClient(EVENTSUB_WEBSOCKET_URL);

    wsClient.on("open", () => console.log("Conectado ao EventSub Twitch"));
    wsClient.on("message", raw => {
      try {
        const data = JSON.parse(raw.toString());
        handleTwitchMessage(data);
      } catch (e) {
        console.error("Erro parse EventSub:", e);
      }
    });
    wsClient.on("error", (err) => console.error("EventSub WS error:", err));
  }).catch(err => console.error(err));
}

function detectRoleFromEvent(event) {
  try {
    // Depois verifica broadcaster
    if(event.chatter_user_id && CHAT_CHANNEL_USER_ID && event.chatter_user_id === CHAT_CHANNEL_USER_ID) return "streamer";

    // Moderador
    if(event.is_mod === true || event.isModerator === true) return "mod";

    // Subscriber
    if(event.is_subscriber === true || event.isSubscriber === true) return "sub";

    // Badges adicionais
    if(Array.isArray(event.badges)) {
      if(event.badges.some(b => (b.type === "broadcaster" || b.set_id === "broadcaster"))) return "streamer";
      if(event.badges.some(b => (b.type === "moderator" || b.set_id === "moderator"))) return "mod";
      if(event.badges.some(b => (b.type === "subscriber" || b.set_id === "subscriber"))) return "sub";
    }
  } catch(e) {}

  return "user";
}


function handleTwitchMessage(data) {
  if (!data?.metadata) return;

  if (data.metadata.message_type === "notification" && data.metadata.subscription_type === "channel.chat.message") {
    const event = data.payload?.event || {};
    const role = detectRoleFromEvent(event);

    const chatMsg = {
      user: event.chatter_user_login || event.user_login || event.display_name || "unknown",
      message: event.message?.text || event.message || event.text || "",
      role,
      badges: event.badges?.map(b => b.set_id) || []
    };

    broadcast(chatMsg);
    console.log(`[chat] ${chatMsg.role} ${chatMsg.user}: ${chatMsg.message}`);
  }
}
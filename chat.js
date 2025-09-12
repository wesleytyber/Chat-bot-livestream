// import WebSocket from 'ws';
// import dotenv from "dotenv";
// import express from "express";   // ou require('express') se usar CommonJS
// import { WebSocketServer } from "ws";
// import path from "path";

// const BOT_USER_ID = process.env.BOT_USER_ID;
// const OAUTH_TOKEN = process.env.OAUTH_TOKEN;
// const CLIENT_ID = process.env.CLIENT_ID;
// const CHAT_CHANNEL_USER_ID = process.env.CHAT_CHANNEL_USER_ID;

// const EVENTSUB_WEBSOCKET_URL = process.env.EVENTSUB_WEBSOCKET_URL;

// var websocketSessionID;

// dotenv.config();
// const app = express();
// const PORT = 3000;

// // Serve arquivos estáticos (HTML)
// app.use(express.static(path.join(process.cwd())));

// app.listen(PORT, () => {
//   console.log(`HTTP server running at http://localhost:${PORT}`);
// });

// // WebSocket server
// const wss = new WebSocketServer({ port: 3001 });
// function broadcast(msg) {
//   wss.clients.forEach(client => {
//     if (client.readyState === 1) client.send(JSON.stringify(msg));
//   });
// }

// // Start executing the bot from here
// (async () => {
// 	// Verify that the authentication is valid
// 	await getAuth();

// 	// Start WebSocket client and register handlers
// 	const websocketClient = startWebSocketClient();
// })();

// // WebSocket will persist the application loop until you exit the program forcefully

// async function getAuth() {
// 	// https://dev.twitch.tv/docs/authentication/validate-tokens/#how-to-validate-a-token
// 	let response = await fetch('https://id.twitch.tv/oauth2/validate', {
// 		method: 'GET',
// 		headers: {
// 			'Authorization': 'OAuth ' + OAUTH_TOKEN
// 		}
// 	});

// 	if (response.status != 200) {
// 		let data = await response.json();
// 		console.error("Token is not valid. /oauth2/validate returned status code " + response.status);
// 		console.error(data);
// 		process.exit(1);
// 	}

// 	console.log("Validated token.");
// }

// function startWebSocketClient() {
// 	let websocketClient = new WebSocket(EVENTSUB_WEBSOCKET_URL);

// 	websocketClient.on('error', console.error);

// 	websocketClient.on('open', () => {
// 		console.log('WebSocket connection opened to ' + EVENTSUB_WEBSOCKET_URL);
// 	});

// 	websocketClient.on('message', (data) => {
// 		handleWebSocketMessage(JSON.parse(data.toString()));
// 	});

// 	return websocketClient;
// }

// function handleWebSocketMessage(data) {
// 	switch (data.metadata.message_type) {
// 		case 'session_welcome': // First message you get from the WebSocket server when connecting
// 			websocketSessionID = data.payload.session.id; // Register the Session ID it gives us

// 			// Listen to EventSub, which joins the chatroom from your bot's account
// 			registerEventSubListeners();
// 			break;
// 		case 'notification': // An EventSub notification has occurred, such as channel.chat.message
// 			switch (data.metadata.subscription_type) {
// 				case 'channel.chat.message':
// 					// First, print the message to the program's console.
// 					console.log(`MSG #${data.payload.event.broadcaster_user_login} <${data.payload.event.chatter_user_login}> ${data.payload.event.message.text}`);

// 					// Then check to see if that message was "HeyGuys"
// 					if (data.payload.event.message.text.trim() == "HeyGuys") {
// 						// If so, send back "VoHiYo" to the chatroom
// 						sendChatMessage("VoHiYo")
// 					}

// 					break;
// 			}
// 			break;
// 	}
	
// // Dentro de handleWebSocketMessage -> channel.chat.message
// if (data.metadata.subscription_type === 'channel.chat.message') {
//   const chatMsg = {
//     user: data.payload.event.chatter_user_login,
//     message: data.payload.event.message.text
//   };
//   console.log(`${chatMsg.user}: ${chatMsg.message}`);
//   broadcast(chatMsg); // envia pro HTML
// }

// }

// async function sendChatMessage(chatMessage) {
// 	let response = await fetch('https://api.twitch.tv/helix/chat/messages', {
// 		method: 'POST',
// 		headers: {
// 			'Authorization': 'Bearer ' + OAUTH_TOKEN,
// 			'Client-Id': CLIENT_ID,
// 			'Content-Type': 'application/json'
// 		},
// 		body: JSON.stringify({
// 			broadcaster_id: CHAT_CHANNEL_USER_ID,
// 			sender_id: BOT_USER_ID,
// 			message: chatMessage
// 		})
// 	});

// 	if (response.status != 200) {
// 		let data = await response.json();
// 		console.error("Failed to send chat message");
// 		console.error(data);
// 	} else {
// 		console.log("Sent chat message: " + chatMessage);
// 	}
// }

// async function registerEventSubListeners() {
// 	// Register channel.chat.message
// 	let response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
// 		method: 'POST',
// 		headers: {
// 			'Authorization': 'Bearer ' + OAUTH_TOKEN,
// 			'Client-Id': CLIENT_ID,
// 			'Content-Type': 'application/json'
// 		},
// 		body: JSON.stringify({
// 			type: 'channel.chat.message',
// 			version: '1',
// 			condition: {
// 				broadcaster_user_id: CHAT_CHANNEL_USER_ID,
// 				user_id: BOT_USER_ID
// 			},
// 			transport: {
// 				method: 'websocket',
// 				session_id: websocketSessionID
// 			}
// 		})
// 	});

// 	if (response.status != 202) {
// 		let data = await response.json();
// 		console.error("Failed to subscribe to channel.chat.message. API call returned status code " + response.status);
// 		console.error(data);
// 		process.exit(1);
// 	} else {
// 		const data = await response.json();
// 		console.log(`Subscribed to channel.chat.message [${data.data[0].id}]`);
// 	}
// }


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
const CLIENT_ID = process.env.CLIENT_ID;
const CHAT_CHANNEL_USER_ID = process.env.CHAT_CHANNEL_USER_ID;
const EVENTSUB_WEBSOCKET_URL = process.env.EVENTSUB_WEBSOCKET_URL;

const app = express();
const PORT = 3000;
let websocketSessionID;

app.use(bodyParser.json());

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

async function getAuth() {
  const res = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { "Authorization": "OAuth " + OAUTH_TOKEN }
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

async function registerEventSubListeners() {
  const res = await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + OAUTH_TOKEN,
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
// import fs from "fs/promises";
// import path from "path";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ error: "Método não permitido" });
//   }

//   try {
//     const code = req.query.code;
//     if (!code) {
//       return res.status(400).json({ error: "Code ausente" });
//     }

//     const clientId = process.env.TWITCH_CLIENT_ID;
//     const clientSecret = process.env.TWITCH_CLIENT_SECRET;
//     const redirectUri = process.env.REDIRECT_URI;

//     const response = await fetch(`https://id.twitch.tv/oauth2/token`, {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({
//         client_id: clientId,
//         client_secret: clientSecret,
//         code,
//         grant_type: "authorization_code",
//         redirect_uri: redirectUri,
//       }),
//     });

//     const data = await response.json();

//     if (!data.access_token) {
//       return res.status(400).json({ error: "Falha ao obter token", details: data });
//     }

//     // salva config em /tmp (ephemeral, mas funciona na Vercel em runtime)
//     const configPath = path.join("/tmp", "config.json");
//     await fs.writeFile(configPath, JSON.stringify(data, null, 2));

//     return res.redirect("/chat.html");
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: "Erro interno no servidor" });
//   }
// }

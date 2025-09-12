import dotenv from "dotenv";

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const OAUTH_TOKEN = process.env.OAUTH_TOKEN;

async function getUserId(username) {
  const res = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
    headers: {
      "Authorization": `Bearer ${OAUTH_TOKEN}`,
      "Client-Id": CLIENT_ID
    }
  });

  if (!res.ok) {
    console.error("Erro:", res.status, await res.text());
    return;
  }

  const data = await res.json();
  console.log("User data:", data.data[0]);
}

getUserId("wesley_czans"); // troque pelo user que você quer

// PS C:\Users\Wesley Calazans\Documents\chat-bot> node getUserId.js
// [dotenv@17.2.2] injecting env (5) from .env -- tip: 🔐 prevent committing .env to code: https://dotenvx.com/precommit
// User data: {
//   id: '1304533065',
//   login: 'wesley_czans',
//   display_name: 'wesley_czans',
//   type: '',
//   broadcaster_type: '',
//   description: '',
//   profile_image_url: 'https://static-cdn.jtvnw.net/user-default-pictures-uv/998f01ae-def8-11e9-b95c-784f43822e80-profile_image-300x300.png',
//   offline_image_url: '',
//   view_count: 0,
//   created_at: '2025-04-29T14:08:19Z'
// }
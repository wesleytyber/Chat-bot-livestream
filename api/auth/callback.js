export default async function handler(req, res) {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send("Faltando code");

    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const redirectUri = process.env.REDIRECT_URI;
    
    // Troca code por token
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) return res.status(400).send(tokenData.error);

    // Pega info do usuário autenticado
    const userResponse = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Client-Id": clientId
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
      CLIENT_ID: clientId
    };
    
    console.log(userData);
    console.log(tokenData.access_token);

    // Redireciona para a tela do painel com sessionId
    return res.redirect(`/panel.html?session=${sessionId}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Erro interno no servidor");
  }
}

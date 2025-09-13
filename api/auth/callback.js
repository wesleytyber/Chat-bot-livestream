export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Missing code");
  }

  try {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: "https://SEU-PROJETO.vercel.app/api/auth/callback"
      })
    });

    const data = await response.json();

    if (data.access_token) {
      res.status(200).json({
        message: "Autenticado com sucesso!",
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in
      });
    } else {
      res.status(400).json({ error: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

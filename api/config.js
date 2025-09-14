export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      const cfg = req.body;

      // salva em memória (temporário)
      global.chatConfig = cfg;

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao salvar config" });
    }
  }

  if (req.method === "GET") {
    return res.status(200).json(global.chatConfig || {});
  }

  return res.status(405).json({ error: "Método não permitido" });
}

import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  const configPath = path.join("/tmp", "config.json");

  if (req.method === "GET") {
    try {
      const data = await fs.readFile(configPath, "utf8");
      return res.status(200).json(JSON.parse(data));
    } catch {
      return res.status(200).json({ message: "Nenhuma config salva" });
    }
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      await fs.writeFile(configPath, JSON.stringify(body, null, 2));
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Falha ao salvar config" });
    }
  }

  return res.status(405).json({ error: "Método não permitido" });
}

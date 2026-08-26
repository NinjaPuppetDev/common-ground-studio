import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getQuotaForRequest } from "../../src/server/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed. Use GET." });
  }

  try {
    const quota = await getQuotaForRequest(req);
    return res.status(200).json(quota);
  } catch (err) {
    console.error("[Vercel /api/auth/quota Error]", err);
    return res.status(500).json({ error: "Failed to retrieve quota" });
  }
}

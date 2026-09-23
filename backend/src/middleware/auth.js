import { verifyAccessToken } from "../services/jwt.service.js";

export function requireAuth(request, response, next) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return response.status(401).json({ error: "Authentication required" });
  try {
    request.user = verifyAccessToken(token);
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired access token" });
  }
}

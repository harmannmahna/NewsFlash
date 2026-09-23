import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function issueTokens(user) {
  const subject = { id: user.id, email: user.email };
  return {
    accessToken: jwt.sign(subject, env.jwtSecret, { expiresIn: "15m" }),
    refreshToken: jwt.sign(subject, env.refreshSecret, { expiresIn: "7d" }),
  };
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.refreshSecret);
}

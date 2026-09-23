import { ZodError } from "zod";

export function errorHandler(error, request, response, next) {
  console.error(error);
  if (error instanceof ZodError) return response.status(400).json({ error: "Invalid request" });
  if (error.code === 11000) return response.status(409).json({ error: "Email is already registered" });
  response.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
}

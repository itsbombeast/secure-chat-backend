import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? "Internal server error" : err.message || "Error";
  res.status(status).json({ error: message });
};

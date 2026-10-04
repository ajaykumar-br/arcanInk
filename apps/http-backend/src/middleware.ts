import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@ajaykumar_br/backend-common/config";

export interface CustomRequest extends Request {
  userId?: string;
}

export function middleware(
  req: CustomRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers["authorization"] ?? "";

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (decoded && typeof decoded === "object" && decoded.userId) {
      req.userId = decoded.userId;
      return next();
    }
  } catch {
    // invalid or expired token: fall through to 403
  }
  res.status(403).json({
    msg: "unauthorized request",
  });
}

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

  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

  if (decoded) {
    req.userId = decoded.userId;
    next();
  } else {
    res.status(403).json({
      msg: "unauthorized request",
    });
  }
}

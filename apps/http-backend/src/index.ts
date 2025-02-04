import express from "express";
import { JWT_SECRET } from "@repo/backend-common/config";
import { RoomSchema, SignInSchema, SignUpSchema } from "@repo/common/types";
import { prisma } from "@repo/db/prisma";
import jwt from "jsonwebtoken";
import { CustomRequest, middleware } from "./middleware";
import cors from "cors";
const app = express();

app.use(express.json());
app.use(cors());
// app.use(
//   cors({
//     origin: "http://localhost:3001",
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );

app.post("/signup", async (req, res) => {
  // parse req throw zod
  const parsedReq = SignUpSchema.safeParse(req.body);
  // if not parsed correctly, respond with 403 incorrect error
  if (!parsedReq.success) {
    res.status(403).json({
      msg: "Invalid zod types",
    });
    return;
  }
  // put in db and respond with 200
  try {
    const user = await prisma.user.create({
      data: {
        name: parsedReq.data.name,
        password: parsedReq.data.password,
        email: parsedReq.data.username,
      },
    });

    res.status(200).json({
      userId: user.id,
    });
  } catch (e) {
    res.status(411).json({
      msg: "User already exists with this credentials",
    });
  }
});

app.post("/signin", async (req, res) => {
  const parsedReq = SignInSchema.safeParse(req.body);
  // if not parsed correctly, respond with 403 incorrect error
  if (!parsedReq.success) {
    res.status(403).json({
      msg: "Invalid zod types",
    });
    return;
  }

  // validate with db for correct password
  const user = await prisma.user.findFirst({
    where: {
      email: parsedReq.data.username,
      password: parsedReq.data.password,
    },
  });

  if (!user) {
    res.status(403).json({
      msg: "Invalid Credentials",
    });
    return;
  }
  // sign a jwt and send it back
  const token = jwt.sign({ userId: user?.id }, JWT_SECRET);

  res.status(200).json({
    msg: "Successfully signed in",
    token,
  });
});

app.post("/room", middleware, async (req: CustomRequest, res) => {
  // zod validation
  const parsedReq = RoomSchema.safeParse(req.body);

  if (!parsedReq.success) {
    res.status(403).json({
      msg: "Incorrect Inputs",
    });
    return;
  }
  // extract userId
  const userId = req.userId;
  if (!userId) {
    res.status(403).json({
      msg: "User ID is missing",
    });
    return;
  }

  try {
    // put in db
    const room = await prisma.room.create({
      data: {
        slug: parsedReq.data.name,
        adminId: userId,
      },
    });

    res.status(200).json({
      roomId: room.id,
      msg: "created Room",
    });
  } catch (e) {
    res.status(411).json({
      msg: "room with this name already exists",
    });
  }
});

app.get("/getDrawings/:roomId", async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const canvas = prisma.canvas.findMany({
      where: {
        roomId: roomId,
      },
      orderBy: {
        id: "desc",
      },
      take: 50,
    });
    console.log(canvas);

    res.json({
      messages: canvas,
    });
  } catch (e) {
    res.json({
      messages: [],
    });
  }
});

app.get("/room/:slug", async (req, res) => {
  const slug = req.params.slug;
  const room = await prisma.room.findFirst({
    where: {
      slug,
    },
  });

  res.json({
    room,
  });
});

app.listen(3001);

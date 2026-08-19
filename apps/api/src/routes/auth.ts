import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma";
import { verifyTelegramInitData } from "../telegramAuth";

export const authRouter = Router();

const bodySchema = z.object({ initData: z.string().min(1) });

authRouter.post("/telegram", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "initData required" });

  let verified;
  try {
    verified = verifyTelegramInitData(parsed.data.initData, process.env.BOT_TOKEN!);
  } catch (e) {
    return res.status(401).json({ error: (e as Error).message });
  }

  const { id, first_name, username, photo_url } = verified.user;

  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(id) },
    update: { firstName: first_name, username, photoUrl: photo_url },
    create: { telegramId: BigInt(id), firstName: first_name, username, photoUrl: photo_url },
  });

  const token = jwt.sign({ telegramId: user.telegramId.toString() }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  res.json({
    token,
    user: {
      telegramId: user.telegramId.toString(),
      firstName: user.firstName,
      username: user.username,
      photoUrl: user.photoUrl,
    },
  });
});

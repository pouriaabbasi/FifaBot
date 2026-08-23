import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../prisma";
import { verifyTelegramInitData } from "../telegramAuth";
import { hashPassword, generateRandomPassword, verifyPassword } from "../password";
import { notifyLoginCredentials } from "../notifications";

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

  let user = await prisma.user.upsert({
    where: { telegramId: BigInt(id) },
    update: { firstName: first_name, username, photoUrl: photo_url },
    create: { telegramId: BigInt(id), firstName: first_name, username, photoUrl: photo_url },
  });

  if (!user.loginUsername || !user.passwordHash) {
    const password = generateRandomPassword();
    user = await prisma.user.update({
      where: { telegramId: user.telegramId },
      data: {
        loginUsername: user.telegramId.toString(),
        passwordHash: hashPassword(password),
        credentialsSentAt: new Date(),
      },
    });
    await notifyLoginCredentials(user.telegramId, user.loginUsername!, password);
  }

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

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "username and password required" });

  const user = await prisma.user.findUnique({ where: { loginUsername: parsed.data.username.trim() } });
  if (!user || !user.passwordHash || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
  }

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

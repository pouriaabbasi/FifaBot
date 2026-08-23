import { prisma } from "./prisma";
import { hashPassword, generateRandomPassword } from "./password";
import { notifyLoginCredentials } from "./notifications";

export async function backfillLoginCredentials() {
  const users = await prisma.user.findMany({
    where: { OR: [{ loginUsername: null }, { passwordHash: null }] },
  });

  if (users.length === 0) return;
  console.log(`backfilling login credentials for ${users.length} user(s)`);

  for (const user of users) {
    const password = generateRandomPassword();
    const updated = await prisma.user.update({
      where: { telegramId: user.telegramId },
      data: {
        loginUsername: user.telegramId.toString(),
        passwordHash: hashPassword(password),
        credentialsSentAt: new Date(),
      },
    });
    await notifyLoginCredentials(updated.telegramId, updated.loginUsername!, password);
  }

  console.log("login credentials backfill done");
}

import { PrismaClient } from "@prisma/client";
import { hashPassword, generateRandomPassword } from "../src/password";
import { notifyLoginCredentials } from "../src/notifications";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ loginUsername: null }, { passwordHash: null }] },
  });

  console.log(`${users.length} user(s) missing login credentials`);

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
    console.log(`sent credentials to ${updated.telegramId.toString()}`);
  }

  console.log("done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

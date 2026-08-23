import { PrismaClient as PgClient } from "./migrate-pg-source/generated";
import { PrismaClient as SqliteClient } from "@prisma/client";

const SOURCE_DATABASE_URL =
  "postgresql://postgres.kwtlgqlneqtbfoprwefp:Nano-Npag-1990@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?schema=public";

const pg = new PgClient({ datasources: { db: { url: SOURCE_DATABASE_URL } } });
const sqlite = new SqliteClient();

async function main() {
  const users = await pg.user.findMany();
  const leagues = await pg.league.findMany();
  const stages = await pg.leagueStage.findMany();
  const members = await pg.leagueMember.findMany();
  const memberUsers = await pg.leagueMemberUser.findMany();
  const matches = await pg.match.findMany();
  const notifications = await pg.notification.findMany();

  console.log({
    users: users.length,
    leagues: leagues.length,
    stages: stages.length,
    members: members.length,
    memberUsers: memberUsers.length,
    matches: matches.length,
    notifications: notifications.length,
  });

  for (const u of users) {
    await sqlite.user.create({ data: u });
  }
  for (const l of leagues) {
    await sqlite.league.create({ data: l });
  }
  for (const s of stages) {
    await sqlite.leagueStage.create({ data: s });
  }
  for (const m of members) {
    await sqlite.leagueMember.create({ data: m });
  }
  for (const mu of memberUsers) {
    await sqlite.leagueMemberUser.create({ data: mu });
  }
  for (const match of matches) {
    await sqlite.match.create({ data: match });
  }
  for (const n of notifications) {
    await sqlite.notification.create({ data: n });
  }

  console.log("done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pg.$disconnect();
    await sqlite.$disconnect();
  });

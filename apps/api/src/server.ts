import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { leaguesRouter } from "./routes/leagues";
import { matchesRouter, leagueMatchesRouter } from "./routes/matches";
import { profileRouter } from "./routes/profile";
import { prisma } from "./prisma";
import { backfillLoginCredentials } from "./backfillLoginCredentials";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: true });
  } catch (error) {
    console.error("health check failed", error);
    res.status(503).json({ ok: false, database: false });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/leagues/:id/matches", leagueMatchesRouter);
app.use("/api/leagues", leaguesRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/profile", profileRouter);

const port = process.env.PORT || 4000;
backfillLoginCredentials()
  .catch((err) => console.error("login credentials backfill failed", err))
  .finally(() => {
    app.listen(port, () => console.log(`api listening on :${port}`));
  });

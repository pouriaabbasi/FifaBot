import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { leaguesRouter } from "./routes/leagues";
import { matchesRouter, leagueMatchesRouter } from "./routes/matches";
import { profileRouter } from "./routes/profile";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/leagues/:id/matches", leagueMatchesRouter);
app.use("/api/leagues", leaguesRouter);
app.use("/api/matches", matchesRouter);
app.use("/api/profile", profileRouter);

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`api listening on :${port}`));

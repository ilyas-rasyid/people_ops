import { createApp } from "./app";
import { env } from "./config/env";
import { checkDatabase, closeDatabase } from "./infrastructure/database/connection";

const app = createApp({ checkDatabase });

app.listen(env.port, () => {
  console.info(`PeopleOps API listening on http://localhost:${env.port}`);
});

async function shutdown() {
  await closeDatabase();
  app.stop();
}

process.once("SIGINT", () => {
  void shutdown();
});

process.once("SIGTERM", () => {
  void shutdown();
});

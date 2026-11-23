function readPort(raw: string | undefined): number {
  const port = Number(raw ?? "3001");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("API_PORT must be a valid TCP port.");
  }

  return port;
}

export const env = {
  port: readPort(process.env.API_PORT),
} as const;

import { Server } from "@hocuspocus/server";

const port = Number(process.env.COLLAB_PORT ?? 1234);

const server = Server.configure({
  port,
  address: "0.0.0.0",
  async onAuthenticate({ token, documentName }) {
    if (!token && process.env.COLLAB_REQUIRE_AUTH === "true") {
      throw new Error("Unauthorized");
    }
    return { documentName, user: { name: token ?? "Guest" } };
  },
  async onConnect({ documentName }) {
    console.log(`[collab] connect: ${documentName}`);
  },
});

server.listen();
console.log(`[collab] Hocuspocus listening on ws://0.0.0.0:${port}`);

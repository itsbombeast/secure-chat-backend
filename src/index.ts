import http from "http";
import { createApp } from "./app";
import { initSocket } from "./socket";
import { PORT } from "./config";

const app = createApp();
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

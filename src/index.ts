import http from "http";
import { createApp } from "./app";
import { initSocket } from "./socket";
import { PORT } from "./config";
import messageRoutes from "./routes/messageRoutes";


const app = createApp();
const server = http.createServer(app);
app.use("/api/messages", messageRoutes);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});

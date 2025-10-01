import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { serveDir } from "https://deno.land/std@0.140.0/http/file_server.ts";

let browserSocket: WebSocket | null = null;
const replSockets = new Set<WebSocket>();

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/ws")) {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      console.log("WebSocket connection established.");
      if (url.pathname === "/ws/browser") {
        console.log("Browser client connected.");
        browserSocket = socket;
      } else if (url.pathname === "/ws/repl") {
        console.log("REPL client connected.");
        replSockets.add(socket);
      }
    };

    socket.onmessage = (event) => {
      if (replSockets.has(socket)) {
        if (browserSocket) {
          browserSocket.send(event.data);
        } else {
          socket.send(JSON.stringify({ type: "error", data: "Browser is not connected." }));
        }
      } 
      else if (socket === browserSocket) {
        for (const replSocket of replSockets) {
          replSocket.send(event.data);
        }
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed.");
      if (socket === browserSocket) {
        console.log("Browser client disconnected.");
        browserSocket = null;
      } else if (replSockets.has(socket)) {
        console.log("REPL client disconnected.");
        replSockets.delete(socket);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    return response;
  }

  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
};

console.log("Server listening on http://localhost:8080");
await serve(handler, { port: 8080 });

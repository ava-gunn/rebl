import { readLines } from "https://deno.land/std@0.140.0/io/buffer.ts";

const socket = new WebSocket("ws://localhost:8080/ws/repl");

socket.onopen = async () => {
  console.log("Connected to the server. You can now send JavaScript code to the browser.");
  console.log("Type your code and press Enter.");
  console.log("Type 'exit' to close the REPL.");

  for await (const line of readLines(Deno.stdin)) {
    if (line === "exit") {
      break;
    }
    socket.send(line);
  }

  socket.close();
};

socket.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    if (message.type === "output") {
      console.log("%c< %o", "color: blue;", message.data);
    } else if (message.type === "error") {
      console.error("%c< %s", "color: red;", message.data);
    }
  } catch (e) {
    console.log("< ", event.data);
  }
};

socket.onclose = () => {
  console.log("Connection to the server has been closed.");
  Deno.exit(0);
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error);
  Deno.exit(1);
};

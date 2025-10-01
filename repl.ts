import { readLines } from "https://deno.land/std@0.140.0/io/buffer.ts";
import { blue, red, yellow, gray, cyan, magenta } from "https://deno.land/std@0.140.0/fmt/colors.ts";

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
      console.log(blue("<"), message.data);
    } else if (message.type === "error") {
      console.error(red("<"), message.data);
    } else if (message.type === "log") {
      const { method, data } = message;
      const formattedData = data.map(item => 
        typeof item === 'object' ? JSON.stringify(item, null, 2) : item
      );

      switch (method) {
        case 'log':
          console.log(gray("[Browser]"), ...formattedData);
          break;
        case 'warn':
          console.warn(yellow("[Browser]"), ...formattedData);
          break;
        case 'error':
          console.error(red("[Browser]"), ...formattedData);
          break;
        case 'info':
          console.info(cyan("[Browser]"), ...formattedData);
          break;
        case 'debug':
          console.debug(magenta("[Browser]"), ...formattedData);
          break;
        default:
          console.log(`[Browser ${method}]`, ...formattedData);
      }
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

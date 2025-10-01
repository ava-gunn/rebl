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
    const { method, data } = JSON.parse(event.data);

    const formattedData = data.map(item => 
      (typeof item === 'object' && item !== null) ? JSON.stringify(item, null, 2) : item
    );

    if (console[method] && typeof console[method] === 'function') {
      console[method](...formattedData);
    } else {
      console.log(...formattedData);
    }
  } catch (e) {
    // Fallback for data that isn't in the expected JSON format
    console.log(event.data);
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

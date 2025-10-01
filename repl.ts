import { blue, red, yellow, gray, cyan, magenta } from "https://deno.land/std@0.140.0/fmt/colors.ts";

const socket = new WebSocket("ws://localhost:8080/ws/repl");

socket.onopen = async () => {
  console.log("Connected to the server. You can now send JavaScript code to the browser.");
  console.log("Type your code and press Enter.");
  console.log("Type 'exit' to close the REPL.");

    const decoder = new TextDecoder();

  while (true) {
    await Deno.stdout.write(encoder.encode(blue("> ")));
    const input = new Uint8Array(1024);
    const n = await Deno.stdin.read(input);
    if (n === null) {
      break;
    }
    const line = decoder.decode(input.subarray(0, n)).trim();

    if (line === "exit") {
      break;
    }
    socket.send(line);
  }

  socket.close();
};

const encoder = new TextEncoder();

socket.onmessage = (event) => {
  // Clear the current line (where the prompt is) and move cursor to the beginning
  Deno.stdout.writeSync(encoder.encode("\r\x1b[K"));

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
  
  // Re-print the prompt for the next input
  Deno.stdout.writeSync(encoder.encode(blue("> ")));
};

socket.onclose = () => {
  console.log("Connection to the server has been closed.");
  Deno.exit(0);
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error);
  Deno.exit(1);
};

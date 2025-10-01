import { blue, red, yellow, gray, cyan, magenta } from "https://deno.land/std@0.140.0/fmt/colors.ts";

const socket = new WebSocket("ws://localhost:8080/ws/repl");

function isBalanced(str: string): boolean {
  const stack: string[] = [];
  const map: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}'
  };

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
    } else if (char === ')' || char === ']' || char === '}') {
      if (stack.length === 0) {
        return true; // Likely a complete expression with an unbalanced close
      }
      const lastOpen = stack.pop()!;
      if (map[lastOpen] !== char) {
        return true; // Mismatched brackets, treat as complete to show error
      }
    }
  }

  return stack.length === 0;
}

socket.onopen = async () => {
  console.log("Connected to the server. You can now send JavaScript code to the browser.");
  console.log("Type your code and press Enter.");
  console.log("Type 'exit' to close the REPL.");

    const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const prompt = buffer.length > 0 ? gray("... ") : blue("> ");
    await Deno.stdout.write(encoder.encode(prompt));
    const input = new Uint8Array(1024);
    const n = await Deno.stdin.read(input);
    if (n === null) {
      break;
    }
    const line = decoder.decode(input.subarray(0, n)).trimEnd();

    if (line.trim() === "exit") {
      break;
    }

    buffer += line + '\n';

    if (isBalanced(buffer)) {
        socket.send(buffer);
        buffer = "";
    }
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

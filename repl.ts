import { blue, red, yellow, gray, cyan, magenta } from "https://deno.land/std@0.140.0/fmt/colors.ts";
import { parse } from "https://deno.land/std@0.140.0/flags/mod.ts";

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
const flags = parse(Deno.args);
const quietMode = flags.quiet;

socket.onmessage = (event) => {
  // Clear the current line (where the prompt is) and move cursor to the beginning
  Deno.stdout.writeSync(encoder.encode("\r\x1b[K"));

  try {
    const { type, method, data } = JSON.parse(event.data);

    // In quiet mode, only show results. Otherwise, show everything.
    if (quietMode && type !== 'result') {
        // Re-print the prompt and do nothing
        Deno.stdout.writeSync(encoder.encode(blue("> ")));
        return;
    }

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
  // This is tricky because the prompt depends on the buffer state in onopen
  // For simplicity, we'll just re-print the basic prompt. A better solution
  // would involve sharing state between onopen and onmessage.
  const prompt = blue("> "); // A simplified prompt re-print
  Deno.stdout.writeSync(encoder.encode(prompt));
};

socket.onclose = () => {
  console.log("Connection to the server has been closed.");
  Deno.exit(0);
};

socket.onerror = (error) => {
  console.error("WebSocket error:", error);
  Deno.exit(1);
};

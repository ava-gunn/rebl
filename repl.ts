import { blue, gray } from 'https://deno.land/std@0.140.0/fmt/colors.ts';
import { parse } from 'https://deno.land/std@0.140.0/flags/mod.ts';

const socket = new WebSocket('ws://localhost:8080/ws/repl');

let currentBuffer = '';
let waitingForResponse = false;
let responsePromise: Promise<void> | null = null;
let responseResolve: (() => void) | null = null;

function isBalanced(str: string): boolean {
  const stack: string[] = [];
  const map: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
  };

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(' || char === '[' || char === '{') {
      stack.push(char);
    } else if (char === ')' || char === ']' || char === '}') {
      if (stack.length === 0) {
        return true;
      }
      const lastOpen = stack.pop()!;
      if (map[lastOpen] !== char) {
        return true;
      }
    }
  }

  return stack.length === 0;
}

function prompt() {
  const prompt = currentBuffer.length > 0 ? gray('... ') : blue('> ');
  Deno.stdout.writeSync(encoder.encode(prompt));
}

socket.onopen = async () => {
  console.log("Type 'exit' to close the REPL.");

  const decoder = new TextDecoder();

  while (true) {
    prompt();
    const input = new Uint8Array(1024);
    const n = await Deno.stdin.read(input);

    if (n === null) {
      break;
    }
    const line = decoder.decode(input.subarray(0, n)).trimEnd();

    if (line.trim() === 'exit') {
      break;
    }

    currentBuffer += line + '\n';

    if (isBalanced(currentBuffer)) {
      waitingForResponse = true;
      responsePromise = new Promise((resolve) => {
        responseResolve = resolve;
      });
      socket.send(currentBuffer);
      currentBuffer = '';

      await responsePromise;
    }
  }

  socket.close();
};

const encoder = new TextEncoder();
const flags = parse(Deno.args);
const quietMode = flags.quiet;

socket.onmessage = (event) => {
  try {
    const { type, method, data } = JSON.parse(event.data);

    if (quietMode && type !== 'result' && type !== 'undefined') {
      if (waitingForResponse && responseResolve) {
        responseResolve();
        waitingForResponse = false;
        responseResolve = null;
      }
      return;
    }

    if (type === 'undefined') {
      if (waitingForResponse && responseResolve) {
        responseResolve();
        waitingForResponse = false;
        responseResolve = null;
      }
      return;
    }

    const formattedData = data.map((item) =>
      typeof item === 'object' && item !== null
        ? JSON.stringify(item, null, 2)
        : item,
    );

    Deno.stdout.writeSync(encoder.encode('\n'));

    if (console[method] && typeof console[method] === 'function') {
      console[method](...formattedData);
    } else {
      console.log(...formattedData);
    }

    if (waitingForResponse && responseResolve) {
      responseResolve();
      waitingForResponse = false;
      responseResolve = null;
    }
  } catch (e) {
    Deno.stdout.writeSync(encoder.encode('\n'));
    console.log(event.data);

    if (waitingForResponse && responseResolve) {
      responseResolve();
      waitingForResponse = false;
      responseResolve = null;
    }
  }
};

socket.onclose = () => {
  console.log('Connection to the server has been closed.');
  Deno.exit(0);
};

socket.onerror = (error) => {
  console.error('WebSocket error:', error);
  Deno.exit(1);
};

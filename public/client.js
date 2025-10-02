function setupGlobalUtilities() {
  const utilities = {
    $: document.querySelector.bind(document),
    $$: document.querySelectorAll.bind(document),
    clear: console.clear.bind(console),
    copy: (object) => {
      if (typeof object !== 'string') {
        object = JSON.stringify(object, null, 2);
      }
      navigator.clipboard
        .writeText(object)
        .then(() => console.log('Copied to clipboard.'))
        .catch((err) => console.error('Failed to copy: ', err));
    },
    inspect: console.dir.bind(console),
    keys: Object.keys.bind(Object),
    values: Object.values.bind(Object),
    table: console.table.bind(console),
  };

  Object.assign(window, utilities);
}

setupGlobalUtilities();

const socket = new WebSocket('ws://localhost:8080/ws/browser');

function sendMessage(type, method, data) {
  socket.send(JSON.stringify({ type, method, data }));
}

function createConsoleWrapper(method, originalMethod) {
  return (...args) => {
    const serializedArgs = args.map((arg) => serializeOutput(arg));
    sendMessage('log', method, serializedArgs);
    originalMethod(...args);
  };
}

const originalConsole = { ...console };
const methodsToWrap = ['log', 'warn', 'error', 'info', 'debug'];

methodsToWrap.forEach((method) => {
  console[method] = createConsoleWrapper(method, originalConsole[method]);
});

socket.addEventListener('open', () => {
  console.log('WebSocket connection established.');
});

function serializeOutput(data, maxDepth = 2) {
  const seen = new WeakSet();

  function serialize(obj, depth) {
    if (obj === undefined) {
      return 'undefined';
    }
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Node) {
      return obj.outerHTML || obj.nodeValue;
    }
    if (obj instanceof NodeList) {
      return Array.from(obj).map((item) => item.outerHTML || item.nodeValue);
    }
    if (seen.has(obj)) {
      return '[Circular]';
    }
    if (depth >= maxDepth) {
      return '[Max Depth]';
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map((item) => serialize(item, depth + 1));
    }

    const newObj = {};
    for (const key in obj) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = serialize(obj[key], depth + 1);
        }
      } catch (e) {
        newObj[key] = `[Error: ${e.message}]`;
      }
    }
    return newObj;
  }
  return serialize(data, 0);
}

// Create a persistent evaluation context
var __EVAL = (s) => eval(`void (__EVAL = ${__EVAL.toString()}); ${s}`);

socket.addEventListener('message', (event) => {
  const code = event.data;
  try {
    const result = __EVAL(code);
    const serializedResult = serializeOutput(result);

    sendMessage('result', 'log', [serializedResult]);
  } catch (error) {
    sendMessage('log', 'error', [error.message]);
  }
});

socket.addEventListener('close', () => {
  console.log('WebSocket connection closed.');
});

socket.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

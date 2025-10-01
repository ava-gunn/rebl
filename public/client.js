window.$ = document.querySelector.bind(document);
window.$$ = document.querySelectorAll.bind(document);
window.clear = console.clear.bind(console);
window.copy = (object) => {
  if (typeof object !== 'string') {
    object = JSON.stringify(object, null, 2);
  }
  navigator.clipboard.writeText(object)
    .then(() => console.log('Copied to clipboard.'))
    .catch(err => console.error('Failed to copy: ', err));
};
window.inspect = console.dir.bind(console);
window.keys = Object.keys.bind(Object);
window.values = Object.values.bind(Object);
window.table = console.table.bind(console);

const socket = new WebSocket("ws://localhost:8080/ws/browser");

const originalConsole = { ...console };
const methodsToWrap = ['log', 'warn', 'error', 'info', 'debug'];

methodsToWrap.forEach(method => {
  console[method] = (...args) => {
    const serializedArgs = args.map(arg => serializeOutput(arg));
    socket.send(JSON.stringify({ type: 'log', method: method, data: serializedArgs }));
    originalConsole[method](...args);
  };
});

socket.addEventListener("open", () => {
  console.log("WebSocket connection established.");
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
      return Array.from(obj).map(item => item.outerHTML || item.nodeValue);
    }
    if (seen.has(obj)) {
      return '[Circular]';
    }
    if (depth >= maxDepth) {
      return '[Max Depth]';
    }

    seen.add(obj);

    if (Array.isArray(obj)) {
      return obj.map(item => serialize(item, depth + 1));
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

socket.addEventListener("message", (event) => {
  const code = event.data;
  try {
    const result = window.eval(code);
    const serializedResult = serializeOutput(result);
    socket.send(JSON.stringify({ type: "result", method: "log", data: [serializedResult] }));
  } catch (error) {
    socket.send(JSON.stringify({ type: "log", method: "error", data: [error.message] }));
  }
});

socket.addEventListener("close", () => {
  console.log("WebSocket connection closed.");
});

socket.addEventListener("error", (error) => {
  console.error("WebSocket error:", error);
});

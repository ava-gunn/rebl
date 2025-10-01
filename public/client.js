// Console Utilities API
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

// --- Console Interceptor ---
const originalConsole = { ...console };
const methodsToWrap = ['log', 'warn', 'error', 'info', 'debug'];

methodsToWrap.forEach(method => {
  console[method] = (...args) => {
    // Send the log back to the REPL
    socket.send(JSON.stringify({ type: 'log', method: method, data: args }));
    // Call the original console method
    originalConsole[method](...args);
  };
});

socket.addEventListener("open", () => {
  console.log("WebSocket connection established.");
});

// --- Output Serialization ---
function serializeOutput(data) {
  if (data === undefined) {
    return 'undefined';
  }
  if (data instanceof Node) {
    return data.outerHTML || data.nodeValue;
  }
  if (data instanceof NodeList || (Array.isArray(data) && data.every(item => item instanceof Node))) {
    return Array.from(data).map(item => item.outerHTML || item.nodeValue);
  }
  return data;
}

socket.addEventListener("message", (event) => {
  const code = event.data;
  try {
    const result = eval(code);
    const serializedResult = serializeOutput(result);
    socket.send(JSON.stringify({ type: "log", method: "log", data: [serializedResult] }));
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

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

socket.addEventListener("open", () => {
  console.log("WebSocket connection established.");
});

socket.addEventListener("message", (event) => {
  const code = event.data;
  try {
    const result = eval(code);
    socket.send(JSON.stringify({ type: "output", data: result }));
  } catch (error) {
    socket.send(JSON.stringify({ type: "error", data: error.message }));
  }
});

socket.addEventListener("close", () => {
  console.log("WebSocket connection closed.");
});

socket.addEventListener("error", (error) => {
  console.error("WebSocket error:", error);
});

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

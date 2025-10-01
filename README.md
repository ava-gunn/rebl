# REBL

A websocket server and client for executing within the browser console context from a command line repl.

## Usage

Run the server

```sh
deno task server
```

Add the client script to your application

```html
<head>
  <script src="http://localhost:8080/client.js" />
</head>
```

Run the repl client

```sh
deno task repl
```

Execute some JavaScript

```js
> $('h1').innerText
```

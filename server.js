const express = require('express');
const app = express();

const http = require('http').createServer(app);

const socketServer = require("socket.io").Server;

let io = new socketServer(http);

const port = 8080;

app.use(express.static('public'));

http.listen(port, () => {
    console.log('listening on *:' + port);
});

io.on("connection", client => {
    client.on("update", (data) => {
        io.sockets.emit("update", data);
    });
});

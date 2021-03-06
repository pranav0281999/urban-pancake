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
    const chatroom = client.handshake.query.chatroom;

    console.log("Client connected for room: " + chatroom);

    /**
     * data format:
     * {
     * objectType: String - ["cone", "arrow"]
     * objectUUID: String
     * }
     * */
    client.on("object_create", data => {
        console.log("object_create");
        io.sockets.emit("object_create", data);
    });

    /**
     * data format:
     * {
     * position: {x,y,z}
     * objectUUID: String
     * }
     * */
    client.on("object_transform", data => {
        console.log("object_transform", data);
        io.sockets.emit("object_transform", data);
    });

    /**
     * data format:
     * {
     * objectUUID: String
     * }
     * */
    client.on("object_delete", data => {
        console.log("object_delete", data);
        io.sockets.emit("object_delete", data);
    });

    client.on("image", data => {
        console.log("image", data);
        io.sockets.emit("image", data);
    });

    /**
     * data format:
     * {
     * fov: Number
     * }
     * */
    client.on("fov", data => {
        console.log("fov", data);
        io.sockets.emit("fov", data);
    });

    client.on("disconnect", (reason) => {
        console.log("Client disconnected: " + client.id + " for reason: " + reason);
    });
});

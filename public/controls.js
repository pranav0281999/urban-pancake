import {io} from "socket.io-client";

let socket = io();

let uuid = "dsfhjbjhsdfbvkd";

socket.on("connect", () => {
    console.log("Connected to socket");

    socket.emit("object_create", {
        type: "cone",
        objectUUID: uuid
    });
});

document.addEventListener("keypress", (event) => {
    if (event.key.toLowerCase() === "w") {
        socket.emit("object_transform", {
            position: {x: Math.random() * 0.06, y: Math.random() * 0.06, z: Math.random() * 0.06},
            objectUUID: uuid
        });
    } else if (event.key.toLowerCase() === "d") {
        socket.emit("object_delete", {
            objectUUID: uuid
        });
    }
});

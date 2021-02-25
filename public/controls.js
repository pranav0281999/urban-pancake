import { io } from "socket.io-client";

let socket = io();

socket.on("connect", () => {
    console.log("Connected to socket");
});

document.addEventListener("keypress", (event) => {
    if (event.key.toLowerCase() === "w") {
        socket.emit("update", {
            positionAddition: [1, 0, 0]
        });
    } else if (event.key.toLowerCase() === "s") {
        socket.emit("update", {
            positionAddition: [-1, 0, 0]
        });
    } else if (event.key.toLowerCase() === "a") {
        socket.emit("update", {
            positionAddition: [0, 1, 0]
        });
    } else if (event.key.toLowerCase() === "d") {
        socket.emit("update", {
            positionAddition: [0, -1, 0]
        });
    } else if (event.key.toLowerCase() === "q") {
        socket.emit("update", {
            positionAddition: [0, 0, 1]
        });
    } else if (event.key.toLowerCase() === "e") {
        socket.emit("update", {
            positionAddition: [0, 0, -1]
        });
    }
});
import * as THREE from 'three';
import {DragControls} from 'three/examples/jsm/controls/DragControls.js';
import {io} from "socket.io-client";
import {CustomShapeCanvas} from "./CustomShapeCanvas.js";
import {createArrowMesh, createConeMesh, createText, createCustomShape} from "./libs/CommonUtils.js";

let customShapeRadius = 0.005;

let canvas;
let camera, scene, renderer;
let controls, group;
let socket;
let planeMesh;
let customShapeCanvas = new CustomShapeCanvas(customShapeRadius);

let canvasWidth = 0.8;

let addArrowButton = document.getElementById("add_arrow");
let addConeButton = document.getElementById("add_cone");
let addCustomShapeButton = document.getElementById("add_custom_shape");
let clearCanvasButton = document.getElementById("clear_canvas");
let addTextButton = document.getElementById("add_text");
let textInput = document.getElementById("text_input_sprite");
let removeButton = document.getElementById("remove_object");

addArrowButton.addEventListener("click", addArrow);
addConeButton.addEventListener("click", addCone);
addCustomShapeButton.addEventListener("click", addCustomShape);
clearCanvasButton.addEventListener("click", clearCustomShape);
addTextButton.addEventListener("click", addText);
removeButton.addEventListener("click", removeObject);

const objects = [];

init();

function init() {

    canvas = document.getElementById('canvas_main');

    camera = new THREE.PerspectiveCamera(90, window.innerWidth * canvasWidth / window.innerHeight, 0.01, 20);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    scene.add(new THREE.AmbientLight(0x505050));

    group = new THREE.Group();
    scene.add(group);

    renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth * canvasWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const texture = new THREE.TextureLoader().load('assets/image.jpg',

        // onLoad callback
        (texture) => {
            let ratio = texture.image.width / texture.image.height;

            let planeGeo = new THREE.PlaneGeometry(2 * ratio, 2, 2, 2);
            let planeMat = new THREE.MeshBasicMaterial({map: texture});
            planeMesh = new THREE.Mesh(planeGeo, planeMat);
            planeMesh.position.set(0, 0, -Math.tan(45 * Math.PI / 180));
            scene.add(planeMesh);

            render();
        },

        // onProgress callback currently not supported
        undefined,

        // onError callback
        function (err) {
            console.error('An error happened.', err);
        });

    controls = new DragControls([...objects], camera, renderer.domElement);
    controls.addEventListener('drag', render);
    controls.addEventListener('drag', sendPosition);

    window.addEventListener('resize', onWindowResize);

    render();

    setupSocket();

    customShapeCanvas.init();
}

function setupSocket() {
    socket = io();

    socket.on("connect", () => {
        console.log("Connected to socket");

        socket.on("image", data => {
            console.log("image", data);
        })

        socket.on("fov", data => {
            console.log("fov", data);

            camera.fov = data.fov;
            camera.updateProjectionMatrix();

            planeMesh.position.set(0, 0, -Math.tan((90 - data.fov / 2) * Math.PI / 180));

            render();
        })
    });
}

function uuidV4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function addToDraggable(object) {
    const draggableObjects = controls.getObjects();
    draggableObjects.push(object);
}

function removeFromDraggable(object) {
    const draggableObjects = controls.getObjects();

    const index = draggableObjects.findIndex((obj) => {
        return obj.userData.id === object.userData.id;
    });

    draggableObjects.splice(index, 1);
}

function addCone() {
    let cone = createConeMesh(0.05, 0.1, new THREE.MeshNormalMaterial());
    // let cone = createText("Hello World", 0.03, "red");
    cone.position.set(0, 0, -1);

    const uuid = uuidV4();

    cone.userData.id = uuid;

    scene.add(cone);

    objects.push(cone);

    addToDraggable(cone);

    socket.emit("object_create", {
        type: "cone",
        objectUUID: uuid
    });

    render();
}

function addText() {
    const text = textInput.value.trim();
    if (text !== "") {
        let spriteText = createText(text, 0.03, "red");
        spriteText.position.set(0, 0, -1);

        const uuid = uuidV4();

        spriteText.userData.id = uuid;

        scene.add(spriteText);

        objects.push(spriteText);

        addToDraggable(spriteText);

        socket.emit("object_create", {
            type: "text",
            text: text,
            objectUUID: uuid
        });

        textInput.value = "";
    }

    render();
}

function addArrow() {
    let arrow = createArrowMesh(0.1, new THREE.MeshNormalMaterial());
    arrow.position.set(0, 0, -1);

    const uuid = uuidV4();

    arrow.userData.id = uuid;

    scene.add(arrow);

    objects.push(arrow);

    addToDraggable(arrow);

    socket.emit("object_create", {
        type: "arrow",
        objectUUID: uuid
    });

    render();
}

function addCustomShape() {
    let points = customShapeCanvas.getPoints();

    if (points.length > 0) {
        let customShape = createCustomShape(points, customShapeRadius, new THREE.MeshNormalMaterial());
        customShape.position.set(0, 0, -1);

        const uuid = uuidV4();

        customShape.userData.id = uuid;

        scene.add(customShape);

        objects.push(customShape);

        addToDraggable(customShape);

        socket.emit("object_create", {
            type: "custom",
            objectUUID: uuid,
            points: points
        });
    }

    render();
}

function clearCustomShape() {
    customShapeCanvas.clearCanvas();
}

function removeObject() {
    let object = objects.shift();
    scene.remove(object);

    removeFromDraggable(object);

    socket.emit("object_delete", {
        objectUUID: object.userData.id
    });

    render();
}

function onWindowResize() {

    camera.aspect = window.innerWidth * canvasWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth * canvasWidth, window.innerHeight);

    render();

}

function sendPosition(event) {
    socket.emit("object_transform", {
        position: {
            x: event.object.position.x,
            y: event.object.position.y,
            z: -1
        },
        objectUUID: event.object.userData.id
    });
}

function render() {

    renderer.render(scene, camera);

}

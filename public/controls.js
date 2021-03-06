import * as THREE from './libs/three/three.module.js';
import {DragControls} from './libs/three/jsm/DragControls.js';
import {io} from "socket.io-client";
import SpriteText from './libs/Spritetext.js';

let canvas;
let camera, scene, renderer;
let controls, group;
let socket;

let addArrowButton = document.getElementById("add_arrow");
let addConeButton = document.getElementById("add_cone");
let addTextButton = document.getElementById("add_text");
let textInput = document.getElementById("text_input_sprite");
let removeButton = document.getElementById("remove_object");

addArrowButton.addEventListener("click", addArrow);
addConeButton.addEventListener("click", addCone);
addTextButton.addEventListener("click", addText);
removeButton.addEventListener("click", removeObject);

const objects = [];

init();

function init() {

    canvas = document.getElementById('canvas');

    camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.01, 20);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    scene.add(new THREE.AmbientLight(0x505050));

    // light.castShadow = true;
    // light.shadow.camera.near = 1000;
    // light.shadow.camera.far = 4000;
    // light.shadow.mapSize.width = 1024;
    // light.shadow.mapSize.height = 1024;

    group = new THREE.Group();
    scene.add(group);

    renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const texture = new THREE.TextureLoader().load('assets/screenshot2.png',

        // onLoad callback
        function (texture) {
            let planeGeo = new THREE.PlaneGeometry(2 * 0.428571429, 2, 2, 2);
            let planeMat = new THREE.MeshBasicMaterial({map: texture});
            let planeMesh = new THREE.Mesh(planeGeo, planeMat);
            planeMesh.position.set(0, 0, -1.483);
            scene.add(planeMesh);
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
    document.addEventListener('click', onClick);

    render();

    setupSocket();
}

function setupSocket() {
    socket = io();

    socket.on("connect", () => {
        console.log("Connected to socket");

        socket.on("image", data => {
            console.log("image", data);
        })
    });
}

function createConeMesh(radiusTop, height, material) {
    let cone = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, 0, height, 5, 1), material);

    cone.userData.type = "cone";

    return cone;
}

function createArrowMesh(length, material) {
    let cone = new THREE.Mesh(
        new THREE.CylinderGeometry(length * 0.1, 0, length * 0.2, 5, 1),
        material
    );

    let line = new THREE.Mesh(
        new THREE.CylinderGeometry(length * 0.01, length * 0.01, length - length * 0.2, 5, 2),
        material
    );

    cone.position.set(0, -(length - length * 0.2) / 2, 0);
    line.position.set(0, length * 0.1, 0);

    let object3D = new THREE.Object3D();
    object3D.add(cone);
    object3D.add(line);

    object3D.userData.type = "cone";

    return object3D;
}

function createText(text, textHeight, color) {
    let spriteText = new SpriteText(text, textHeight, color);
    spriteText.backgroundColor = "white";
    // spriteText.borderWidth = 0.01;
    // spriteText.borderColor = color;

    spriteText.userData.type = "text";

    return spriteText;
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
}

function removeObject() {
    let object = objects.shift();
    scene.remove(object);

    removeFromDraggable(object);

    socket.emit("object_delete", {
        objectUUID: object.userData.id
    });
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

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

function onClick(event) {

    event.preventDefault();

    render();
}

function render() {

    renderer.render(scene, camera);

}

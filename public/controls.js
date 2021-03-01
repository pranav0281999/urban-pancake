import * as THREE from './libs/three/three.module.js';
import {DragControls} from './libs/three/jsm/DragControls.js';
import { io } from "socket.io-client";

let canvas;
let camera, scene, renderer;
let controls, group;
let socket;

let addArrowButton = document.getElementById("add_arrow");
let addConeButton = document.getElementById("add_cone");
let removeButton = document.getElementById("remove_object");

addArrowButton.addEventListener("click", addArrow);
addConeButton.addEventListener("click", addCone);
removeButton.addEventListener("click", removeObject);

const objects = [];

const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();

init();

function init() {

    canvas = document.getElementById('canvas');

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.z = 1000;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    scene.add(new THREE.AmbientLight(0x505050));

    const light = new THREE.SpotLight(0xffffff, 1.5);
    light.position.set(0, 500, 2000);
    light.angle = Math.PI / 9;

    light.castShadow = true;
    light.shadow.camera.near = 1000;
    light.shadow.camera.far = 4000;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    scene.add(light);

    group = new THREE.Group();
    scene.add(group);

    renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

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
    });
}

function createConeMesh(radiusTop, height, material) {
    return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, 0, height, 5, 1), material);
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

    return object3D;
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
    let cone = createConeMesh(40, 80, new THREE.MeshNormalMaterial());
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

function addArrow() {
    let arrow = createArrowMesh(80, new THREE.MeshNormalMaterial());
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
            x: event.object.position.x / 16666,
            y: event.object.position.y / 16666,
            z: -0.5
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

import * as THREE from './libs/three/three.module.js';
import {OrbitControls} from './libs/three/jsm/OrbitControls.js';
import {GLTFLoader} from './libs/three/jsm/GLTFLoader.js';
import {Stats} from './libs/stats.module.js';
import {CanvasUI} from './libs/CanvasUI.js'
import {ARButton} from './libs/ARButton.js';
import {LoadingBar} from './libs/LoadingBar.js';
import {Player} from './libs/Player.js';
import {ControllerGestures} from './libs/ControllerGestures.js';

class App {
    constructor() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        this.clock = new THREE.Clock();

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 20);

        this.scene = new THREE.Scene();

        this.scene.add(this.camera);

        this.scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

        const light = new THREE.DirectionalLight(0xffffff);
        light.position.set(1, 1, 1).normalize();
        this.scene.add(light);

        this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, 3.5, 0);
        this.controls.update();

        this.stats = new Stats();
        document.body.appendChild(this.stats.dom);

        this.origin = new THREE.Vector3();
        this.euler = new THREE.Euler();
        this.quaternion = new THREE.Quaternion();

        this.initScene();
        this.setupXR();

        window.addEventListener('resize', this.resize.bind(this));

        this.objects = [];

        this.setupSocket();
    }

    createConeMesh(radiusTop, height, material) {
        return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, 0, height, 5, 1), material);
    }

    createArrowMesh(length, material) {
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

    setupSocket = () => {
        this.socket = io();

        this.socket.on("connect", () => {
            console.log("Connected to socket");
        });

        this.socket.on("object_create", (data) => {
            switch (data.type) {
                case "cone":
                    let cone = this.createConeMesh(0.03, 0.06, new THREE.MeshNormalMaterial());
                    cone.userData.id = data.objectUUID;
                    cone.position.set(0, 0, -0.5);

                    this.scene.add(cone);

                    this.objects.push(cone);

                    break;
                case "arrow":
                    let arrow = this.createArrowMesh(0.06, new THREE.MeshNormalMaterial());
                    arrow.userData.id = data.objectUUID;
                    arrow.position.set(0, 0, -0.5);

                    this.scene.add(arrow);

                    this.objects.push(arrow);

                    break;
                default:
                    break;
            }
        });

        this.socket.on("object_transform", (data) => {
            const index = this.objects.findIndex((object) => {
                return object.userData.id === data.objectUUID;
            });

            this.objects[index].position.set(data.position.x, data.position.y, data.position.z);
        });

        this.socket.on("object_delete", (data) => {
            const index = this.objects.findIndex((object) => {
                return object.userData.id === data.objectUUID;
            });

            this.scene.remove(this.objects[index]);

            this.objects.splice(index, 1);
        });
    }

    initScene() {
        const geometry = new THREE.BoxBufferGeometry(0.06, 0.06, 0.06);
        const material = new THREE.MeshPhongMaterial({color: 0xffffff * Math.random()});
        this.GeoMesh = new THREE.Mesh(geometry, material);
        this.GeoMesh.visible = false;
        this.loadingBar = new LoadingBar();

        this.assetsPath = './assets/';
        const loader = new GLTFLoader().setPath(this.assetsPath);
        const self = this;

        // Load a GLTF resource
        loader.load(
            // resource URL
            `knight2.glb`,
            // called when the resource is loaded
            function (gltf) {
                const object = gltf.scene.children[5];

                object.traverse(function (child) {
                    if (child.isMesh) {
                        child.material.metalness = 0;
                        child.material.roughness = 1;
                    }
                });

                const options = {
                    object: object,
                    speed: 0.5,
                    animations: gltf.animations,
                    clip: gltf.animations[0],
                    app: self,
                    name: 'knight',
                    npc: false
                };

                self.knight = new Player(options);
                self.knight.object.visible = false;

                self.knight.action = 'Dance';
                const scale = 0.003;
                self.knight.object.scale.set(scale, scale, scale);

                self.loadingBar.visible = false;
            },
            // called while loading is progressing
            function (xhr) {

                self.loadingBar.progress = (xhr.loaded / xhr.total);

            },
            // called when loading has errors
            function (error) {

                console.log('An error happened');

            }
        );

        this.createUI();
    }

    createUI() {

        const config = {
            panelSize: {width: 0.15, height: 0.038},
            height: 128,
            info: {type: "text"},
        }
        const content = {
            info: "Debug info",
        }

        const ui = new CanvasUI(content, config);

        this.ui = ui;
    }

    setupXR() {
        this.renderer.xr.enabled = true;

        const self = this;
        let controller, controller1;

        function onSessionStart() {
            self.ui.mesh.position.set(0, -0.15, -0.3);
            self.camera.add(self.ui.mesh);
        }

        function onSessionEnd() {
            self.camera.remove(self.ui.mesh);
        }

        const btn = new ARButton(this.renderer, {onSessionStart, onSessionEnd});//, sessionInit: { optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } } } );

        this.gestures = new ControllerGestures(this.renderer);
        this.gestures.addEventListener('tap', (ev) => {
            //console.log( 'tap' );

            self.ui.updateElement('info', 'tap');
            if (!self.GeoMesh.visible) {
                self.GeoMesh.visible = true;
                self.GeoMesh.position.set(0, -0.3, -0.5).add(ev.position);
                self.scene.add(self.GeoMesh);
            }
        });
        this.gestures.addEventListener('doubletap', (ev) => {
            //console.log( 'doubletap');
            self.ui.updateElement('info', 'doubletap');
        });
        this.gestures.addEventListener('press', (ev) => {
            //console.log( 'press' );
            self.ui.updateElement('info', 'press');
        });
        this.gestures.addEventListener('pan', (ev) => {
            //console.log( ev );
            if (ev.initialise !== undefined) {
                self.startPosition = self.GeoMesh.position.clone();
            } else {
                const pos = self.startPosition.clone().add(ev.delta.multiplyScalar(3));
                self.GeoMesh.position.copy(pos);
                self.ui.updateElement('info', `pan x:${ev.delta.x.toFixed(3)}, y:${ev.delta.y.toFixed(3)}, x:${ev.delta.z.toFixed(3)}`);
            }
        });
        this.gestures.addEventListener('swipe', (ev) => {
            //console.log( ev );
            self.ui.updateElement('info', `swipe ${ev.direction}`);
            if (self.GeoMesh.visible) {
                self.GeoMesh.visible = false;
                self.scene.remove(self.GeoMesh);
            }
        });
        this.gestures.addEventListener('pinch', (ev) => {
            //console.log( ev );
            if (ev.initialise !== undefined) {
                self.startScale = self.knight.object.scale.clone();
            } else {
                const scale = self.startScale.clone().multiplyScalar(ev.scale);
                self.knight.object.scale.copy(scale);
                self.ui.updateElement('info', `pinch delta:${ev.delta.toFixed(3)} scale:${ev.scale.toFixed(2)}`);
            }
        });
        this.gestures.addEventListener('rotate', (ev) => {
            //      sconsole.log( ev );
            if (ev.initialise !== undefined) {
                self.startQuaternion = self.knight.object.quaternion.clone();
            } else {
                self.knight.object.quaternion.copy(self.startQuaternion);
                self.knight.object.rotateY(ev.theta);
                self.ui.updateElement('info', `rotate ${ev.theta.toFixed(3)}`);
            }
        });

        this.renderer.setAnimationLoop(this.render.bind(this));
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        const dt = this.clock.getDelta();
        this.stats.update();
        if (this.renderer.xr.isPresenting) {
            this.gestures.update();
            this.ui.update();
        }
        if (this.knight !== undefined) this.knight.update(dt);
        this.renderer.render(this.scene, this.camera);
    }
}

export {App};

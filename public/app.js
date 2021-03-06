import * as THREE from './libs/three/three.module.js';
import {OrbitControls} from './libs/three/jsm/OrbitControls.js';
import {GLTFLoader} from './libs/three/jsm/GLTFLoader.js';
import {Stats} from './libs/stats.module.js';
import {CanvasUI} from './libs/CanvasUI.js'
import {ARButton} from './libs/ARButton.js';
import {LoadingBar} from './libs/LoadingBar.js';
import {Player} from './libs/Player.js';
import {ControllerGestures} from './libs/ControllerGestures.js';
import SpriteText from './libs/Spritetext.js';

class App {
    constructor() {
        const container = document.createElement('div');
        document.body.appendChild(container);

        this.clock = new THREE.Clock();

        this.camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.01, 20);

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
        this.controls.target.set(0, 0, 0);
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

        this.imageCapture = null;

        // this.takeSnapshot();
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

    createText = (text, textHeight, color) => {
        let spriteText = new SpriteText(text, textHeight, color);
        spriteText.backgroundColor = "white";
        // spriteText.borderWidth = 0.01;
        // spriteText.borderColor = color;

        spriteText.userData.type = "text";

        return spriteText;
    }

    setupSocket = () => {
        this.socket = io();

        this.socket.on("connect", () => {
            console.log("Connected to socket");
        });

        this.socket.on("object_create", (data) => {
            switch (data.type) {
                case "cone":
                    let cone = this.createConeMesh(0.05, 0.1, new THREE.MeshNormalMaterial());
                    cone.userData.id = data.objectUUID;
                    cone.position.set(0, 0, -1);

                    this.scene.add(cone);

                    this.objects.push(cone);

                    break;
                case "arrow":
                    let arrow = this.createArrowMesh(0.06, new THREE.MeshNormalMaterial());
                    arrow.userData.id = data.objectUUID;
                    arrow.position.set(0, 0, -1);

                    this.scene.add(arrow);

                    this.objects.push(arrow);

                    break;
                case "text":
                    let text = this.createText(data.text, 0.03, "red");
                    text.userData.id = data.objectUUID;
                    text.position.set(0, 0, -1);

                    this.scene.add(text);

                    this.objects.push(text);

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

    getFOV = () => {
        this.renderer.xr.getSession().requestReferenceSpace("viewer").then(referenceSpace => {
            this.renderer.xr.getSession().requestAnimationFrame((time, frame) => {
                let pose = frame.getViewerPose(referenceSpace);

                if (pose.views.length > 0) {
                    let p = pose.views[0];

                    const fov = 2.0 * Math.atan(1.0 / p.projectionMatrix[5]) * 180.0 / Math.PI;

                    this.socket.emit("fov", {
                        fov: fov
                    });
                }
            });
        });
    }

    initScene() {
        // const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
        // const material = new THREE.MeshPhongMaterial({color: 0xffffff * Math.random()});
        // this.GeoMesh = new THREE.AxisHelper(1);
        // this.GeoMesh.visible = false;
        this.createUI();
    }

    createUI() {

        const config = {
            panelSize: {width: 0.15, height: 0.038},
            height: 128,
            info: {type: "text"},
            renderer: this.renderer
        }
        const content = {
            info: "Debug info"
        }

        const ui = new CanvasUI(content, config);

        this.ui = ui;
    }

    setupXR() {
        this.renderer.xr.enabled = true;

        const self = this;

        let onSessionStart = () => {
            self.ui.mesh.position.set(0, -0.15, -0.3);
            self.camera.add(self.ui.mesh);

            this.getFOV();
        }

        let onSessionEnd = () => {
            self.camera.remove(self.ui.mesh);
        }

        const btn = new ARButton(this.renderer, {onSessionStart, onSessionEnd});//, sessionInit: { optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } } } );

        this.gestures = new ControllerGestures(this.renderer);
        this.gestures.addEventListener('tap', (ev) => {
            //console.log( 'tap' );

            self.ui.updateElement('info', 'tap');
            // if (!self.GeoMesh.visible) {
            //     self.GeoMesh.visible = true;
            //     self.GeoMesh.position.set(0, 0, -1).add(ev.position);
            //     self.scene.add(self.GeoMesh);
            // }
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
            // if (ev.initialise !== undefined) {
            //     self.startPosition = self.GeoMesh.position.clone();
            // } else {
            //     const pos = self.startPosition.clone().add(ev.delta.multiplyScalar(3));
            //     self.GeoMesh.position.copy(pos);
            //     self.ui.updateElement('info', `pan x:${ev.delta.x.toFixed(3)}, y:${ev.delta.y.toFixed(3)}, x:${ev.delta.z.toFixed(3)}`);
            // }
        });
        this.gestures.addEventListener('swipe', (ev) => {
            //console.log( ev );
            self.ui.updateElement('info', `swipe ${ev.direction}`);
            // if (self.GeoMesh.visible) {
            //     self.GeoMesh.visible = false;
            //     self.scene.remove(self.GeoMesh);
            // }
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

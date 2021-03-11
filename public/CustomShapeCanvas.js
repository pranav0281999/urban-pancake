import * as THREE from './libs/three/three.module.js';

class CustomShapeCanvas {
    constructor() {
        this.canvasWidth = 0.2;
        this.canvasHeight = 0.5;

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 20);
        this.canvas = document.getElementById('canvas_draw_custom');
        this.renderer = new THREE.WebGLRenderer({canvas: this.canvas});
        this.mouseDown = false;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.points = [];
    }

    init = () => {
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.updateCanvasCameraSize();

        window.addEventListener('resize', this.updateCanvasCameraSize);
        this.canvas.addEventListener('click', this.onClick);
        this.canvas.addEventListener("mousemove", this.onMouseMove);
        this.canvas.addEventListener("mousedown", () => {
            this.mouseDown = true;
        });
        this.canvas.addEventListener("mouseup", () => {
            this.mouseDown = false;
        });
        this.canvas.addEventListener("mouseleave", () => {
            this.mouseDown = false;
        });

        this.planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({color: "pink"}));
        this.planeMesh.position.set(0, 0, -1);
        this.scene.add(this.planeMesh);

        this.render();
    }

    clearCanvas = () => {
        this.points = [];

        for (let i = this.scene.children.length - 1; i > 0; i--) {
            this.scene.remove(this.scene.children[i]);
        }

        this.render();
    }

    onClick = (event) => {
        event.preventDefault();

        this.render();
    }

    onMouseMove = (event) => {
        if (this.mouseDown) {
            this.mouse.x = ((event.clientX + (window.pageXOffset - this.canvas.offsetLeft)) / this.canvas.width) * 2 - 1;
            this.mouse.y = -((event.clientY + (window.pageYOffset - this.canvas.offsetTop)) / this.canvas.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObject(this.planeMesh);

            for (let i = 0; i < intersects.length; i++) {
                this.points.push(new THREE.Vector3(intersects[i].point.x, intersects[i].point.y, 0));

                let sphere = new THREE.Mesh(new THREE.SphereBufferGeometry(0.01, 5, 5), new THREE.MeshNormalMaterial());
                sphere.position.set(intersects[i].point.x, intersects[i].point.y, -1);
                this.scene.add(sphere);
            }

            this.render();
        }
    }

    updateCanvasCameraSize = () => {
        this.renderer.setSize(window.innerWidth * this.canvasWidth, window.innerHeight * this.canvasHeight);

        this.camera.left = -(this.canvas.clientWidth) / (this.canvas.clientHeight) * 0.5;
        this.camera.right = (this.canvas.clientWidth) / (this.canvas.clientHeight) * 0.5;
        this.camera.updateProjectionMatrix();

        this.render();
    }

    getPoints = () => {
        return this.points;
    }

    render = () => {
        this.renderer.render(this.scene, this.camera);
    }
}

export {CustomShapeCanvas};

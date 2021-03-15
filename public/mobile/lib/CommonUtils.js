import * as THREE from "./three/three.module.js";
import {BufferGeometryUtils} from "./three/jsm/BufferGeometryUtils.js";
import SpriteText from "./Spritetext.js";

function getCylinderLength(vec1, vec2) {
    return Math.sqrt(Math.pow(vec1.x - vec2.x, 2) + Math.pow(vec1.y - vec2.y, 2) + Math.pow(vec1.z - vec2.z, 2));
}

function getCylinderCenter(vec1, vec2) {
    let cylCenter = new THREE.Vector3();
    cylCenter.addVectors(vec1, vec2);
    cylCenter.divideScalar(2);
    return cylCenter;
}

function getCylinderAxis(vec1, vec2) {
    let cylAxis = new THREE.Vector3();
    cylAxis.subVectors(vec1, vec2);
    return cylAxis;
}

function createCylinderFromEnds(radiusTop, radiusBottom, top, bottom, segmentsWidth, openEnded) {
    segmentsWidth = (segmentsWidth === undefined) ? 32 : segmentsWidth;
    openEnded = (openEnded === undefined) ? false : openEnded;

    let length = getCylinderLength(top, bottom);
    let cylAxis = getCylinderAxis(top, bottom);
    let center = getCylinderCenter(top, bottom);

    let cylGeom = new THREE.CylinderBufferGeometry(radiusTop, radiusBottom, length, segmentsWidth, 1, openEnded);

    makeLengthAngleAxisTransform(cylGeom, cylAxis, center);

    return cylGeom;
}

function makeLengthAngleAxisTransform(cyl, cylAxis, center) {
    let yAxis = new THREE.Vector3(0, 1, 0);
    cylAxis.normalize();
    let rotationAxis = new THREE.Vector3();
    rotationAxis.crossVectors(cylAxis, yAxis);
    if (rotationAxis.length() < 0.000001) {
        rotationAxis.set(1, 0, 0);
    }
    rotationAxis.normalize();

    let theta = -Math.acos(cylAxis.dot(yAxis));
    let rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationAxis(rotationAxis, theta);

    const eular = new THREE.Euler();
    eular.setFromRotationMatrix(rotMatrix);

    cyl.rotateX(eular.x);
    cyl.rotateY(eular.y);
    cyl.rotateZ(eular.z);

    cyl.translate(center.x, center.y, center.z);
}

function createConeMesh(radiusTop, height, material) {
    let cone = new THREE.Mesh(new THREE.CylinderBufferGeometry(radiusTop, 0, height, 5, 1), material);

    cone.userData.type = "cone";

    return cone;
}

function createCustomShape(points, shapeRadius, material) {
    const cylinerGeometries = [];
    for (let i = 0; i < points.length; i += 1) {
        let cylGeo = createCylinderFromEnds(shapeRadius, shapeRadius, points[i].pointOne, points[i].pointTwo, 5, false);
        cylinerGeometries.push(cylGeo);

        let sphereOne = new THREE.SphereBufferGeometry(shapeRadius, 5, 5);
        sphereOne.translate(points[i].pointOne.x, points[i].pointOne.y, points[i].pointOne.z);
        cylinerGeometries.push(sphereOne);

        let sphereTwo = new THREE.SphereBufferGeometry(shapeRadius, 5, 5);
        sphereTwo.translate(points[i].pointTwo.x, points[i].pointTwo.y, points[i].pointTwo.z);
        cylinerGeometries.push(sphereTwo);
    }

    let object = BufferGeometryUtils.mergeBufferGeometries(cylinerGeometries, false);

    return new THREE.Mesh(object, material);
}

function createArrowMesh(length, material) {
    let coneGeometry = new THREE.CylinderBufferGeometry(length * 0.1, 0, length * 0.2, 5, 1);

    let lineGeometry = new THREE.CylinderBufferGeometry(length * 0.01, length * 0.01, length * 0.8, 5, 2);

    coneGeometry.translate(0, -(length * 0.8) / 2, 0);
    lineGeometry.translate(0, length * 0.1, 0);

    let object = BufferGeometryUtils.mergeBufferGeometries([coneGeometry, lineGeometry], false);

    let arrow = new THREE.Mesh(object, material);

    arrow.userData.type = "arrow";

    return arrow;
}

function createText(text, textHeight, color) {
    let spriteText = new SpriteText(text, textHeight, color);
    spriteText.backgroundColor = "white";

    spriteText.userData.type = "text";

    return spriteText;
}

export {createCustomShape, createText, createConeMesh, createArrowMesh, createCylinderFromEnds};

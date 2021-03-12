import * as THREE from "./libs/three/three.module.js";

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

    var length = getCylinderLength(top, bottom);
    var cylAxis = getCylinderAxis(top, bottom);
    var center = getCylinderCenter(top, bottom);

    var cylGeom = new THREE.CylinderBufferGeometry(radiusTop, radiusBottom, length, segmentsWidth, 1, openEnded);

    makeLengthAngleAxisTransform(cylGeom, cylAxis, center);

    return cylGeom;
}

function makeLengthAngleAxisTransform(cyl, cylAxis, center) {
    var yAxis = new THREE.Vector3(0, 1, 0);
    cylAxis.normalize();
    var rotationAxis = new THREE.Vector3();
    rotationAxis.crossVectors(cylAxis, yAxis);
    if (rotationAxis.length() < 0.000001) {
        rotationAxis.set(1, 0, 0);
    }
    rotationAxis.normalize();

    var theta = -Math.acos(cylAxis.dot(yAxis));
    var rotMatrix = new THREE.Matrix4();
    rotMatrix.makeRotationAxis(rotationAxis, theta);

    const eular = new THREE.Euler();
    eular.setFromRotationMatrix(rotMatrix);

    cyl.rotateX(eular.x);
    cyl.rotateY(eular.y);
    cyl.rotateZ(eular.z);

    cyl.translate(center.x, center.y, center.z);
}

export {createCylinderFromEnds};

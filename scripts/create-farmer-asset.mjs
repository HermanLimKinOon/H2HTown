import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mkdir, writeFile } from 'node:fs/promises';

// GLTFExporter uses FileReader for its binary container in browser and Node.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.(); });
  }
};

const farmer = new THREE.Group();
farmer.name = 'H2H_Farmer';
const materials = Object.fromEntries(Object.entries({
  skin: '#cb9065', shirt: '#f4e7c6', denim: '#386a93', darkDenim: '#2e526f',
  straw: '#e9bd63', band: '#785135', leather: '#68452f', sole: '#382c28',
  gold: '#d8ad51', hair: '#513727', eyes: '#252a2d', white: '#fff5df',
}).map(([name, color]) => [name, new THREE.MeshStandardMaterial({ name, color, roughness: 0.9 })]));

function group(name, parent, x, y, z) {
  const result = new THREE.Group(); result.name = name;
  result.position.set(x, y, z); parent.add(result); return result;
}
function mesh(name, parent, geometry, material, x = 0, y = 0, z = 0) {
  const result = new THREE.Mesh(geometry, materials[material]); result.name = name;
  result.position.set(x, y, z); result.castShadow = true; result.receiveShadow = true;
  parent.add(result); return result;
}
const box = (name, parent, size, mat, ...pos) => mesh(name, parent, new THREE.BoxGeometry(...size), mat, ...pos);
const sphere = (name, parent, size, mat, ...pos) => mesh(name, parent, new THREE.SphereGeometry(size, 12, 8), mat, ...pos);
const cylinder = (name, parent, sizes, mat, ...pos) => mesh(name, parent, new THREE.CylinderGeometry(...sizes, 12), mat, ...pos);

// Y-up, facing +Z; boots rest at Y=0. Limb groups provide reusable pivots.
const torso = group('Torso', farmer, 0, 1.03, 0);
box('Cream_Shirt', torso, [0.63, 0.63, 0.36], 'shirt');
box('Overall_Waist', torso, [0.65, 0.22, 0.39], 'denim', 0, -0.25, 0);
box('Overall_Bib', torso, [0.39, 0.39, 0.035], 'denim', 0, -0.02, 0.197);
box('Bib_Pocket', torso, [0.22, 0.14, 0.025], 'darkDenim', 0, -0.06, 0.225);
for (const side of [-1, 1]) {
  const label = side < 0 ? 'Left' : 'Right';
  box(`${label}_Strap`, torso, [0.075, 0.53, 0.04], 'denim', side * 0.18, 0.07, 0.2);
  sphere(`${label}_Buckle`, torso, 0.034, 'gold', side * 0.18, 0.14, 0.232);
  const arm = group(`${label}_Arm_Pivot`, farmer, side * 0.37, 1.27, 0);
  arm.rotation.z = side * 0.15;
  cylinder(`${label}_Sleeve`, arm, [0.145, 0.13, 0.25], 'shirt', 0, -0.08, 0);
  cylinder(`${label}_Forearm`, arm, [0.105, 0.095, 0.31], 'skin', 0, -0.33, 0);
  const hand = sphere(`${label}_Hand`, arm, 0.108, 'skin', 0, -0.52, 0.015);
  hand.scale.set(0.83, 1.08, 0.9);
  group(`${label}_Tool_Socket`, arm, 0, -0.54, 0.09);
  const leg = group(`${label}_Leg_Pivot`, farmer, side * 0.18, 0.77, 0);
  cylinder(`${label}_Trouser`, leg, [0.15, 0.13, 0.55], 'denim', 0, -0.25, 0);
  box(`${label}_Boot`, leg, [0.28, 0.23, 0.43], 'leather', 0, -0.61, 0.065);
  box(`${label}_Boot_Sole`, leg, [0.29, 0.055, 0.44], 'sole', 0, -0.7425, 0.065);
}
cylinder('Neck', farmer, [0.12, 0.13, 0.16], 'skin', 0, 1.39, 0);
const head = group('Head_Pivot', farmer, 0, 1.65, 0);
const face = sphere('Face', head, 0.285, 'skin'); face.scale.set(0.94, 1.05, 0.9);
for (const side of [-1, 1]) {
  sphere(`Ear_${side}`, head, 0.065, 'skin', side * 0.26, -0.02, 0);
  const eye = sphere(`Eye_${side}`, head, 0.026, 'eyes', side * 0.095, 0.02, 0.234);
  eye.scale.y = 1.25;
  sphere(`Eye_Glint_${side}`, head, 0.008, 'white', side * 0.095 - 0.006, 0.029, 0.254);
  box(`Eyebrow_${side}`, head, [0.068, 0.018, 0.018], 'hair', side * 0.095, 0.08, 0.235);
}
sphere('Nose', head, 0.047, 'skin', 0, -0.035, 0.253);
const smile = mesh('Smile', head, new THREE.TorusGeometry(0.061, 0.009, 5, 12, Math.PI), 'hair', 0, -0.09, 0.237);
smile.rotation.z = Math.PI;
cylinder('Straw_Hat_Brim', head, [0.43, 0.43, 0.045], 'straw', 0, 0.23, 0);
cylinder('Straw_Hat_Crown', head, [0.245, 0.29, 0.23], 'straw', 0, 0.355, 0);
cylinder('Hat_Brown_Band', head, [0.282, 0.292, 0.055], 'band', 0, 0.282, 0);

farmer.userData = {
  description: 'Original H2H low-poly farmer. Y up, +Z forward, metre units.',
  animation: 'Named transform pivots; not a skinned skeletal rig.',
};
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(farmer, { binary: true });
const output = new URL('../public/game3d/farmer.glb', import.meta.url);
await mkdir(new URL('../public/game3d/', import.meta.url), { recursive: true });
await writeFile(output, Buffer.from(glb));
console.log(`Exported ${output.pathname} (${glb.byteLength} bytes)`);

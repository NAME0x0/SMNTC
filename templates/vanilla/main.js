import * as THREE from 'three';
import { SMNTCKernel } from 'smntc';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 4);

const geometry = new THREE.PlaneGeometry(4, 4, 128, 128);
const mesh = new THREE.Mesh(geometry);
mesh.rotation.x = -Math.PI / 2;
scene.add(mesh);

const kernel = new SMNTCKernel({
  surface: 'fluid',
  vibe: 'calm',
  palette: 'arctic',
  reactivity: 'magnetic',
  fidelity: 'medium',
  wireframe: true,
});

kernel.apply(mesh, camera, renderer.domElement);
kernel.start(renderer, scene, camera);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resize);
resize();

const buttons = document.querySelectorAll('button[data-vibe]');
buttons.forEach((button) => {
  button.addEventListener('click', () => {
    buttons.forEach((b) => b.classList.remove('active'));
    button.classList.add('active');
    kernel.setVibe(button.dataset.vibe);
  });
});

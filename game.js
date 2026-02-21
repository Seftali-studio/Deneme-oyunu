import * as THREE from 'three';

let gameStarted = false, isPaused = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6eb1ff); // Gökyüzü mavisi
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Gölgeler aktif
document.body.appendChild(renderer.domElement);

// --- IŞIKLANDIRMA (Gerçekçi Gölgeler İçin) ---
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(20, 50, 20);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x909090));

// --- KALİTELİ ÇİMEN ZEMİN ---
function createRealisticGrass() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e3d11'; ctx.fillRect(0,0,1024,1024);
    for(let i=0; i<40000; i++) {
        ctx.fillStyle = `rgb(${10+Math.random()*20}, ${80+Math.random()*100}, 10)`;
        ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 6);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    return tex;
}
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 150),
    new THREE.MeshStandardMaterial

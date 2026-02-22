import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

let gameStarted = false, isPaused = true, currentLang = 'tr';
const clock = new THREE.Clock();
let mixer, playerModel;

const texts = {
    tr: { title: "3D DENEME OYUNU", start: "MAÇA BAŞLA", char: "Karakter: Hazır", pause: "OYUN DURDURULDU", resume: "DEVAM ET", exit: "ANA MENÜ" },
    en: { title: "3D TRIAL GAME", start: "START MATCH", char: "Hero: Ready", pause: "GAME PAUSED", resume: "CONTINUE", exit: "MAIN MENU" }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- IŞIKLANDIRMA ---
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(10, 50, 10);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// --- KALİTELİ ÇİMEN ZEMİN ---
function createGrassTex() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e3d11'; ctx.fillRect(0,0,512,512);
    for(let i=0; i<15000; i++) {
        ctx.fillStyle = `rgb(${10+Math.random()*20}, ${70+Math.random()*80}, 10)`;
        ctx.fillRect(Math.random()*512, Math.random()*512, 2, 5);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(15, 15);
    return tex;
}
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: createGrassTex() }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// --- GÖL ---
const waterMat = new THREE.MeshStandardMaterial({ color: 0x0044ff, transparent: true, opacity: 0.6 });
const lake = new THREE.Mesh(new THREE.CircleGeometry(15, 64), waterMat);
lake.rotation.x = -Math.PI / 2;
lake.position.set(20, 0.05, 20);
scene.add(lake);

// --- AĞAÇLAR ---
const obstacles = [];
function createTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3), new THREE.MeshStandardMaterial({color: 0x3d2b1f}));
    trunk.position.y = 1.5; group.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({color: 0x134d0b});
    for(let i=0; i<3; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1.5 - (i*0.3), 12, 12), leafMat);
        leaf.position.y = 3 + (i*1.2); group.add(leaf);
    }
    group.position.set(x, 0, z);
    scene.add(group);
    obstacles.push(new THREE.Box3().setFromObject(group));
}
for(let i=0; i<15; i++) createTree(Math.random()*100-50, Math.random()*100-50);

// --- KARAKTER YÜKLEME ---
const playerGroup = new THREE.Group();
scene.add(playerGroup);

const loader = new GLTFLoader();
// DİKKAT: 'karakter.glb' ismini GitHub'daki dosyanla birebir aynı yap!
loader.load('karakter.glb', (gltf) => {
    playerModel = gltf.scene;
    playerModel.scale.set(5, 5, 5); // Model küçükse burayı büyüt
    playerModel.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    playerGroup.add(playerModel);
    
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(playerModel);
        mixer.clipAction(gltf.animations[0]).play();
    }
}, undefined, (err) => {
    // Eğer yüklenemezse eski kutu karakteri geri getir (Oyun çökmesin)
    const box = new THREE.Mesh(new THREE.BoxGeometry(1,2,1), new THREE.MeshStandardMaterial({color: 0x0066ff}));
    box.position.y = 1;
    playerGroup.add(box);
    console.error("Model bulunamadı, dosya adını kontrol et!");
});

// --- MENÜ VE KONTROLLER ---
window.toggleLang = () => {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    document.getElementById('main-title').innerText = texts[currentLang].title;
    document.getElementById('start-btn').innerText = texts[currentLang].start;
    document.getElementById('char-text').innerText = texts[currentLang].char;
    document.getElementById('pause-title').innerText = texts[currentLang].pause;
    document.getElementById('resume-btn').innerText = texts[currentLang].resume;
    document.getElementById('exit-btn').innerText = texts[currentLang].exit;
};

window.startGame = () => {
    isPaused = false; gameStarted = true;
    document.getElementById('ui-wrapper').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
};

const keys = {};
let yaw = 0, pitch = 0;
window.addEventListener('keydown', (e) => {
    if(e.code === 'Escape' && gameStarted) {
        isPaused = true;
        document.getElementById('pause-overlay').style.display = 'flex';
        document.getElementById('crosshair').style.display = 'none';
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => keys[e.code] = false);

document.addEventListener('mousemove', (e) => {
    if(!isPaused && (e.buttons === 1 || document.pointerLockElement)) {
        yaw -= e.movementX * 0.005;
        pitch = Math.max(-0.6, Math.min(0.4, pitch - e.movementY * 0.005));
    }
});

function update() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (isPaused) {
        playerGroup.rotation.y += 0.01;
        camera.position.set(0, 4, 12);
        camera.lookAt(0, 2, 0);
    } else {
        const oldPos = playerGroup.position.clone();
        playerGroup.rotation.y = yaw;
        let speed = 0.2;

        // Su Mekaniği
        if(playerGroup.position.distanceTo(new THREE.Vector3(20, 0, 20)) < 15) {
            speed = 0.08; playerGroup.position.y = -0.5;
        } else { playerGroup.position.y = 0; }

        if(keys['KeyW']) playerGroup.translateZ(-speed);
        if(keys['KeyS']) playerGroup.translateZ(speed);
        if(keys['KeyA']) playerGroup.translateX(-speed);
        if(keys['KeyD']) playerGroup.translateX(speed);

        // Çarpışma
        const pBox = new THREE.Box3().setFromObject(playerGroup);
        obstacles.forEach(b => { if(pBox.intersectsBox(b)) playerGroup.position.copy(oldPos); });

        const dist = 10;
        camera.position.set(
            playerGroup.position.x + Math.sin(yaw)*Math.cos(pitch)*dist,
            playerGroup.position.y + 4 + Math.sin(pitch)*dist,
            playerGroup.position.z + Math.cos(yaw)*Math.cos(pitch)*dist
        );
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 2, playerGroup.position.z);
    }
}

function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
animate();

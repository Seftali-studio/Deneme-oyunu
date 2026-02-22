import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

// --- AYARLAR VE DEĞİŞKENLER ---
let gameStarted = false, isPaused = true, currentLang = 'tr';
const clock = new THREE.Clock();
let mixer, playerModel; // Animasyon ve model için

const texts = {
    tr: { title: "3D DENEME OYUNU", start: "MAÇA BAŞLA", char: "Karakter: Yüklendi", pause: "OYUN DURDURULDU", resume: "DEVAM ET", exit: "ANA MENÜ" },
    en: { title: "3D TRIAL GAME", start: "START MATCH", char: "Hero: Loaded", pause: "GAME PAUSED", resume: "CONTINUE", exit: "MAIN MENU" }
};

// --- SAHNE VE RENDERER ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6eb1ff);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- IŞIKLANDIRMA ---
const sun = new THREE.DirectionalLight(0xffffff, 2);
sun.position.set(20, 50, 20);
sun.castShadow = true;
sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xaaaaaa));

// --- KALİTELİ ZEMİN VE GÖL ---
function createRealisticGrass() {
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
const floor = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), new THREE.MeshStandardMaterial({ map: createRealisticGrass() }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const waterMat = new THREE.MeshStandardMaterial({ color: 0x0044ff, transparent: true, opacity: 0.6, metalness: 0.8 });
const lake = new THREE.Mesh(new THREE.CircleGeometry(12, 64), waterMat);
lake.rotation.x = -Math.PI / 2;
lake.position.set(15, 0.06, 15);
scene.add(lake);

// --- MODEL YÜKLEME (Sketchfab Modeli) ---
const playerGroup = new THREE.Group();
const loader = new GLTFLoader();

// NOT: 'karakter.glb' dosyasının GitHub'da olduğundan emin ol!
loader.load('karakter.glb', (gltf) => {
    playerModel = gltf.scene;
    
    // Model çok küçükse buradaki 1'leri 5 veya 10 yap!
    playerModel.scale.set(2, 2, 2); 
    
    playerModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    playerGroup.add(playerModel);
    
    // Animasyonları ayarla
    mixer = new THREE.AnimationMixer(playerModel);
    if(gltf.animations.length > 0) {
        mixer.clipAction(gltf.animations[0]).play(); // İlk animasyonu (genelde IDLE) oynat
    }
}, undefined, (err) => console.error("Model yükleme hatası:", err));

scene.add(playerGroup);

// --- AĞAÇLAR ---
const obstacles = [];
function createFancyTree(x, z) {
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
for(let i=0; i<15; i++) createFancyTree(Math.random()*80-40, Math.random()*80-40);

// --- KONTROLLER VE FONKSİYONLAR ---
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
        pitch = Math.max(-0.5, Math.min(0.3, pitch - e.movementY * 0.005));
    }
});

// --- OYUN DÖNGÜSÜ ---
function update() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta); // Animasyonu güncelle

    if (isPaused) {
        playerGroup.rotation.y += 0.01;
        camera.position.set(0, 3, 7); camera.lookAt(0, 1.5, 0);
    } else {
        const oldPos = playerGroup.position.clone();
        playerGroup.rotation.y = yaw;
        let speed = 0.18;

        // Su Mekaniği: Gölün içindeysen bat ve yavaşla
        const distToLake = playerGroup.position.distanceTo(new THREE.Vector3(15, 0, 15));
        if(distToLake < 12) {
            speed = 0.07; 
            playerGroup.position.y = THREE.MathUtils.lerp(playerGroup.position.y, -0.8, 0.1); 
        } else { 
            playerGroup.position.y = THREE.MathUtils.lerp(playerGroup.position.y, 0, 0.1); 
        }

        if(keys['KeyW']) playerGroup.translateZ(-speed);
        if(keys['KeyS']) playerGroup.translateZ(speed);
        if(keys['KeyA']) playerGroup.translateX(-speed);
        if(keys['KeyD']) playerGroup.translateX(speed);

        // Çarpışma Testi
        const pBox = new THREE.Box3().setFromObject(playerGroup);
        obstacles.forEach(b => { if(pBox.intersectsBox(b)) playerGroup.position.copy(oldPos); });

        // Kamera Takibi (Karakterin arkasından)
        const d = 10;
        camera.position.set(
            playerGroup.position.x + Math.sin(yaw)*Math.cos(pitch)*d,
            playerGroup.position.y + 5 + Math.sin(pitch)*d,
            playerGroup.position.z + Math.cos(yaw)*Math.cos(pitch)*d
        );
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 2, playerGroup.position.z);
    }
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

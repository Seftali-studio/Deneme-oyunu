import * as THREE from 'three';
import { GLTFLoader } from 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

let gameStarted = false, isPaused = true, currentLang = 'tr';
const clock = new THREE.Clock();
let mixer, playerModel;

const texts = {
    tr: { title: "3D DENEME OYUNU", start: "MAÇA BAŞLA", char: "Karakter Hazır", pause: "OYUN DURDURULDU", resume: "DEVAM ET", exit: "ANA MENÜ" },
    en: { title: "3D TRIAL GAME", start: "START MATCH", char: "Hero Ready", pause: "GAME PAUSED", resume: "CONTINUE", exit: "MAIN MENU" }
};

// --- SAHNE KURULUMU ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Açık mavi gökyüzü
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- IŞIKLAR ---
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(10, 50, 10);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

// --- ZEMİN ---
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x348C31 }) // Canlı çimen yeşili
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// --- KARAKTER GRUBU ---
const playerGroup = new THREE.Group();
scene.add(playerGroup);

// --- GEÇİCİ KUTU (Model yüklenene kadar görünecek) ---
const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 1),
    new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: true })
);
placeholder.position.y = 1;
playerGroup.add(placeholder);

// --- MODEL YÜKLEME ---
const loader = new GLTFLoader();

// BURASI ÇOK ÖNEMLİ: Dosya adının GitHub'dakiyle aynı olduğundan emin ol (Örn: karakter.glb)
loader.load('karakter.glb', (gltf) => {
    console.log("Model başarıyla geldi!");
    playerGroup.remove(placeholder); // Model gelince kırmızı kutuyu sil
    
    playerModel = gltf.scene;
    
    // MODEL BOYUTU: Eğer hala görünmüyorsa buradaki 5'leri 20 veya 50 yap!
    playerModel.scale.set(5, 5, 5); 
    
    playerModel.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    playerGroup.add(playerModel);

    // Animasyon Sistemi
    if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(playerModel);
        mixer.clipAction(gltf.animations[0]).play();
    }
}, 
(xhr) => { console.log((xhr.loaded / xhr.total * 100) + '% yüklendi'); },
(error) => { console.error("Model yüklenirken hata çıktı: ", error); });

// --- FONKSİYONLAR ---
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

window.selectChar = () => { alert("Model yüklendiği için renk değişimi devre dışı."); };

// --- KONTROLLER ---
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

// --- ANA DÖNGÜ ---
function update() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    if (isPaused) {
        playerGroup.rotation.y += 0.01;
        camera.position.set(0, 4, 12); // Menüde karakteri uzaktan gör
        camera.lookAt(0, 2, 0);
    } else {
        playerGroup.rotation.y = yaw;
        let speed = 0.2;

        if(keys['KeyW']) playerGroup.translateZ(-speed);
        if(keys['KeyS']) playerGroup.translateZ(speed);
        if(keys['KeyA']) playerGroup.translateX(-speed);
        if(keys['KeyD']) playerGroup.translateX(speed);

        // Kamera Takibi
        const dist = 8;
        camera.position.set(
            playerGroup.position.x + Math.sin(yaw) * Math.cos(pitch) * dist,
            playerGroup.position.y + 4 + Math.sin(pitch) * dist,
            playerGroup.position.z + Math.cos(yaw) * Math.cos(pitch) * dist
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

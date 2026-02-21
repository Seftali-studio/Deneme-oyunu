import * as THREE from 'three';

// --- DEĞİŞKENLER VE AYARLAR ---
let gameStarted = false, isPaused = true, currentLang = 'tr';
const texts = {
    tr: { title: "3D DENEME OYUNU", start: "MAÇA BAŞLA", char: "Karakter Seç", pause: "OYUN DURDURULDU", resume: "DEVAM ET", exit: "ANA MENÜ" },
    en: { title: "3D TRIAL GAME", start: "START MATCH", char: "Select Hero", pause: "GAME PAUSED", resume: "CONTINUE", exit: "MAIN MENU" }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6eb1ff);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// IŞIKLANDIRMA
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(20, 50, 20);
sun.castShadow = true;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x909090));

// --- KALİTELİ ZEMİN ---
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

// DALGALI GÖL
const waterMat = new THREE.MeshStandardMaterial({ color: 0x0044ff, transparent: true, opacity: 0.7 });
const lake = new THREE.Mesh(new THREE.CircleGeometry(12, 64), waterMat);
lake.rotation.x = -Math.PI / 2;
lake.position.set(15, 0.05, 15);
scene.add(lake);

// AĞAÇLAR VE ÇARPIŞMA
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

// KARAKTER
const playerGroup = new THREE.Group();
const bodyMat = new THREE.MeshStandardMaterial({color: 0x0066ff});
const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.4), bodyMat);
body.position.y = 1.4; playerGroup.add(body);
const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshStandardMaterial({color: 0xffdbac}));
head.position.y = 2.1; playerGroup.add(head);
const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), new THREE.MeshStandardMaterial({color: 0x222222}));
lLeg.position.set(-0.2, 0.4, 0); playerGroup.add(lLeg);
const rLeg = lLeg.clone(); rLeg.position.set(0.2, 0.4, 0); playerGroup.add(rLeg);
scene.add(playerGroup);

// --- FONKSİYONLAR (WINDOW ÜZERİNDEN BAĞLI) ---
window.toggleLang = () => {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    document.getElementById('main-title').innerText = texts[currentLang].title;
    document.getElementById('start-btn').innerText = texts[currentLang].start;
    document.getElementById('char-text').innerText = texts[currentLang].char;
    document.getElementById('pause-title').innerText = texts[currentLang].pause;
    document.getElementById('resume-btn').innerText = texts[currentLang].resume;
    document.getElementById('exit-btn').innerText = texts[currentLang].exit;
};

window.selectChar = (c) => bodyMat.color.set(c === 'blue' ? 0x0066ff : 0xff3300);

window.startGame = () => {
    isPaused = false; gameStarted = true;
    document.getElementById('ui-wrapper').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
};

// --- DÖNGÜ VE KONTROLLER ---
const keys = {};
let yaw = 0, pitch = 0, walk = 0;

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
    if(!isPaused && e.buttons === 1) {
        yaw -= e.movementX * 0.005;
        pitch = Math.max(-0.5, Math.min(0.3, pitch - e.movementY * 0.005));
    }
});

function update() {
    if (isPaused) {
        playerGroup.rotation.y += 0.01;
        camera.position.set(0, 2.5, 6); camera.lookAt(0, 1.5, 0);
    } else {
        const oldPos = playerGroup.position.clone();
        playerGroup.rotation.y = yaw;
        let speed = 0.15;
        let move = false;

        // Su Mekaniği
        if(playerGroup.position.distanceTo(new THREE.Vector3(15, 0, 15)) < 12) {
            speed = 0.06; playerGroup.position.y = -0.4;
        } else { playerGroup.position.y = 0; }

        if(keys['KeyW']) { playerGroup.translateZ(-speed); move = true; }
        if(keys['KeyS']) { playerGroup.translateZ(speed); move = true; }
        if(keys['KeyA']) { playerGroup.translateX(-speed); move = true; }
        if(keys['KeyD']) { playerGroup.translateX(speed); move = true; }

        // Çarpışma
        const pBox = new THREE.Box3().setFromObject(playerGroup);
        obstacles.forEach(b => { if(pBox.intersectsBox(b)) playerGroup.position.copy(oldPos); });

        // Animasyon
        if(move) {
            walk += 0.15;
            lLeg.rotation.x = Math.sin(walk)*0.7; rLeg.rotation.x = -Math.sin(walk)*0.7;
        } else { lLeg.rotation.x = rLeg.rotation.x = 0; }

        const d = 8;
        camera.position.set(
            playerGroup.position.x + Math.sin(yaw)*Math.cos(pitch)*d,
            playerGroup.position.y + 4 + Math.sin(pitch)*d,
            playerGroup.position.z + Math.cos(yaw)*Math.cos(pitch)*d
        );
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.8, playerGroup.position.z);
    }
}
function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
animate();

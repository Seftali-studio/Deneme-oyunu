import * as THREE from 'three';

let gameStarted = false, isPaused = true, currentLang = 'tr';
const texts = {
    tr: { title: "3D DENEME OYUNU", start: "MAÇA BAŞLA", char: "Karakter Seç", pause: "OYUN DURDURULDU" },
    en: { title: "3D TRIAL GAME", start: "START MATCH", char: "Select Hero", pause: "GAME PAUSED" }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// IŞIKLANDIRMA
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(10, 20, 10);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x707070));

// ZEMİN VE SU (GÖL)
const floorGeo = new THREE.PlaneGeometry(100, 100);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// GÖL OLUŞTURMA
const waterGeo = new THREE.CircleGeometry(15, 32);
const waterMat = new THREE.MeshStandardMaterial({ color: 0x00aaff, transparent: true, opacity: 0.8 });
const lake = new THREE.Mesh(waterGeo, waterMat);
lake.rotation.x = -Math.PI / 2;
lake.position.set(20, 0.05, 20); // Gölün yeri
scene.add(lake);

// AĞAÇ EKLEME FONKSİYONU
function createTree(x, z) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 2), new THREE.MeshStandardMaterial({color: 0x4b2d0b}));
    trunk.position.y = 1; group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 8), new THREE.MeshStandardMaterial({color: 0x1a3c15}));
    leaves.position.y = 3; group.add(leaves);
    group.position.set(x, 0, z);
    scene.add(group);
}
// Etrafa ağaçlar serpelim
for(let i=0; i<15; i++) {
    createTree(Math.random()*80-40, Math.random()*80-40);
}

// KARAKTER
const playerGroup = new THREE.Group();
const bodyMat = new THREE.MeshStandardMaterial({color: 0x0066ff});
const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.3), bodyMat);
body.position.y = 1.35; playerGroup.add(body);
const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), new THREE.MeshStandardMaterial({color: 0xffdbac}));
head.position.y = 2.05; playerGroup.add(head);
const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), new THREE.MeshStandardMaterial({color: 0x222222}));
lLeg.position.set(-0.15, 0.4, 0); playerGroup.add(lLeg);
const rLeg = lLeg.clone(); rLeg.position.set(0.15, 0.4, 0); playerGroup.add(rLeg);
scene.add(playerGroup);

// FONKSİYONLAR
window.toggleLang = () => {
    currentLang = currentLang === 'tr' ? 'en' : 'tr';
    document.getElementById('main-title').innerText = texts[currentLang].title;
    document.getElementById('start-btn').innerText = texts[currentLang].start;
    document.getElementById('char-text').innerText = texts[currentLang].char;
    document.getElementById('pause-title').innerText = texts[currentLang].pause;
};

window.selectChar = (c) => bodyMat.color.set(c === 'blue' ? 0x0066ff : 0xff3300);

window.startGame = () => {
    isPaused = false; gameStarted = true;
    document.getElementById('ui-wrapper').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
};

// OYUN DÖNGÜSÜ
const keys = {};
let yaw = 0, pitch = 0, vY = 0, walkTimer = 0;

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
        pitch = Math.max(-Math.PI/3, Math.min(Math.PI/8, pitch - e.movementY * 0.005));
    }
});

function update() {
    if (isPaused) {
        playerGroup.rotation.y += 0.01;
        camera.position.set(0, 2, 5); camera.lookAt(0, 1.4, 0);
    } else {
        playerGroup.rotation.y = yaw;
        let moving = false;
        const inside = Math.abs(playerGroup.position.x) < 50 && Math.abs(playerGroup.position.z) < 50;

        if (inside && playerGroup.position.y <= 0) {
            playerGroup.position.y = 0; vY = 0;
            let speed = 0.12;
            // SU MEKANİĞİ: Eğer gölün içindeyse yavaşla!
            const distToLake = playerGroup.position.distanceTo(new THREE.Vector3(20, 0, 20));
            if(distToLake < 15) speed = 0.05; 

            if(keys['KeyW']) { playerGroup.translateZ(-speed); moving = true; }
            if(keys['KeyS']) { playerGroup.translateZ(speed); moving = true; }
            if(keys['KeyA']) { playerGroup.translateX(-speed); moving = true; }
            if(keys['KeyD']) { playerGroup.translateX(speed); moving = true; }
        } else {
            vY -= 0.015; playerGroup.position.y += vY;
            if(playerGroup.position.y < -30) { playerGroup.position.set(0, 5, 0); vY = 0; }
        }

        if(moving) {
            walkTimer += 0.15;
            lLeg.rotation.x = Math.sin(walkTimer) * 0.5;
            rLeg.rotation.x = Math.sin(walkTimer + Math.PI) * 0.5;
        } else { lLeg.rotation.x = rLeg.rotation.x = 0; }

        const d = 7;
        camera.position.set(
            playerGroup.position.x + Math.sin(yaw)*Math.cos(pitch)*d,
            playerGroup.position.y + 3.5 + Math.sin(pitch)*d,
            playerGroup.position.z + Math.cos(yaw)*Math.cos(pitch)*d
        );
        camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.5, playerGroup.position.z);
    }
}

function animate() { requestAnimationFrame(animate); update(); renderer.render(scene, camera); }
animate();

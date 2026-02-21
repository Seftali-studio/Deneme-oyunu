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
    new THREE.MeshStandardMaterial({ map: createRealisticGrass(), roughness: 0.8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// --- GERÇEKÇİ DALGALI GÖL ---
const waterGeo = new THREE.CircleGeometry(12, 64);
const waterMat = new THREE.MeshStandardMaterial({ 
    color: 0x0044ff, transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.5 
});
const lake = new THREE.Mesh(waterGeo, waterMat);
lake.rotation.x = -Math.PI / 2;
lake.position.set(15, 0.1, 15);
scene.add(lake);

// --- KALİTELİ AĞAÇLAR VE ÇARPIŞMA SİSTEMİ ---
const obstacles = [];
function createFancyTree(x, z) {
    const group = new THREE.Group();
    // Gövde
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3, 12), new THREE.MeshStandardMaterial({color: 0x3d2b1f}));
    trunk.position.y = 1.5; trunk.castShadow = true; group.add(trunk);
    // Yapraklar (3 katmanlı küre)
    const leafMat = new THREE.MeshStandardMaterial({color: 0x134d0b, roughness: 1});
    for(let i=0; i<3; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(1.5 - (i*0.3), 12, 12), leafMat);
        leaf.position.y = 3 + (i*1.2); leaf.castShadow = true; group.add(leaf);
    }
    group.position.set(x, 0, z);
    scene.add(group);
    obstacles.push(new THREE.Box3().setFromObject(group)); // Çarpışma kutusu
}
for(let i=0; i<20; i++) {
    createFancyTree(Math.random()*100-50, Math.random()*100-50);
}

// --- DETAYLI KARAKTER ---
const playerGroup = new THREE.Group();
const skinMat = new THREE.MeshStandardMaterial({color: 0xffdbac});
const suitMat = new THREE.MeshStandardMaterial({color: 0x0066ff});

const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1, 0.4), suitMat);
body.position.y = 1.4; body.castShadow = true; playerGroup.add(body);

const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), skinMat);
head.position.y = 2.1; playerGroup.add(head);

// Kollar ve Bacaklar
const limbGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
const lLeg = new THREE.Mesh(limbGeo, new THREE.MeshStandardMaterial({color: 0x222222}));
lLeg.position.set(-0.2, 0.4, 0); playerGroup.add(lLeg);
const rLeg = lLeg.clone(); rLeg.position.set(0.2, 0.4, 0); playerGroup.add(rLeg);

const lArm = new THREE.Mesh(limbGeo, suitMat);
lArm.position.set(-0.5, 1.4, 0); playerGroup.add(lArm);
const rArm = lArm.clone(); rArm.position.set(0.5, 1.4, 0); playerGroup.add(rArm);

scene.add(playerGroup);

// --- MEKANİKLER ---
const keys = {};
let yaw = 0, pitch = 0, vY = 0, walk = 0;

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

// UI Bağlantıları (HTML'deki butonlar için)
window.selectChar = (c) => body.material.color.set(c === 'blue' ? 0x0066ff : 0xff3300);
window.startGame = () => {
    isPaused = false; gameStarted = true;
    document.getElementById('ui-wrapper').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('crosshair').style.display = 'block';
};

function update() {
    if (isPaused) {
        playerGroup.rotation.y += 0.01;
        camera.position.set(0, 2.5, 6); camera.lookAt(0, 1.5, 0);
    } else {
        // Su Efekti (Dalgalanma simülasyonu)
        waterMat.opacity = 0.6 + Math.sin(Date.now()*0.002) * 0.1;
        
        const oldPos = playerGroup.position.clone();
        playerGroup.rotation.y = yaw;
        let move = false;
        let speed = 0.15;

        // Gölün içine girdi mi?
        const distToLake = playerGroup.position.distanceTo(new THREE.Vector3(15, 0, 15));
        if(distToLake < 12) {
            speed = 0.06; // Su direnci
            playerGroup.position.y = -0.5; // Suya batma efekti
        } else {
            playerGroup.position.y = 0;
        }

        if(keys['KeyW']) { playerGroup.translateZ(-speed); move = true; }
        if(keys['KeyS']) { playerGroup.translateZ(speed); move = true; }
        if(keys['KeyA']) { playerGroup.translateX(-speed); move = true; }
        if(keys['KeyD']) { playerGroup.translateX(speed); move = true; }

        // AĞAÇ ÇARPIŞMA KONTROLÜ
        const playerBox = new THREE.Box3().setFromObject(playerGroup);
        obstacles.forEach(box => {
            if(playerBox.intersectsBox(box)) playerGroup.position.copy(oldPos);
        });

        if(move) {
            walk += 0.15;
            lLeg.rotation.x = Math.sin(walk)*0.7; rLeg.rotation.x = -Math.sin(walk)*0.7;
            lArm.rotation.x = -Math.sin(walk)*0.5; rArm.rotation.x = Math.sin(walk)*0.5;
        } else {
            lLeg.rotation.x = rLeg.rotation.x = lArm.rotation.x = rArm.rotation.x = 0;
        }

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

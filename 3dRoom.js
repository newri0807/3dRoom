// 전역 변수
let scene, camera, renderer;
let room,
  furniture = [];
let autoRotate = false;
let animationsEnabled = true;
let butterflies = [];
let flowers = [];
let cat;
let clock;
let isInitialized = false;
// 다크 모드
const modeButton = document.getElementById("modeToggle");
let isDarkMode = false;
let originalBg; // scene 생성 후 채움
let originalLights = [];
let wallMaterial, ceilingMaterial;
let lightGroup, darkGroup; // 조명설정
let windowGroup;
let ghost; // 👻

//  카메라 컨트롤 변수 개선
let cameraControls = {
  //  구면 좌표계로 자유로운 시점 구현
  distance: 8, // 카메라 거리
  phi: Math.PI / 3, // 세로 각도 (0 = 위, PI = 아래)
  theta: 0, // 가로 각도
  target: { x: 0, y: 1, z: 0 }, //  바라보는 지점을 바닥에서 살짝 위로
  minDistance: 3,
  maxDistance: 20,
  minPhi: 0.1, //  거의 위에서부터
  maxPhi: Math.PI - 0.1, //  거의 아래까지
};

let mouseControls = {
  isDown: false,
  previousX: 0,
  previousY: 0,
  sensitivity: 0.005,
};

//  키보드 컨트롤 추가
let keyControls = {
  moveSpeed: 0.1,
  keys: {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
    space: false,
  },
};

function checkThreeJS() {
  if (typeof THREE === "undefined") {
    console.error("THREE.js가 로드되지 않았습니다");
    document.getElementById("loading").innerHTML =
      "❌ THREE.js 로딩 실패 - 페이지를 새로고침해주세요";
    return false;
  }
  return true;
}

function init() {
  document.body.classList.add("dark-mode");
  try {
    let ambientLight, dirLight;
    if (!checkThreeJS()) return;

    console.log("THREE.js 초기화 시작");
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb8e6b8);
    originalBg = scene.background.clone();

    // 조명 1번만 추가
    ambientLight = new THREE.AmbientLight(0xfff0e0, 0.5);
    dirLight = new THREE.DirectionalLight(0xfff8e8, 0.7);

    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;

    originalLights = [ambientLight, dirLight];

    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    updateCameraPosition();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById("container").appendChild(renderer.domElement);

    setupControls();
    setupLights();
    createRoom();
    createFurniture();
    createDecorations();
    createCat();
    createFlowers();
    createButterflies();
    createWallDecorations();

    isInitialized = true;
    document.getElementById("loading").style.display = "none";
    document.getElementById("controls").style.display = "block";
    document.getElementById("guide").style.display = "block";
    document.getElementById("info").style.display = "block";
    windowGroup = createWindow(); // ✅ 유령 추가 위해 저장

    animate();

    setupModeToggle();

    console.log("초기화 완료!");
  } catch (error) {
    console.error("초기화 오류:", error);
    document.getElementById("loading").innerHTML =
      "❌ 초기화 실패: " + error.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const info = document.getElementById("info");

  if (!info) return;

  const paragraphs = info.querySelectorAll("p");

  paragraphs.forEach((p, index) => {
    p.style.cursor = "pointer";

    p.addEventListener("click", () => {
      switch (index) {
        case 0: // 🐱 고양이
          if (cat) {
            cat.visible = !cat.visible;
          }
          break;
        case 1: // 🦋 나비
          butterflies.forEach((b) => (b.visible = !b.visible));
          break;
        case 2: // 🌸 꽃
          flowers.forEach((f) => (f.visible = !f.visible));
          break;
      }
    });
  });
});

function setupModeToggle() {
  const button = document.getElementById("modeToggle");

  button.addEventListener("click", () => {
    isDarkMode = !isDarkMode;

    if (isDarkMode) {
      document.body.classList.remove("dark-mode");
      button.textContent = "☀️ 라이트 모드";

      scene.background = new THREE.Color(0x05050c);
      wallMaterial.color.set(0x223344);
      ceilingMaterial.color.set(0x1a1a1a);

      // 라이트모드 조명 제거
      if (lightGroup && scene.children.includes(lightGroup)) {
        scene.remove(lightGroup);
      }

      // 다크모드 조명 추가
      if (darkGroup) {
        scene.add(darkGroup);
      }

      // 창문 > 유령 추가
      if (windowGroup && !ghost) createGhost(windowGroup);

      // 고양이 색상
      if (cat) {
        cat.traverse((child) => {
          if (child.isMesh) {
            // 털 색
            if (
              child.material.color &&
              child.material.color.getHex() === 0xff8c00
            ) {
              child.material.color.set(0xffffff); // 하얀색
            }
            // 눈 색
            if (
              child.material.color &&
              child.material.color.getHex() === 0x00ff00
            ) {
              child.material.color.set(0xff0049); // 레드
            }
          }
        });
      }

      // 🖥 노트북 화면 재생성
      furniture.forEach((item) => {
        const lidGroup = item.getObjectByName("laptopLid");
        if (lidGroup) {
          createLaptopScreen(lidGroup);
        }
      });

      createStarField();
    } else {
      document.body.classList.add("dark-mode");
      button.textContent = "🌙 다크 모드";

      scene.background = originalBg.clone();
      wallMaterial.color.set(0xb8e6b8);
      ceilingMaterial.color.set(0xf5deb3);

      // 다크모드 조명 제거
      if (darkGroup && scene.children.includes(darkGroup)) {
        scene.remove(darkGroup);
      }

      // 라이트모드 조명 복원
      if (lightGroup) {
        scene.add(lightGroup);
      }

      // 창문 > 유령 제거
      if (ghost && windowGroup) {
        windowGroup.remove(ghost);
        ghost = null;
      }

      // 고양이 색상 복원 (주황 털, 초록 눈)
      if (cat) {
        cat.traverse((child) => {
          if (child.isMesh) {
            // 털 복원
            if (
              child.material.color &&
              child.material.color.getHex() === 0xffffff
            ) {
              child.material.color.set(0xff8c00); // 주황색
            }
            // 눈 복원
            if (
              child.material.color &&
              child.material.color.getHex() === 0xff0049
            ) {
              child.material.color.set(0x00ff00); // 초록색
            }
          }
        });
      }

      // 라이트모드용 화면 재생성
      furniture.forEach((item) => {
        const lidGroup = item.getObjectByName("laptopLid");
        if (lidGroup) {
          createLaptopScreen(lidGroup);
        }
      });

      const star = scene.getObjectByName("starField");
      if (star) scene.remove(star);
    }
  });
}

function createGhost(windowGroup) {
  const ghostGroup = new THREE.Group(); // 유령 전체를 그룹으로 구성

  // 👻 몸통 (둥근 머리)
  const headGeo = new THREE.SphereGeometry(
    0.3,
    16,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.8
  );
  const whiteMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
  });
  const head = new THREE.Mesh(headGeo, whiteMat);
  ghostGroup.add(head);

  // 👻 꼬리 (물결형 반구 3개 조합)
  const tailGeo = new THREE.SphereGeometry(0.12, 16, 16);
  const tail1 = new THREE.Mesh(tailGeo, whiteMat.clone());
  const tail2 = tail1.clone();
  const tail3 = tail1.clone();

  tail1.position.set(-0.15, -0.28, 0);
  tail2.position.set(0, -0.3, 0);
  tail3.position.set(0.15, -0.28, 0);

  ghostGroup.add(tail1, tail2, tail3);

  // 👀 눈
  const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  const rightEye = leftEye.clone();

  leftEye.position.set(-0.08, 0.08, 0.27);
  rightEye.position.set(0.08, 0.08, 0.27);
  ghostGroup.add(leftEye, rightEye);

  // 👄 입 (반원형으로 표현)
  const mouthShape = new THREE.RingGeometry(0.05, 0.09, 32, 1, 0, Math.PI);
  const mouthMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const mouth = new THREE.Mesh(mouthShape, mouthMat);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0, -0.05, 0.28);
  ghostGroup.add(mouth);

  // 🦷 이빨 (작은 삼각형 2~3개)
  const toothGeo = new THREE.ConeGeometry(0.02, 0.05, 3);
  const toothMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const tooth1 = new THREE.Mesh(toothGeo, toothMat);
  tooth1.rotation.x = Math.PI;
  tooth1.position.set(-0.025, -0.08, 0.285);

  const tooth2 = tooth1.clone();
  tooth2.position.x = 0.025;

  ghostGroup.add(tooth1, tooth2);

  // 👻 위치 설정 (창문 바깥 위쪽)
  ghostGroup.position.set(3, 4.2, 6.2);
  // ✅  유령이 방 안쪽을 바라보게
  ghostGroup.rotation.y = Math.PI; // 방향 반전

  ghost = ghostGroup;
  windowGroup.add(ghostGroup);
}

function createStarField() {
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 800;
  const positions = [];

  for (let i = 0; i < starCount; i++) {
    positions.push(
      (Math.random() - 0.5) * 100,
      Math.random() * 50,
      (Math.random() - 0.5) * 100
    );
  }

  starGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );

  //  텍스처 로드
  const starTexture = new THREE.TextureLoader().load("textures/star.webp");

  const starMaterial = new THREE.PointsMaterial({
    map: starTexture,
    size: 1.2,
    transparent: true,
    opacity: 0.9,
    depthWrite: false, //  별이 겹쳐도 어색하지 않게
    blending: THREE.AdditiveBlending, //  반짝이는 느낌
    color: 0xffffff,
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  stars.name = "starField";
  scene.add(stars);
}

function addStarsBackground() {
  const starGroup = new THREE.Group();
  starGroup.name = "StarField";

  const starGeo = new THREE.SphereGeometry(0.01, 6, 6);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  for (let i = 0; i < 500; i++) {
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(
      (Math.random() - 0.5) * 30,
      Math.random() * 15,
      (Math.random() - 0.5) * 30
    );
    starGroup.add(star);
  }

  scene.add(starGroup);
}

//  카메라 위치 업데이트 함수
function updateCameraPosition() {
  const { distance, phi, theta, target } = cameraControls;

  // 구면 좌표계를 직교 좌표계로 변환
  camera.position.x = target.x + distance * Math.sin(phi) * Math.cos(theta);
  camera.position.y = target.y + distance * Math.cos(phi);
  camera.position.z = target.z + distance * Math.sin(phi) * Math.sin(theta);

  camera.lookAt(target.x, target.y, target.z);
}

//  향상된 컨트롤 설정
function setupControls() {
  const canvas = renderer.domElement;

  // 마우스 이벤트
  canvas.addEventListener("mousedown", function (event) {
    mouseControls.isDown = true;
    mouseControls.previousX = event.clientX;
    mouseControls.previousY = event.clientY;
    canvas.style.cursor = "grabbing";
  });

  canvas.addEventListener("mousemove", function (event) {
    if (!mouseControls.isDown) return;

    const deltaX = event.clientX - mouseControls.previousX;
    const deltaY = event.clientY - mouseControls.previousY;

    //  더 자연스러운 회전
    cameraControls.theta -= deltaX * mouseControls.sensitivity;
    cameraControls.phi += deltaY * mouseControls.sensitivity;

    //  각도 제한
    cameraControls.phi = Math.max(
      cameraControls.minPhi,
      Math.min(cameraControls.maxPhi, cameraControls.phi)
    );

    updateCameraPosition();

    mouseControls.previousX = event.clientX;
    mouseControls.previousY = event.clientY;
  });

  canvas.addEventListener("mouseup", function () {
    mouseControls.isDown = false;
    canvas.style.cursor = "grab";
  });

  canvas.addEventListener("mouseleave", function () {
    mouseControls.isDown = false;
    canvas.style.cursor = "grab";
  });

  //  휠 이벤트 개선
  canvas.addEventListener("wheel", function (event) {
    event.preventDefault();

    const zoomSpeed = 0.1;
    cameraControls.distance += event.deltaY * zoomSpeed * 0.01;
    cameraControls.distance = Math.max(
      cameraControls.minDistance,
      Math.min(cameraControls.maxDistance, cameraControls.distance)
    );

    updateCameraPosition();
  });

  //  키보드 컨트롤 추가
  document.addEventListener("keydown", function (event) {
    switch (event.code) {
      case "KeyW":
        keyControls.keys.w = true;
        break;
      case "KeyA":
        keyControls.keys.a = true;
        break;
      case "KeyS":
        keyControls.keys.s = true;
        break;
      case "KeyD":
        keyControls.keys.d = true;
        break;
      case "ShiftLeft":
        keyControls.keys.shift = true;
        break;
      case "Space":
        keyControls.keys.space = true;
        event.preventDefault();
        break;
    }
  });

  document.addEventListener("keyup", function (event) {
    switch (event.code) {
      case "KeyW":
        keyControls.keys.w = false;
        break;
      case "KeyA":
        keyControls.keys.a = false;
        break;
      case "KeyS":
        keyControls.keys.s = false;
        break;
      case "KeyD":
        keyControls.keys.d = false;
        break;
      case "ShiftLeft":
        keyControls.keys.shift = false;
        break;
      case "Space":
        keyControls.keys.space = false;
        break;
    }
  });

  canvas.style.cursor = "grab";
}

//  키보드 입력 처리
function handleKeyboardControls() {
  const speed = keyControls.moveSpeed * (keyControls.keys.shift ? 2 : 1);

  if (keyControls.keys.w) {
    // 앞으로
    cameraControls.target.z -= Math.cos(cameraControls.theta) * speed;
    cameraControls.target.x -= Math.sin(cameraControls.theta) * speed;
  }
  if (keyControls.keys.s) {
    // 뒤로
    cameraControls.target.z += Math.cos(cameraControls.theta) * speed;
    cameraControls.target.x += Math.sin(cameraControls.theta) * speed;
  }
  if (keyControls.keys.a) {
    // 왼쪽
    cameraControls.target.x -= Math.cos(cameraControls.theta) * speed;
    cameraControls.target.z += Math.sin(cameraControls.theta) * speed;
  }
  if (keyControls.keys.d) {
    // 오른쪽
    cameraControls.target.x += Math.cos(cameraControls.theta) * speed;
    cameraControls.target.z -= Math.sin(cameraControls.theta) * speed;
  }
  if (keyControls.keys.space) {
    // 위로
    cameraControls.target.y += speed;
  }
  if (
    keyControls.keys.shift &&
    !keyControls.keys.w &&
    !keyControls.keys.s &&
    !keyControls.keys.a &&
    !keyControls.keys.d
  ) {
    // Shift만 누르면 아래로
    cameraControls.target.y -= speed;
  }

  //  타겟 위치 제한
  cameraControls.target.y = Math.max(0, Math.min(6, cameraControls.target.y));
}

// 라이트용(lightGroup)·다크용(darkGroup) 두 그룹으로 분리해 저장
function setupLights() {
  /* ──────────── 라이트 모드용 조명 ──────────── */
  lightGroup = new THREE.Group();
  {
    const amb = new THREE.AmbientLight(0xfff0e0, 0.5);
    lightGroup.add(amb);

    const dir = new THREE.DirectionalLight(0xfff8e8, 0.7);
    dir.position.set(5, 10, 5);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    lightGroup.add(dir);

    const pendant = new THREE.PointLight(0xffa500, 0.6, 10);
    pendant.position.set(0, 4, 0);
    lightGroup.add(pendant);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffa500 })
    );
    lamp.position.set(0, 4, 0);
    lightGroup.add(lamp);

    const windowDir = new THREE.DirectionalLight(0xe6f3ff, 0.3);
    windowDir.position.set(10, 5, 10);
    lightGroup.add(windowDir);
  }

  /* ──────────── 다크 모드용 조명 ──────────── */
  darkGroup = new THREE.Group();
  {
    const ambDark = new THREE.AmbientLight(0x334477, 0.5);
    darkGroup.add(ambDark);

    const spot = new THREE.SpotLight(0x88ccff, 2, 20, Math.PI / 6);
    spot.position.set(3, 5, 3);
    spot.castShadow = true;
    darkGroup.add(spot);
  }

  /* ──────────── 기본(라이트 모드)로 시작 ──────────── */
  scene.add(lightGroup);
  originalLights = [lightGroup]; // originalLights 갱신
}

// 방 생성 (기존과 동일)
function createRoom() {
  const roomGroup = new THREE.Group();

  const floorGeometry = new THREE.PlaneGeometry(12, 12);
  const floorTexture = createWoodTexture();
  const floorMaterial = new THREE.MeshLambertMaterial({ map: floorTexture });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  wallMaterial = new THREE.MeshLambertMaterial({ color: 0xb8e6b8 });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), wallMaterial);
  backWall.position.set(0, 4, -6);
  roomGroup.add(backWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8),
    wallMaterial
  );
  rightWall.position.set(6, 4, 0);
  rightWall.rotation.y = -Math.PI / 2;
  roomGroup.add(rightWall);

  ceilingMaterial = new THREE.MeshLambertMaterial({ color: 0xe6cfa4 });
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    ceilingMaterial
  );
  ceiling.position.y = 8;
  ceiling.rotation.x = Math.PI / 2;
  roomGroup.add(ceiling);

  scene.add(roomGroup);
  room = roomGroup;
}

// 가구 생성
function createFurniture() {
  createSofa();
  createBookshelf();
  createDesk();
  createRug();
  createWindow();
}

// 소파 생성
function createSofa() {
  const sofaGroup = new THREE.Group();

  const sofaGeometry = new THREE.BoxGeometry(2, 0.8, 1);
  const sofaMaterial = new THREE.MeshLambertMaterial({ color: 0xff6b6b });
  const sofaBody = new THREE.Mesh(sofaGeometry, sofaMaterial);
  sofaBody.position.set(3, 0.4, 2);
  sofaBody.castShadow = true;
  sofaGroup.add(sofaBody);

  const backrestGeometry = new THREE.BoxGeometry(2, 1, 0.2);
  const backrest = new THREE.Mesh(backrestGeometry, sofaMaterial);
  backrest.position.set(3, 0.9, 2.4);
  backrest.castShadow = true;
  sofaGroup.add(backrest);

  const armGeometry = new THREE.BoxGeometry(0.2, 0.8, 1);
  const leftArm = new THREE.Mesh(armGeometry, sofaMaterial);
  leftArm.position.set(2, 0.4, 2);
  leftArm.castShadow = true;
  sofaGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, sofaMaterial);
  rightArm.position.set(4, 0.4, 2);
  rightArm.castShadow = true;
  sofaGroup.add(rightArm);

  const cushionGeometry = new THREE.BoxGeometry(0.6, 0.2, 0.6);
  const cushionMaterial = new THREE.MeshLambertMaterial({ color: 0xff8e8e });

  for (let i = 0; i < 2; i++) {
    const cushion = new THREE.Mesh(cushionGeometry, cushionMaterial);
    cushion.position.set(2.5 + i * 0.8, 0.9, 2);
    cushion.castShadow = true;
    sofaGroup.add(cushion);
  }

  scene.add(sofaGroup);
  furniture.push(sofaGroup);
}

// 책장 생성
function createBookshelf() {
  const bookshelfGroup = new THREE.Group();

  // 책장 뒷면 (배경)
  const backGeometry = new THREE.BoxGeometry(2, 3, 0.1);
  const backMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
  const back = new THREE.Mesh(backGeometry, backMaterial);
  back.position.set(-3, 1.5, -2.25);
  back.castShadow = true;
  bookshelfGroup.add(back);

  // 책장 좌우 측면
  const sideGeometry = new THREE.BoxGeometry(0.1, 3, 0.5);
  const sideMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

  const leftSide = new THREE.Mesh(sideGeometry, sideMaterial);
  leftSide.position.set(-4, 1.5, -2);
  leftSide.castShadow = true;
  bookshelfGroup.add(leftSide);

  const rightSide = new THREE.Mesh(sideGeometry, sideMaterial);
  rightSide.position.set(-2, 1.5, -2);
  rightSide.castShadow = true;
  bookshelfGroup.add(rightSide);

  // 책장 상하면
  const topBottomGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
  const topBottomMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

  const top = new THREE.Mesh(topBottomGeometry, topBottomMaterial);
  top.position.set(-3, 2.95, -2);
  top.castShadow = true;
  bookshelfGroup.add(top);

  const bottom = new THREE.Mesh(topBottomGeometry, topBottomMaterial);
  bottom.position.set(-3, 0.05, -2);
  bottom.castShadow = true;
  bookshelfGroup.add(bottom);

  // 책장 선반들
  for (let i = 0; i < 4; i++) {
    const shelfBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.05, 0.5),
      sideMaterial
    );
    shelfBoard.position.set(-3, 0.6 + i * 0.6, -2);
    shelfBoard.castShadow = true;
    bookshelfGroup.add(shelfBoard);
  }

  // 더 예쁘고 다양한 책 데이터
  const bookData = [
    // 1층 책들
    [
      {
        width: 0.08,
        height: 0.45,
        depth: 0.15,
        color: 0x8b0000,
        spine: 0xffffff,
      },
      {
        width: 0.12,
        height: 0.48,
        depth: 0.18,
        color: 0x006400,
        spine: 0xffd700,
      },
      {
        width: 0.1,
        height: 0.42,
        depth: 0.16,
        color: 0x000080,
        spine: 0xffffff,
      },
      {
        width: 0.09,
        height: 0.4,
        depth: 0.14,
        color: 0xb8860b,
        spine: 0x000000,
      },
      {
        width: 0.11,
        height: 0.46,
        depth: 0.17,
        color: 0x800080,
        spine: 0xffffff,
      },
      {
        width: 0.08,
        height: 0.38,
        depth: 0.13,
        color: 0x2f4f4f,
        spine: 0xffd700,
      },
      {
        width: 0.1,
        height: 0.44,
        depth: 0.16,
        color: 0xd2691e,
        spine: 0xffffff,
      },
    ],
    // 2층 책들
    [
      {
        width: 0.09,
        height: 0.41,
        depth: 0.15,
        color: 0x8b4513,
        spine: 0xffffff,
      },
      {
        width: 0.07,
        height: 0.36,
        depth: 0.12,
        color: 0x556b2f,
        spine: 0xffd700,
      },
      {
        width: 0.13,
        height: 0.5,
        depth: 0.2,
        color: 0x4b0082,
        spine: 0xffffff,
      },
      {
        width: 0.08,
        height: 0.39,
        depth: 0.14,
        color: 0x8b0000,
        spine: 0x000000,
      },
      {
        width: 0.1,
        height: 0.43,
        depth: 0.16,
        color: 0x2e8b57,
        spine: 0xffffff,
      },
      {
        width: 0.09,
        height: 0.37,
        depth: 0.15,
        color: 0x8b008b,
        spine: 0xffd700,
      },
    ],
    // 3층 책들
    [
      {
        width: 0.11,
        height: 0.47,
        depth: 0.17,
        color: 0x483d8b,
        spine: 0xffffff,
      },
      {
        width: 0.08,
        height: 0.35,
        depth: 0.13,
        color: 0x8b4513,
        spine: 0x000000,
      },
      {
        width: 0.12,
        height: 0.49,
        depth: 0.18,
        color: 0x228b22,
        spine: 0xffffff,
      },
      {
        width: 0.09,
        height: 0.4,
        depth: 0.15,
        color: 0xcd853f,
        spine: 0xffd700,
      },
      {
        width: 0.1,
        height: 0.45,
        depth: 0.16,
        color: 0x4682b4,
        spine: 0xffffff,
      },
      {
        width: 0.08,
        height: 0.38,
        depth: 0.14,
        color: 0x9932cc,
        spine: 0x000000,
      },
    ],
    // 4층 책들
    [
      {
        width: 0.07,
        height: 0.33,
        depth: 0.12,
        color: 0xdc143c,
        spine: 0xffffff,
      },
      {
        width: 0.11,
        height: 0.46,
        depth: 0.17,
        color: 0x008b8b,
        spine: 0xffd700,
      },
      {
        width: 0.09,
        height: 0.41,
        depth: 0.15,
        color: 0x8b0000,
        spine: 0xffffff,
      },
      {
        width: 0.1,
        height: 0.44,
        depth: 0.16,
        color: 0x32cd32,
        spine: 0x000000,
      },
      {
        width: 0.08,
        height: 0.37,
        depth: 0.13,
        color: 0x800000,
        spine: 0xffffff,
      },
      {
        width: 0.12,
        height: 0.48,
        depth: 0.18,
        color: 0x191970,
        spine: 0xffd700,
      },
    ],
    // 5층 책들
    [
      {
        width: 0.09,
        height: 0.42,
        depth: 0.15,
        color: 0x8b4513,
        spine: 0xffffff,
      },
      {
        width: 0.08,
        height: 0.36,
        depth: 0.13,
        color: 0x556b2f,
        spine: 0x000000,
      },
      {
        width: 0.1,
        height: 0.45,
        depth: 0.16,
        color: 0x4b0082,
        spine: 0xffffff,
      },
      {
        width: 0.11,
        height: 0.47,
        depth: 0.17,
        color: 0xb22222,
        spine: 0xffd700,
      },
      {
        width: 0.07,
        height: 0.34,
        depth: 0.12,
        color: 0x2f4f4f,
        spine: 0xffffff,
      },
    ],
  ];

  //  층별로 책 배치 (Y축 위치)
  bookData.forEach((shelfBooks, shelfIndex) => {
    let xOffset = -0.9;

    shelfBooks.forEach((book, bookIndex) => {
      // 책 본체
      const bookGeometry = new THREE.BoxGeometry(
        book.width,
        book.height,
        book.depth
      );
      const bookMaterial = new THREE.MeshLambertMaterial({ color: book.color });
      const bookMesh = new THREE.Mesh(bookGeometry, bookMaterial);

      //  Y축 위치 계산 - 선반 바로 위에 놓게
      const shelfY = 0.6 + shelfIndex * 0.6; // 선반의 Y 위치
      const shelfThickness = 0.05; // 선반 두께
      const bookBottomY = shelfY + shelfThickness / 2; // 선반 윗면 Y 위치

      bookMesh.position.set(
        -3 + xOffset + book.width / 2,
        bookBottomY + book.height / 2, //  선반 윗면에서 책 높이의 절반만큼 위
        -2.05 + book.depth / 2
      );
      bookMesh.castShadow = true;

      // 책 등면 디자인 개선
      const spineGeometry = new THREE.PlaneGeometry(
        book.height * 0.85,
        book.width * 0.7
      );
      const spineMaterial = new THREE.MeshLambertMaterial({
        color: book.spine,
        transparent: true,
        opacity: 0.9,
      });
      const spine = new THREE.Mesh(spineGeometry, spineMaterial);
      spine.position.set(0, 0, book.depth / 2 + 0.002);
      spine.rotation.z = Math.PI / 2;
      bookMesh.add(spine);

      // 책 등면에 선 디테일 추가
      const lineGeometry1 = new THREE.PlaneGeometry(
        book.height * 0.7,
        book.width * 0.05
      );
      const lineMaterial1 = new THREE.MeshLambertMaterial({
        color: book.color === 0xffffff ? 0x000000 : book.spine,
        transparent: true,
        opacity: 0.8,
      });
      const line1 = new THREE.Mesh(lineGeometry1, lineMaterial1);
      line1.position.set(0, book.height * 0.2, book.depth / 2 + 0.003);
      line1.rotation.z = Math.PI / 2;
      bookMesh.add(line1);

      const line2 = new THREE.Mesh(lineGeometry1, lineMaterial1);
      line2.position.set(0, -book.height * 0.2, book.depth / 2 + 0.003);
      line2.rotation.z = Math.PI / 2;
      bookMesh.add(line2);

      // 책 상단에 작은 제목 영역
      const titleGeometry = new THREE.PlaneGeometry(
        book.height * 0.4,
        book.width * 0.15
      );
      const titleMaterial = new THREE.MeshLambertMaterial({
        color: book.spine === 0xffffff ? 0x000000 : 0xffffff,
        transparent: true,
        opacity: 0.7,
      });
      const title = new THREE.Mesh(titleGeometry, titleMaterial);
      title.position.set(0, book.height * 0.3, book.depth / 2 + 0.004);
      title.rotation.z = Math.PI / 2;
      bookMesh.add(title);

      // 책마다 약간 다른 기울기 (더 자연스럽게)
      const tiltAmount = (Math.random() - 0.5) * 0.08;
      bookMesh.rotation.z = tiltAmount;

      // 가끔 책이 살짝 앞으로 나와있게
      if (Math.random() < 0.2) {
        bookMesh.position.z += 0.02;
      }

      bookshelfGroup.add(bookMesh);
      xOffset += book.width + 0.008;
    });
  });

  //  책장 장식 요소들 (Y축 위치)
  // 작은 시계 (2층 선반 위에)
  const clockGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8);
  const clockMaterial = new THREE.MeshLambertMaterial({ color: 0x2f4f4f });
  const clock = new THREE.Mesh(clockGeometry, clockMaterial);

  const shelf2Y = 0.6 + 1 * 0.6; // 2층 선반 Y 위치
  clock.position.set(-2.2, shelf2Y + 0.05 / 2 + 0.01, -1.9); //  선반 바로 위에
  clock.rotation.x = Math.PI / 2;
  clock.castShadow = true;
  bookshelfGroup.add(clock);

  // 작은 액자 (3층 선반 위에)
  const frameGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.015);
  const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);

  const shelf3Y = 0.6 + 2 * 0.6; // 3층 선반 Y 위치
  frame.position.set(-2.3, shelf3Y + 0.05 / 2 + 0.06, -1.92); //  선반 바로 위에
  frame.castShadow = true;
  bookshelfGroup.add(frame);

  //  상단 장식용 작은 화분 (맨 위 선반 위에)
  const topPot = createSmallPlant();
  topPot.position.set(-3, 2.95 + 0.05 / 2 + 0.075, -1.8); //  최상단 선반 바로 위에
  topPot.scale.set(0.6, 0.6, 0.6);
  bookshelfGroup.add(topPot);

  // 북엔드 (책받침) - 1층 선반 위에
  const bookendGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.15);
  const bookendMaterial = new THREE.MeshLambertMaterial({ color: 0x2f4f4f });

  // 왼쪽 북엔드
  const leftBookend = new THREE.Mesh(bookendGeometry, bookendMaterial);
  const shelf1Y = 0.6; // 1층 선반 Y 위치
  leftBookend.position.set(-3.92, shelf1Y + 0.05 / 2 + 0.15, -1.98); //  선반 바로 위에
  leftBookend.castShadow = true;
  bookshelfGroup.add(leftBookend);

  // 오른쪽 북엔드
  const rightBookend = new THREE.Mesh(bookendGeometry, bookendMaterial);
  rightBookend.position.set(-2.08, shelf1Y + 0.05 / 2 + 0.15, -1.98); //  선반 바로 위에
  rightBookend.castShadow = true;
  bookshelfGroup.add(rightBookend);

  scene.add(bookshelfGroup);
  furniture.push(bookshelfGroup);
}

//  createSmallPlant 함수 (Y축 위치 정확히 설정)
function createSmallPlant() {
  const plantGroup = new THREE.Group();

  const potGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
  const potMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const pot = new THREE.Mesh(potGeometry, potMaterial);
  pot.position.y = 0.075; //  화분 바닥이 기준점에 닿도록
  pot.castShadow = true;
  plantGroup.add(pot);

  const leafGeometry = new THREE.SphereGeometry(0.05, 6, 6);
  const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });

  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.position.set(
      (Math.random() - 0.5) * 0.15,
      0.15 + Math.random() * 0.1, //  화분 위쪽에 배치
      (Math.random() - 0.5) * 0.15
    );
    leaf.castShadow = true;
    plantGroup.add(leaf);
  }

  return plantGroup;
  ㅈ지;
}

// 책상 생성
function createDesk() {
  const deskGroup = new THREE.Group();
  const deskTopGeometry = new THREE.BoxGeometry(2, 0.1, 1);
  const deskMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const deskTop = new THREE.Mesh(deskTopGeometry, deskMaterial);
  deskTop.position.set(-3, 1, 1);
  deskTop.castShadow = true;
  deskGroup.add(deskTop);

  for (let i = 0; i < 4; i++) {
    const legGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
    const leg = new THREE.Mesh(legGeometry, deskMaterial);
    const x = -3 + (i % 2) * 1.8 - 0.9;
    const z = 1 + Math.floor(i / 2) * 0.8 - 0.4;
    leg.position.set(x, 0.5, z);
    leg.castShadow = true;
    deskGroup.add(leg);
  }

  // 노트북 생성
  createSimpleLaptop(deskGroup); // ← 이미 기본값(영상 자동 재생) 적용됨

  createDetailedMug(deskGroup);
  createHeart(deskGroup);

  scene.add(deskGroup);
  furniture.push(deskGroup);
}

function createSimpleLaptop(deskGroup) {
  const laptopGroup = new THREE.Group();

  /* ── 베이스(키보드 부분) ─────────────────────────────────────────── */
  const laptopBottomGeometry = new THREE.BoxGeometry(0.8, 0.02, 0.6);
  const laptopBottomMaterial = new THREE.MeshLambertMaterial({
    color: 0x333333,
  });
  const laptopBottom = new THREE.Mesh(
    laptopBottomGeometry,
    laptopBottomMaterial
  );
  laptopBottom.position.set(0, 0, 0);
  laptopBottom.castShadow = true;
  laptopGroup.add(laptopBottom);

  /* ── 힌지(축) ──────────────────────────────────────────────────── */
  const hingeGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);
  const hingeMaterial = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  const hinge = new THREE.Mesh(hingeGeometry, hingeMaterial);
  hinge.position.set(0, 0.01, 0.3);
  hinge.rotation.z = Math.PI / 2;
  hinge.castShadow = true;
  laptopGroup.add(hinge);

  /* ── 화면(Lid) 그룹 추가 ────────────────────────────────────────── */
  //  화면 요소들을 lidGroup에 담아 힌지 기준으로 회전
  const lidGroup = new THREE.Group();
  lidGroup.name = "laptopLid";
  lidGroup.position.set(0, 0.01, 0.3);
  lidGroup.rotation.x = -Math.PI / 360; //  초기 열림 각도 ✅
  laptopGroup.add(lidGroup);

  //  화면 뒷면, 베젤, 실제 화면을 lidGroup에 추가
  const lidBackGeometry = new THREE.BoxGeometry(0.82, 0.52, 0.02);
  const lidBackMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const lidBack = new THREE.Mesh(lidBackGeometry, lidBackMaterial);
  lidBack.position.set(0, 0.26, -0.01); //  lidGroup 내부 좌표
  lidBack.castShadow = true;
  lidGroup.add(lidBack);

  const bezelGeometry = new THREE.BoxGeometry(0.78, 0.48, 0.01);
  const bezelMaterial = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial);
  bezel.position.set(0, 0.26, 0.0);
  bezel.castShadow = true;
  lidGroup.add(bezel);

  /* ── 실제 화면(텍스처가 있는 부분) ──────────────────────────────── */
  createLaptopScreen(lidGroup); //  lidGroup 전달

  /* ── 키보드 & 터치패드 & 파워 버튼 ─────────────── */
  createLaptopKeyboard(laptopGroup);

  laptopGroup.position.set(-3, 1.06, 1); // 책상 위 위치
  deskGroup.add(laptopGroup);
  furniture.push(lidGroup);
}

function createLaptopScreen(lidGroup) {
  // 기존 화면 제거
  const existing = lidGroup.children.find(
    (child) => child.geometry?.type === "PlaneGeometry"
  );
  if (existing) {
    lidGroup.remove(existing);
  }

  const screenGeo = new THREE.PlaneGeometry(0.72, 0.405);
  screenGeo.rotateY(Math.PI);

  let screenMat;
  let screen;

  if (isDarkMode) {
    // 다크모드일 경우 PNG 이미지 텍스처 사용
    const texture = new THREE.TextureLoader().load(
      "textures/darkmode-screen.gif"
    );

    screenMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true, // 텍스처에 알파값 있을 경우
    });
    screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.27, -0.03);
    lidGroup.add(screen);
  } else {
    // 기존 Canvas 기반 애니메이션 방식
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext("2d");

    let videoTime = 0;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.flipY = false;

    screenMat = new THREE.MeshLambertMaterial({
      map: texture,
      emissive: 0x112233,
      emissiveIntensity: 0.3,
    });
    screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.27, -0.03);
    screen.userData = { isPlaying: true };
    lidGroup.add(screen);

    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    renderer.domElement.addEventListener("pointerdown", (e) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(mouse, camera);
      if (ray.intersectObject(screen).length) {
        screen.userData.isPlaying = !screen.userData.isPlaying;
      }
    });

    function updateScreen() {
      const isPlaying = screen.userData.isPlaying;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying) {
        videoTime += 0.03;
        // 배경 그라디언트
        const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        g.addColorStop(0, "#1a202c");
        g.addColorStop(0.5, "#2d3748");
        g.addColorStop(1, "#4a5568");
        ctx.fillStyle = g;
        ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 150);
        // 움직이는 블록
        const colors = [
          "#FF6B9D",
          "#45FFCA",
          "#4FACFE",
          "#FFBE0B",
          "#8B5CF6",
          "#06FFA5",
        ];
        for (let i = 0; i < 9; i++) {
          const x = 80 + (i % 3) * 200 + Math.sin(videoTime + i) * 30;
          const y =
            80 + Math.floor(i / 3) * 120 + Math.cos(videoTime * 1.5 + i) * 20;
          const size = 100 + Math.sin(videoTime * 2 + i) * 30;
          ctx.globalAlpha = 0.8 + Math.sin(videoTime + i) * 0.2;
          ctx.fillStyle = colors[i % colors.length];
          ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
        // 중앙 재생 버튼
        const cx = canvas.width / 2,
          cy = canvas.height / 2;
        ctx.fillStyle = "rgba(255,0,0,0.85)";
        ctx.beginPath();
        ctx.arc(cx, cy, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy - 20);
        ctx.lineTo(cx - 15, cy + 20);
        ctx.lineTo(cx + 20, cy);
        ctx.fill();
      } else {
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 36px Arial";
        ctx.textAlign = "center";
        ctx.fillText("⏸ Paused", canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = "20px Arial";
        ctx.fillText(
          "Click screen to play",
          canvas.width / 2,
          canvas.height / 2 + 30
        );
      }

      texture.needsUpdate = true;
    }

    lidGroup.userData.updateScreen = updateScreen;
  }
}

//  노트북 키보드 (분리되지 않도록 베이스에 직접 부착)
function createLaptopKeyboard(laptopGroup) {
  // 키보드 베이스 (노트북 베이스와 통합)
  const keyboardBgGeometry = new THREE.PlaneGeometry(0.65, 0.35);
  const keyboardBgMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const keyboardBg = new THREE.Mesh(keyboardBgGeometry, keyboardBgMaterial);
  keyboardBg.position.set(0, 0.011, -0.1); // 노트북 앞쪽에 배치
  keyboardBg.rotation.x = -Math.PI / 2;
  laptopGroup.add(keyboardBg);

  // 키들 생성 (더 작게)
  const keyGeometry = new THREE.BoxGeometry(0.03, 0.004, 0.03);
  const keyMaterial = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });

  // 더 작은 키보드 레이아웃
  const keyRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];

  const totalRows = keyRows.length;
  keyRows.forEach((row, rowIndex) => {
    const zOffset = -0.2 + rowIndex * 0.04; // ✅ 상하 순서 반전

    const startX = (row.length - 1) * 0.02; // 좌우 반전 유지
    row.forEach((keyChar, keyIndex) => {
      const key = new THREE.Mesh(keyGeometry, keyMaterial);
      key.position.set(
        startX - keyIndex * 0.04, // ✅ 좌우 반전
        0.013,
        zOffset
      );
      key.castShadow = true;
      laptopGroup.add(key);
    });
  });

  // 스페이스바
  const spaceBarGeometry = new THREE.BoxGeometry(0.2, 0.004, 0.03);
  const spaceBar = new THREE.Mesh(spaceBarGeometry, keyMaterial);
  spaceBar.position.set(0, 0.013, -0.2);
  spaceBar.castShadow = true;
  laptopGroup.add(spaceBar);
}

// 더 자세한 머그컵 생성 함수 (기존과 동일)
function createDetailedMug(deskGroup) {
  const mugGroup = new THREE.Group();

  // 머그컵 본체
  const mugGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.15, 12);
  const mugMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mug = new THREE.Mesh(mugGeometry, mugMaterial);
  mug.position.set(0, 0, 0);
  mug.castShadow = true;
  mugGroup.add(mug);

  // 머그컵 손잡이
  const handleGeometry = new THREE.TorusGeometry(0.06, 0.008, 8, 16, Math.PI);
  const handleMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.set(0.08, 0, 0);
  handle.rotation.y = Math.PI / 2;
  handle.rotation.z = Math.PI / 2;
  handle.castShadow = true;
  mugGroup.add(handle);

  // 머그컵 안쪽 (커피)
  const coffeeGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12);
  const coffeeMaterial = new THREE.MeshLambertMaterial({
    color: 0x8b4513,
    emissive: 0x2f1b14,
    emissiveIntensity: 0.2,
  });
  const coffee = new THREE.Mesh(coffeeGeometry, coffeeMaterial);
  coffee.position.set(0, 0.065, 0);
  mugGroup.add(coffee);

  // 머그컵에 하트 무늬 추가
  const heartGeometry = new THREE.PlaneGeometry(0.04, 0.04);
  const heartMaterial = new THREE.MeshLambertMaterial({
    color: 0xff69b4,
    emissive: 0xff69b4,
    emissiveIntensity: 0.3,
  });
  const heartDecor = new THREE.Mesh(heartGeometry, heartMaterial);
  heartDecor.position.set(0.081, 0, 0);
  heartDecor.rotation.y = Math.PI / 2;
  mugGroup.add(heartDecor);

  // 증기 효과
  for (let i = 0; i < 3; i++) {
    const steamGeometry = new THREE.SphereGeometry(0.01, 6, 6);
    const steamMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    const steam = new THREE.Mesh(steamGeometry, steamMaterial);
    steam.position.set(
      (Math.random() - 0.5) * 0.05,
      0.08 + i * 0.02,
      (Math.random() - 0.5) * 0.05
    );
    mugGroup.add(steam);
  }

  mugGroup.position.set(-2.3, 1.18, 0.7);
  deskGroup.add(mugGroup);
}

// 하트 장식 생성 함수 (기존과 동일)
function createHeart(deskGroup) {
  const heartGroup = new THREE.Group();

  // 하트 모양 만들기
  const heartGeometry1 = new THREE.SphereGeometry(0.03, 8, 8);
  const heartMaterial = new THREE.MeshLambertMaterial({
    color: 0xff1493,
    emissive: 0xff1493,
    emissiveIntensity: 0.2,
  });

  // 왼쪽 하트 구
  const heartLeft = new THREE.Mesh(heartGeometry1, heartMaterial);
  heartLeft.position.set(-0.02, 0.02, 0);
  heartLeft.castShadow = true;
  heartGroup.add(heartLeft);

  // 오른쪽 하트 구
  const heartRight = new THREE.Mesh(heartGeometry1, heartMaterial);
  heartRight.position.set(0.02, 0.02, 0);
  heartRight.castShadow = true;
  heartGroup.add(heartRight);

  // 하트 아래쪽 삼각형
  const heartBottomGeometry = new THREE.ConeGeometry(0.03, 0.06, 4);
  const heartBottom = new THREE.Mesh(heartBottomGeometry, heartMaterial);
  heartBottom.position.set(0, -0.01, 0);
  heartBottom.rotation.z = Math.PI;
  heartBottom.castShadow = true;
  heartGroup.add(heartBottom);

  heartGroup.position.set(-3.7, 1.12, 0.8);
  heartGroup.scale.set(0.8, 0.8, 0.8);
  deskGroup.add(heartGroup);
}

//  화면 위치와 각도를 정확히 맞춘 애니메이션 화면
function createAnimatedScreen(laptopGroup) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext("2d");

  let videoTime = 0;

  // ✅ 먼저 texture 정의
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = false;

  // ✅ 안전하게 클로저에서 texture 사용
  const updateCanvas = () => {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    videoTime += 0.02;

    ctx.fillStyle = "#1a202c";
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 60);

    const colors = [
      "#FF3366",
      "#33FF99",
      "#3366FF",
      "#FF9933",
      "#9933FF",
      "#33FFFF",
    ];
    for (let i = 0; i < 6; i++) {
      const x = 30 + (i % 3) * 150 + Math.sin(videoTime + i) * 20;
      const y =
        30 + Math.floor(i / 3) * 100 + Math.cos(videoTime + i * 0.5) * 15;
      const size = 80 + Math.sin(videoTime * 2 + i) * 20;

      ctx.fillStyle = colors[i];
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, y, size, size);

      ctx.shadowColor = colors[i];
      ctx.shadowBlur = 10;
      ctx.fillRect(x + 5, y + 5, size - 10, size - 10);
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1.0;

    const centerX = canvas.width / 2;
    const centerY = (canvas.height - 50) / 2;

    ctx.fillStyle = "rgba(255, 0, 0, 0.9)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(centerX - 12, centerY - 18);
    ctx.lineTo(centerX - 12, centerY + 18);
    ctx.lineTo(centerX + 15, centerY);
    ctx.fill();

    const controlY = canvas.height - 40;
    ctx.fillStyle = "#4a5568";
    ctx.fillRect(20, controlY, canvas.width - 40, 6);

    const progress = (Math.sin(videoTime * 0.3) + 1) / 2;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(20, controlY, (canvas.width - 40) * progress, 6);

    ctx.fillStyle = "white";
    ctx.font = "bold 16px Arial";
    const currentTime = Math.floor(progress * 180);
    const minutes = Math.floor(currentTime / 60);
    const seconds = currentTime % 60;
    ctx.fillText(
      `${minutes}:${seconds.toString().padStart(2, "0")} / 3:00`,
      25,
      controlY + 25
    );

    ctx.fillStyle = "white";
    ctx.font = "bold 20px Arial";
    ctx.fillText("🎵 Cute Cat Compilation", 20, 35);

    texture.needsUpdate = true;
  };

  const screenGeometry = new THREE.PlaneGeometry(0.75, 0.42);
  const screenMaterial = new THREE.MeshLambertMaterial({
    map: texture,
    emissive: 0x001122,
    emissiveIntensity: 0.2,
  });

  const screen = new THREE.Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, 0.285, 0.265);
  screen.rotation.x = -Math.PI / 3;
  laptopGroup.add(screen);

  laptopGroup.userData = laptopGroup.userData || {};
  laptopGroup.userData.updateScreen = updateCanvas;
}

// 러그 생성
function createRug() {
  const rugGeometry = new THREE.CircleGeometry(2, 32);
  const rugTexture = createRugTexture();
  const rugMaterial = new THREE.MeshLambertMaterial({ map: rugTexture });
  const rug = new THREE.Mesh(rugGeometry, rugMaterial);
  rug.position.set(0, 0.01, 0);
  rug.rotation.x = -Math.PI / 2;
  rug.receiveShadow = true;
  scene.add(rug);
  furniture.push(rug);
}

function createWindow() {
  windowGroup = new THREE.Group();

  //  창틀 색상을 더 진한 색으로 (구분되도록)
  const frameGeometry = new THREE.BoxGeometry(2, 2, 0.1);
  const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x2f2f2f }); //  더 진한 회색
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.set(3, 3, 5.95);
  windowGroup.add(frame);

  // 창문 십자 프레임 추가
  const crossFrameV = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 2, 0.05),
    frameMaterial
  );
  crossFrameV.position.set(3, 3, 5.98);
  windowGroup.add(crossFrameV);

  const crossFrameH = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.05, 0.05),
    frameMaterial
  );
  crossFrameH.position.set(3, 3, 5.98);
  windowGroup.add(crossFrameH);

  // 창문 밖 풍경을 먼저 생성
  createOutsideView(windowGroup);

  const glassGeometry = new THREE.PlaneGeometry(1.8, 1.8);
  const glassMaterial = new THREE.MeshLambertMaterial({
    color: 0x87ceeb,
    transparent: true,
    opacity: 0.1, //  유리 투명도 높임
  });
  const glass = new THREE.Mesh(glassGeometry, glassMaterial);
  glass.position.set(3, 3, 5.96);
  windowGroup.add(glass);

  const curtainGeometry = new THREE.PlaneGeometry(2.5, 2.5);
  const curtainMaterial = new THREE.MeshLambertMaterial({
    color: 0xffd700,
    transparent: true,
    opacity: 0.5, //  커튼 투명도 높임
  });
  const curtain = new THREE.Mesh(curtainGeometry, curtainMaterial);
  curtain.position.set(3, 3, 5.94);
  windowGroup.add(curtain);

  scene.add(windowGroup);
  furniture.push(windowGroup);

  return windowGroup;
}

//  창문 밖 풍경을 정면으로 보이도록
function createOutsideView(windowGroup) {
  const windowBounds = {
    left: 3 - 0.9,
    right: 3 + 0.9,
    bottom: 3 - 0.9,
    top: 3 + 0.9,
  };

  // 하늘 배경을 더 밝게
  const skyGeometry = new THREE.PlaneGeometry(1.8, 1.8);
  const skyMaterial = new THREE.MeshLambertMaterial({
    color: 0x87ceeb, //  더 밝은 하늘색으로 복구
    emissive: 0x4169e1,
    emissiveIntensity: 0.2,
  });
  const sky = new THREE.Mesh(skyGeometry, skyMaterial);
  sky.position.set(3, 3, 5.92);
  sky.rotation.y = Math.PI;
  windowGroup.add(sky);

  // 구름들
  for (let i = 0; i < 3; i++) {
    const cloudGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.3,
    });
    const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);

    const cloudX = windowBounds.left + 0.2 + i * 0.4;
    const cloudY = windowBounds.bottom + 1.2 + Math.sin(i) * 0.2;

    cloud.position.set(cloudX, cloudY, 5.91);
    cloud.scale.set(1.2, 0.6, 1);
    windowGroup.add(cloud);

    cloud.userData = {
      originalX: cloud.position.x,
      speed: 0.001 + i * 0.0005,
      windowBounds: windowBounds,
    };
  }

  // 멀리 보이는 산들
  for (let i = 0; i < 4; i++) {
    const mountainGeometry = new THREE.ConeGeometry(0.15 + i * 0.05, 0.4, 6);
    const mountainMaterial = new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.3, 0.8, 0.4 - i * 0.05),
      emissive: 0x002200,
      emissiveIntensity: 0.2,
    });
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);

    const mountainX = windowBounds.left + 0.1 + i * 0.35;
    const mountainY = windowBounds.bottom + 0.4;

    mountain.position.set(mountainX, mountainY, 5.9);
    windowGroup.add(mountain);
  }

  // 나무들
  for (let i = 0; i < 3; i++) {
    const treeGroup = new THREE.Group();

    // 나무 줄기
    const trunkGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.25, 6);
    const trunkMaterial = new THREE.MeshLambertMaterial({
      color: 0xa0522d,
      emissive: 0x331100,
      emissiveIntensity: 0.2,
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.125;
    treeGroup.add(trunk);

    // 나무 잎
    const leavesGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const leavesMaterial = new THREE.MeshLambertMaterial({
      color: 0x00ff00,
      emissive: 0x004400,
      emissiveIntensity: 0.3,
    });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 0.25;
    treeGroup.add(leaves);

    const treeX = windowBounds.left + 0.3 + i * 0.4;
    const treeY = windowBounds.bottom + 0.25;

    treeGroup.position.set(treeX, treeY, 5.89);
    treeGroup.scale.set(
      0.8 + Math.random() * 0.3,
      0.8 + Math.random() * 0.3,
      1
    );

    treeGroup.userData = {
      swaySpeed: 0.5 + Math.random() * 0.5,
      swayAmount: 0.02 + Math.random() * 0.02,
    };
    windowGroup.add(treeGroup);
  }

  // 태양
  const sunGeometry = new THREE.SphereGeometry(0.08, 8, 8);
  const sunMaterial = new THREE.MeshLambertMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.8,
  });
  const sun = new THREE.Mesh(sunGeometry, sunMaterial);
  sun.position.set(windowBounds.right - 0.3, windowBounds.top - 0.2, 5.88);
  windowGroup.add(sun);

  //  새
  const loader = new THREE.TextureLoader();
  const texture = loader.load("/textures/bird1.webp"); // 이미지 1장만 사용

  const birdCount = 6; // 생성할 새 수

  for (let i = 0; i < birdCount; i++) {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      opacity: 0.8 + Math.random() * 0.2, // 약간 랜덤한 투명도
    });

    const baseSize = 0.25;
    const scaleFactor = 0.7 + Math.random() * 4; // ✅ 0.7 ~ 1.9 배
    const geometry = new THREE.PlaneGeometry(
      baseSize * scaleFactor,
      baseSize * scaleFactor
    );

    const bird = new THREE.Mesh(geometry, material);

    // ✅ 위치: 창 주변에 무작위로 배치
    const x = windowBounds.left + 0.3 + Math.random() * 1.5;
    const y = windowBounds.bottom + 0.9 + Math.random() * 0.7;
    const z = 5.86 + Math.random() * 0.02;

    bird.position.set(x, y, z);
    bird.rotation.z = ((Math.random() - 0.5) * Math.PI) / 4; // ✅ -22.5 ~ +22.5도 회전
    bird.rotation.y = Math.PI; // 뒤집기 (원래 새처럼)

    windowGroup.add(bird);
  }

  //  추가로 더 큰 새 몇 마리 추가 (더 잘 보이도록)
  for (let i = 0; i < 2; i++) {
    const bigBirdGroup = new THREE.Group();

    // 큰 새 본체
    const bigBirdGeometry = new THREE.PlaneGeometry(0.08, 0.025);
    const bigBirdMaterial = new THREE.MeshLambertMaterial({
      color: 0xff6347, //  토마토 색 (더 밝고 눈에 띄는 색)
      emissive: 0xff6347,
      emissiveIntensity: 0.4,
    });
    const bigBird = new THREE.Mesh(bigBirdGeometry, bigBirdMaterial);
    bigBird.rotation.y = Math.PI;
    bigBirdGroup.add(bigBird);

    // 큰 새 윤곽선
    const bigOutlineGeometry = new THREE.PlaneGeometry(0.09, 0.028);
    const bigOutlineMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.6,
    });
    const bigOutline = new THREE.Mesh(bigOutlineGeometry, bigOutlineMaterial);
    bigOutline.position.z = -0.001;
    bigOutline.rotation.y = Math.PI;
    bigBirdGroup.add(bigOutline);

    const bigBirdX = windowBounds.left + 0.6 + i * 0.4;
    const bigBirdY = windowBounds.bottom + 1.3 + i * 0.1;

    bigBirdGroup.position.set(bigBirdX, bigBirdY, 5.86);
    bigBirdGroup.rotation.z = (Math.PI / 8) * (i % 2 === 0 ? 1 : -1);
    windowGroup.add(bigBirdGroup);
  }
}

// 고양이 생성
function createCat() {
  const catGroup = new THREE.Group();

  // 고양이 몸통 - 위치 조정
  const bodyGeometry = new THREE.BoxGeometry(0.4, 0.15, 0.3);
  const catMaterial = new THREE.MeshLambertMaterial({ color: 0xff8c00 });
  const body = new THREE.Mesh(bodyGeometry, catMaterial);
  body.position.y = 0.05;
  body.castShadow = true;
  catGroup.add(body);

  const headGeometry = new THREE.SphereGeometry(0.12, 12, 12);
  const head = new THREE.Mesh(headGeometry, catMaterial);
  head.position.set(0.25, 0.05, 0);
  head.castShadow = true;
  catGroup.add(head);

  const earGeometry = new THREE.ConeGeometry(0.04, 0.08, 6);
  const leftEar = new THREE.Mesh(earGeometry, catMaterial);
  leftEar.position.set(0.25, 0.15, 0.06);
  leftEar.castShadow = true;
  catGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeometry, catMaterial);
  rightEar.position.set(0.25, 0.15, -0.06);
  rightEar.castShadow = true;
  catGroup.add(rightEar);

  const tailGeometry = new THREE.CylinderGeometry(0.02, 0.04, 0.3, 8);
  const tail = new THREE.Mesh(tailGeometry, catMaterial);
  tail.position.set(-0.25, 0.15, 0);
  tail.rotation.z = Math.PI / 4;
  tail.castShadow = true;
  catGroup.add(tail);

  //  다리 생성 최적화 및 자연스러운 움직임을 위한 구조 개선
  const legGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.12, 8);
  const legPositions = [
    { x: 0.15, y: -0.06, z: 0.1, name: "frontLeft", phase: 0 }, //  위상 추가
    { x: 0.15, y: -0.06, z: -0.1, name: "frontRight", phase: Math.PI }, //  위상 추가
    { x: -0.15, y: -0.06, z: 0.1, name: "backLeft", phase: Math.PI }, //  위상 추가
    { x: -0.15, y: -0.06, z: -0.1, name: "backRight", phase: 0 }, //  위상 추가
  ];

  const legs = [];
  legPositions.forEach((pos, index) => {
    const leg = new THREE.Mesh(legGeometry, catMaterial);
    leg.position.set(pos.x, pos.y, pos.z);
    leg.castShadow = true;
    leg.userData = {
      name: pos.name,
      originalY: pos.y,
      originalRotationX: 0,
      phase: pos.phase, //  각 다리의 위상 저장
      stepHeight: 0.03, //  발걸음 높이 설정
    };
    catGroup.add(leg);
    legs.push(leg);
  });

  // 발가락/발톱 추가
  legPositions.forEach((pos, index) => {
    const pawGeometry = new THREE.SphereGeometry(0.02, 6, 6);
    const paw = new THREE.Mesh(pawGeometry, catMaterial);
    paw.position.set(pos.x, -0.12, pos.z);
    paw.castShadow = true;
    catGroup.add(paw);
  });

  // 고양이 눈
  const eyeGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(0.35, 0.1, 0.05);
  catGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.35, 0.1, -0.05);
  catGroup.add(rightEye);

  // 코 추가
  const noseGeometry = new THREE.SphereGeometry(0.008, 6, 6);
  const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xff69b4 });
  const nose = new THREE.Mesh(noseGeometry, noseMaterial);
  nose.position.set(0.37, 0.05, 0);
  catGroup.add(nose);

  catGroup.position.set(3.2, 1.0, 2);
  catGroup.rotation.y = Math.PI / 4;

  //  고양이 상태 데이터 구조 개선
  catGroup.userData = {
    originalPosition: { x: 3.2, y: 1.0, z: 2 },
    walkPath: [
      { x: 3.2, y: 1.0, z: 2 },
      { x: 2, y: 0.15, z: 1 },
      { x: 0, y: 0.15, z: 0 },
      { x: -2, y: 0.15, z: -1 },
      { x: 3.2, y: 1.0, z: 2 },
    ],
    currentTarget: 0,
    walkSpeed: 0.015,
    isWalking: false,
    walkCycle: 0,
    restTime: 0,
    legs: legs,
    //  자연스러운 움직임을 위한 추가 파라미터
    bodyBob: 0, // 몸통 상하 움직임
    headBob: 0, // 머리 상하 움직임
    earTwitch: 0, // 귀 움직임
    tailSwing: 0, // 꼬리 움직임
    stepCycle: 0, // 발걸음 사이클
  };

  scene.add(catGroup);
  cat = catGroup;
  furniture.push(catGroup);
}

// 고양이 움직임
if (cat && cat.userData) {
  const catData = cat.userData;
  const targetPos = catData.walkPath[catData.currentTarget];
  const currentPos = cat.position;

  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;
  const dz = targetPos.z - currentPos.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance > 0.15) {
    // 걷기 상태 설정
    catData.isWalking = true;
    catData.restTime = 0;

    // 걷기 사이클 업데이트 최적화
    catData.walkCycle += 0.25;
    catData.stepCycle += 0.3;

    // 목표 방향으로 이동
    cat.position.x += dx * catData.walkSpeed;
    cat.position.y += dy * catData.walkSpeed;
    cat.position.z += dz * catData.walkSpeed;

    // 이동 방향으로 회전 (더 부드럽게)
    const targetRotation = Math.atan2(dx, dz);
    cat.rotation.y += (targetRotation - cat.rotation.y) * 0.1;

    //  자연스러운 4족 보행 - 실제 고양이의 걸음걸이 패턴
    catData.legs.forEach((leg, index) => {
      const legData = leg.userData;
      const walkPhase = catData.stepCycle + legData.phase;

      // 다리 움직임 (앞뒤 스윙과 상하 움직임)
      const swingAmount = Math.sin(walkPhase) * 0.4;
      const liftAmount =
        Math.max(0, Math.sin(walkPhase * 2)) * legData.stepHeight;

      leg.rotation.x = swingAmount;
      leg.position.y = legData.originalY + liftAmount;

      //  발가락도 함께 움직이도록 개선
      const pawIndex = index + 5; // 발가락은 다리 다음에 추가됨
      if (cat.children[pawIndex]) {
        cat.children[pawIndex].position.y = -0.12 + liftAmount;
      }
    });

    //  걷기 시 몸통의 자연스러운 움직임
    catData.bodyBob += 0.2;
    const bodyBobAmount = Math.sin(catData.bodyBob) * 0.008;
    cat.children[0].position.y = 0.05 + bodyBobAmount; // 몸통
    cat.children[0].rotation.z = Math.sin(catData.walkCycle * 1.5) * 0.03; // 좌우 흔들림

    //  머리의 자연스러운 보행 움직임
    catData.headBob += 0.15;
    const headBobAmount = Math.sin(catData.headBob) * 0.012;
    cat.children[1].position.y = 0.05 + headBobAmount;
    cat.children[1].rotation.x = Math.sin(catData.walkCycle * 1.2) * 0.05; // 앞뒤 끄덕임

    //  귀의 자연스러운 움직임 (걷기 시)
    if (cat.children[2] && cat.children[3]) {
      catData.earTwitch += 0.3;
      cat.children[2].rotation.z = Math.sin(catData.earTwitch) * 0.08; // 좌귀
      cat.children[3].rotation.z = Math.sin(catData.earTwitch + 0.5) * 0.08; // 우귀
      cat.children[2].rotation.x = Math.sin(catData.earTwitch * 1.5) * 0.05;
      cat.children[3].rotation.x =
        Math.sin(catData.earTwitch * 1.5 + 0.3) * 0.05;
    }
  } else {
    // 목표 지점 도달 시 휴식
    catData.isWalking = false;
    catData.restTime += 0.016;

    //  다리를 원래 위치로 부드럽게 복귀
    catData.legs.forEach((leg, index) => {
      leg.rotation.x += (0 - leg.rotation.x) * 0.08;
      leg.position.y += (leg.userData.originalY - leg.position.y) * 0.08;

      // 발가락도 원래 위치로
      const pawIndex = index + 5;
      if (cat.children[pawIndex]) {
        cat.children[pawIndex].position.y +=
          (-0.12 - cat.children[pawIndex].position.y) * 0.08;
      }
    });

    //  몸통과 머리를 원래 위치로 부드럽게 복귀
    cat.children[0].position.y += (0.05 - cat.children[0].position.y) * 0.08;
    cat.children[0].rotation.z += (0 - cat.children[0].rotation.z) * 0.08;
    cat.children[1].position.y += (0.05 - cat.children[1].position.y) * 0.08;
    cat.children[1].rotation.x += (0 - cat.children[1].rotation.x) * 0.08;

    //  2-4초간 휴식 후 다음 목표로
    if (catData.restTime > 2 + Math.random() * 2) {
      catData.currentTarget =
        (catData.currentTarget + 1) % catData.walkPath.length;
      catData.restTime = 0;
    }

    //  휴식 중 자연스러운 그루밍 행동
    if (Math.random() < 0.003) {
      const groomingIntensity = Math.sin(elapsedTime * 6) * 0.2;
      cat.children[1].rotation.x = groomingIntensity; // 머리 그루밍
      cat.children[1].rotation.y = Math.sin(elapsedTime * 4) * 0.1; // 좌우 그루밍
    }

    //  휴식 중 귀의 독립적인 움직임
    if (cat.children[2] && cat.children[3]) {
      catData.earTwitch += 0.1;
      // 각 귀가 독립적으로 움직임
      cat.children[2].rotation.z = Math.sin(catData.earTwitch * 2) * 0.06;
      cat.children[3].rotation.z = Math.sin(catData.earTwitch * 2.3 + 1) * 0.06;

      // 가끔 귀가 뒤로 젖혀지는 움직임
      if (Math.random() < 0.002) {
        cat.children[2].rotation.x = -0.3;
        cat.children[3].rotation.x = -0.3;
      } else {
        cat.children[2].rotation.x += (0 - cat.children[2].rotation.x) * 0.05;
        cat.children[3].rotation.x += (0 - cat.children[3].rotation.x) * 0.05;
      }
    }
  }

  //  꼬리 움직임 최적화 - 상황에 따른 자연스러운 움직임
  if (cat.children[4]) {
    catData.tailSwing += catData.isWalking ? 0.2 : 0.08;

    if (catData.isWalking) {
      // 걸을 때: 균형을 위한 큰 움직임
      cat.children[4].rotation.x = Math.sin(catData.tailSwing * 1.8) * 0.35;
      cat.children[4].rotation.z =
        Math.PI / 4 + Math.sin(catData.tailSwing * 1.2) * 0.25;
      cat.children[4].rotation.y = Math.sin(catData.tailSwing * 0.8) * 0.15;
    } else {
      // 휴식 시: 부드럽고 느린 움직임
      cat.children[4].rotation.x = Math.sin(catData.tailSwing * 1.2) * 0.15;
      cat.children[4].rotation.z =
        Math.PI / 4 + Math.sin(catData.tailSwing * 0.8) * 0.08;

      // 가끔 꼬리가 빠르게 흔들리는 움직임 (고양이의 감정 표현)
      if (Math.random() < 0.001) {
        cat.children[4].rotation.x = Math.sin(elapsedTime * 15) * 0.4;
      }
    }
  }
}

// 꽃 생성
function createFlowers() {
  const flowerPositions = [
    { x: -4.5, y: 0.3, z: 4 },
    { x: 1, y: 0.3, z: -4 },
    { x: -1, y: 0.3, z: 3 },
    { x: 4, y: 0.3, z: -1 },
    { x: -2, y: 0.3, z: -3 },
  ];

  flowerPositions.forEach((pos, index) => {
    const flowerGroup = new THREE.Group();

    const stemGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.25, 6);
    const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.set(0, 0.125, 0);
    stem.castShadow = true;
    flowerGroup.add(stem);

    const petalColors = [0xff69b4, 0xff1493, 0xffb6c1, 0xff6347, 0xffa500];
    const petalGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const petalMaterial = new THREE.MeshLambertMaterial({
      color: petalColors[index],
    });

    for (let i = 0; i < 6; i++) {
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      const angle = (i / 6) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.04, 0.25, Math.sin(angle) * 0.04);
      petal.castShadow = true;
      flowerGroup.add(petal);
    }

    const centerGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.set(0, 0.25, 0);
    center.castShadow = true;
    flowerGroup.add(center);

    flowerGroup.position.set(pos.x, pos.y, pos.z);
    scene.add(flowerGroup);
    flowers.push(flowerGroup);
  });
}

// 나비 생성
function createButterflies() {
  const butterflyPositions = [
    { x: -2, y: 2, z: 1 },
    { x: 2, y: 3, z: -1 },
    { x: 0, y: 2.5, z: 2 },
  ];

  butterflyPositions.forEach((pos, index) => {
    const butterflyGroup = new THREE.Group();

    const bodyGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    butterflyGroup.add(body);

    const wingGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    wingGeometry.scale(1.5, 0.1, 1);
    const wingColors = [0xff69b4, 0x9370db, 0x00ced1];
    const wingMaterial = new THREE.MeshLambertMaterial({
      color: wingColors[index],
    });

    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.03, 0, 0);
    leftWing.castShadow = true;
    butterflyGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.03, 0, 0);
    rightWing.castShadow = true;
    butterflyGroup.add(rightWing);

    const antennaGeometry = new THREE.CylinderGeometry(0.002, 0.002, 0.04, 4);
    const antennaMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });

    const leftAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    leftAntenna.position.set(-0.01, 0.05, 0.02);
    leftAntenna.rotation.z = Math.PI / 6;
    butterflyGroup.add(leftAntenna);

    const rightAntenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    rightAntenna.position.set(0.01, 0.05, 0.02);
    rightAntenna.rotation.z = -Math.PI / 6;
    butterflyGroup.add(rightAntenna);

    butterflyGroup.position.set(pos.x, pos.y, pos.z);
    butterflyGroup.userData = {
      originalPosition: { x: pos.x, y: pos.y, z: pos.z },
    };
    scene.add(butterflyGroup);
    butterflies.push(butterflyGroup);
  });
}

// 벽 장식 추가
function createWallDecorations() {
  const wallButterflyPositions = [
    { x: -2, y: 3, z: -5.98 },
    { x: 1, y: 2.5, z: -5.98 },
    { x: -4, y: 3.5, z: -5.98 },
  ];

  wallButterflyPositions.forEach((pos, index) => {
    const butterflyGeometry = new THREE.PlaneGeometry(0.2, 0.15);
    const butterflyColors = [0xff69b4, 0x9370db, 0x00ced1];
    const butterflyMaterial = new THREE.MeshLambertMaterial({
      color: butterflyColors[index],
      transparent: true,
      opacity: 0.8,
    });
    const wallButterfly = new THREE.Mesh(butterflyGeometry, butterflyMaterial);
    wallButterfly.position.set(pos.x, pos.y, pos.z);
    scene.add(wallButterfly);
    furniture.push(wallButterfly);
  });
}

// 장식품 생성
function createDecorations() {
  //  potPositions 배열에서 책장과 겹치는 위치 제거
  const potPositions = [
    { x: 1, y: 0.15, z: 1 },
    { x: -1, y: 0.15, z: 3 },
    { x: 2, y: 0.15, z: -1 },
    { x: -4.5, y: 0.15, z: 0 },
    { x: 0, y: 0.15, z: -3.5 },
  ];

  potPositions.forEach((pos, index) => {
    const potGroup = new THREE.Group();

    // 큰 화분
    const potGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8);
    const potColors = [0xcd853f, 0x8b4513, 0xa0522d, 0xd2691e, 0xbc8f8f];
    const potMaterial = new THREE.MeshLambertMaterial({
      color: potColors[index],
    });
    const pot = new THREE.Mesh(potGeometry, potMaterial);
    pot.castShadow = true;
    potGroup.add(pot);

    const plantGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const plantMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const plant = new THREE.Mesh(plantGeometry, plantMaterial);
    plant.position.y = 0.4;
    plant.castShadow = true;
    potGroup.add(plant);

    potGroup.position.set(pos.x, pos.y, pos.z);
    scene.add(potGroup);
    furniture.push(potGroup);
  });

  const framePositions = [
    { x: -1, y: 2.5, z: -5.95 },
    { x: 1, y: 2.5, z: -5.95 },
    { x: -3, y: 3, z: -5.95 },
  ];

  framePositions.forEach((pos, index) => {
    const frameGroup = new THREE.Group();

    //  더 두꺼운 액자 프레임
    const frameGeometry = new THREE.BoxGeometry(0.8, 0.6, 0.08);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.castShadow = true;
    frameGroup.add(frame);

    //  액자 안쪽 테두리 추가
    const innerFrameGeometry = new THREE.BoxGeometry(0.75, 0.55, 0.06);
    const innerFrameMaterial = new THREE.MeshLambertMaterial({
      color: 0xdaa520,
    });
    const innerFrame = new THREE.Mesh(innerFrameGeometry, innerFrameMaterial);
    innerFrame.position.z = 0.01;
    frameGroup.add(innerFrame);

    //  더 디테일한 그림
    const pictureGeometry = new THREE.PlaneGeometry(0.65, 0.45);
    const pictureTexture = createPictureTexture(index);
    const pictureMaterial = new THREE.MeshLambertMaterial({
      map: pictureTexture,
    });
    const picture = new THREE.Mesh(pictureGeometry, pictureMaterial);
    picture.position.z = 0.035;
    frameGroup.add(picture);

    //  액자 유리 효과
    const glassGeometry = new THREE.PlaneGeometry(0.7, 0.5);
    const glassMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.z = 0.04;
    frameGroup.add(glass);

    frameGroup.position.set(pos.x, pos.y, pos.z);
    scene.add(frameGroup);
    furniture.push(frameGroup);
  });
}

//  액자 그림 텍스처 생성
function createPictureTexture(index) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const pictures = [
    // 꽃 그림
    () => {
      ctx.fillStyle = "#FFB6C1";
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = "#FF69B4";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(64 + i * 32, 128, 20, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    // 풍경 그림
    () => {
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = "#228B22";
      ctx.fillRect(0, 128, 256, 128);
      ctx.fillStyle = "#8B4513";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(50 + i * 70, 100, 10, 60);
      }
    },
    // 추상 그림
    () => {
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(128, 128, 80, 0, Math.PI * 2);
      ctx.fill();
    },
  ];

  pictures[index]();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// 작은 식물 생성 함수
function createSmallPlant() {
  const plantGroup = new THREE.Group();

  const potGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
  const potMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
  const pot = new THREE.Mesh(potGeometry, potMaterial);
  pot.position.y = 0.075; //  화분 바닥이 기준점에 닿도록
  pot.castShadow = true;
  plantGroup.add(pot);

  const leafGeometry = new THREE.SphereGeometry(0.05, 6, 6);
  const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });

  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
    leaf.position.set(
      (Math.random() - 0.5) * 0.15,
      0.15 + Math.random() * 0.1, //  화분 위쪽에 배치
      (Math.random() - 0.5) * 0.15
    );
    leaf.castShadow = true;
    plantGroup.add(leaf);
  }

  return plantGroup;
}

// 러그 텍스처 생성 함수
function createRugTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // 기본 색상
  ctx.fillStyle = "#DEB887";
  ctx.fillRect(0, 0, 256, 256);

  // 꽃 패턴 추가
  ctx.fillStyle = "#FF69B4";
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const x = i * 32 + 16;
      const y = j * 32 + 16;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// 나무 텍스처 생성
function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#DEB887";
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = "#CD853F";
  for (let i = 0; i < 256; i += 20) {
    ctx.fillRect(0, i, 256, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

// 애니메이션 루프
function animate() {
  if (!isInitialized) return;

  requestAnimationFrame(animate);

  const elapsedTime = clock.getElapsedTime();

  handleKeyboardControls();
  updateCameraPosition();

  if (autoRotate) {
    cameraControls.theta += 0.01;
    updateCameraPosition();
  }

  if (animationsEnabled) {
    // 나비 애니메이션
    butterflies.forEach((butterfly, index) => {
      if (butterfly.userData && butterfly.userData.originalPosition) {
        const time = elapsedTime + index * 2;
        const originalPos = butterfly.userData.originalPosition;

        butterfly.position.x = originalPos.x + Math.sin(time * 0.5) * 2;
        butterfly.position.y = originalPos.y + Math.cos(time * 0.3) * 0.5;
        butterfly.position.z = originalPos.z + Math.sin(time * 0.7) * 1.5;

        if (butterfly.children[1]) {
          butterfly.children[1].rotation.z = Math.sin(time * 10) * 0.3;
        }
        if (butterfly.children[2]) {
          butterfly.children[2].rotation.z = -Math.sin(time * 10) * 0.3;
        }
      }
    });

    // 꽃 흔들림
    flowers.forEach((flower, index) => {
      const time = elapsedTime + index;
      flower.rotation.z = Math.sin(time * 0.5) * 0.1;
    });

    // 고양이 움직임
    if (cat && cat.userData) {
      const catData = cat.userData;
      const targetPos = catData.walkPath[catData.currentTarget];
      const currentPos = cat.position;

      const dx = targetPos.x - currentPos.x;
      const dy = targetPos.y - currentPos.y;
      const dz = targetPos.z - currentPos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance > 0.1) {
        cat.position.x += dx * catData.walkSpeed;
        cat.position.y += dy * catData.walkSpeed;
        cat.position.z += dz * catData.walkSpeed;

        cat.rotation.y = Math.atan2(dx, dz);

        for (let i = 5; i < 9; i++) {
          if (cat.children[i]) {
            cat.children[i].rotation.x = Math.sin(elapsedTime * 8 + i) * 0.3;
          }
        }
      } else {
        catData.currentTarget =
          (catData.currentTarget + 1) % catData.walkPath.length;

        if (Math.random() < 0.01) {
          cat.children[1].rotation.x = Math.sin(elapsedTime * 5) * 0.2;
        }
      }

      if (cat.children[4]) {
        cat.children[4].rotation.x = Math.sin(elapsedTime * 2) * 0.3;
        cat.children[4].rotation.z =
          Math.PI / 4 + Math.sin(elapsedTime * 1.5) * 0.2;
      }
    }

    // 창문 밖 애니메이션
    scene.traverse((object) => {
      if (object.userData && object.userData.speed) {
        object.position.x += object.userData.speed;
        if (object.position.x > 4) {
          object.position.x = 1.5;
        }
      }
      if (object.userData && object.userData.swaySpeed) {
        object.rotation.z =
          Math.sin(elapsedTime * object.userData.swaySpeed) *
          object.userData.swayAmount;
      }
    });

    // 펜던트 조명 흔들림
    const pendantLamp = scene.children.find(
      (child) =>
        child.geometry &&
        child.geometry.type === "SphereGeometry" &&
        child.position.y === 4
    );
    if (pendantLamp) {
      pendantLamp.rotation.z = Math.sin(elapsedTime * 0.5) * 0.05;
    }

    // 노트북 화면 애니메이션 업데이트
    furniture.forEach((item, i) => {
      if (item.userData?.updateScreen) {
        //console.log(`🌀 ${i}: updateScreen 실행`);
        item.userData.updateScreen();
      }
    });
  }
  renderer.render(scene, camera);
}

// 카메라 리셋 함수
function resetCamera() {
  if (!isInitialized) {
    console.warn("카메라가 아직 초기화되지 않았습니다.");
    return;
  }

  cameraControls.distance = 10;
  cameraControls.phi = Math.PI / 4;
  cameraControls.theta = 0;
  cameraControls.target = { x: 0, y: 2, z: 0 };
  updateCameraPosition();
}

// 자동 회전 토글
function toggleAutoRotate() {
  if (!isInitialized) {
    console.warn("아직 초기화되지 않았습니다.");
    return;
  }

  autoRotate = !autoRotate;
  console.log("자동 회전:", autoRotate ? "켜짐" : "꺼짐");
}

// 애니메이션 토글
function toggleAnimations() {
  if (!isInitialized) {
    console.warn("아직 초기화되지 않았습니다.");
    return;
  }

  animationsEnabled = !animationsEnabled;
  console.log("애니메이션:", animationsEnabled ? "켜짐" : "꺼짐");
}

// 윈도우 리사이즈 처리
function onWindowResize() {
  if (!isInitialized || !camera || !renderer) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

  //  iframe 위치 재계산
  scene.traverse((object) => {
    if (object.userData && object.userData.updateIframe) {
      object.userData.updateIframe();
    }
  });
}

//  페이지 종료 시 iframe 정리
window.addEventListener("beforeunload", function () {
  scene.traverse((object) => {
    if (object.userData && object.userData.iframe) {
      document.body.removeChild(object.userData.iframe);
    }
  });
});

// 이벤트 리스너
window.addEventListener("resize", onWindowResize);

// 초기화
function startInitialization() {
  if (typeof THREE === "undefined") {
    console.log("THREE.js 로딩 대기 중...");
    setTimeout(startInitialization, 100);
    return;
  }

  console.log("THREE.js 로드 완료, 초기화 시작");
  init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startInitialization);
} else {
  startInitialization();
}

// 전역 함수
window.resetCamera = resetCamera;
window.toggleAutoRotate = toggleAutoRotate;
window.toggleAnimations = toggleAnimations;

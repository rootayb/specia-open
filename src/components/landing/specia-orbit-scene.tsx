"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hero sahnesi — "Bağlantı ağı": sürekli birbirine bağlanan beyaz düğümler ve
 * ince çizgiler. Kurum, öğretmen, veli ve çocuğun verisinin tek bir canlı
 * sistemde buluşmasını anlatır. Tamamen siyah-beyaz.
 *
 * Her ekrana otomatik uyum: ortografik kamera viewport'a göre dünya alanını
 * belirler (kenardan kenara doldurur), düğüm yoğunluğu alana göre ölçeklenir,
 * nokta boyutları piksel bazlıdır. Bu yüzden ayrı responsive ayarı gerekmez.
 *
 * Performans: tek nokta + tek çizgi tamponu, görünüm dışında / sekme gizliyken
 * rAF duraklatma. prefers-reduced-motion'da tek statik kare çizilir.
 */
export function SpeciaOrbitScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const MAX_NODES = 180;
    const MAX_SEGMENTS = 2400;
    const WORLD_H = 10; // sabit dünya yüksekliği; genişlik en-boy oranıyla ölçeklenir
    const CONNECT_DIST = 1.75; // bağlantı eşiği (dünya birimi)
    const MOUSE_DIST = 2.6;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // --- Düğüm havuzu (bir kez ayrılır, dünya birimi koordinatlar) ---
    const nodePositions = new Float32Array(MAX_NODES * 3);
    const nodeVelocities = new Float32Array(MAX_NODES * 2);
    const nodeSizes = new Float32Array(MAX_NODES); // piksel
    const nodePhase = new Float32Array(MAX_NODES);

    let worldW = WORLD_H;
    let activeCount = 0;

    const seedNode = (i: number, w: number, h: number) => {
      nodePositions[i * 3] = (Math.random() - 0.5) * w;
      nodePositions[i * 3 + 1] = (Math.random() - 0.5) * h;
      nodePositions[i * 3 + 2] = 0;
      const speed = 0.12 + Math.random() * 0.18;
      const angle = Math.random() * Math.PI * 2;
      nodeVelocities[i * 2] = Math.cos(angle) * speed;
      nodeVelocities[i * 2 + 1] = Math.sin(angle) * speed;
      // Çoğu küçük "veri", az sayıda büyük "düğüm" (hiyerarşi hissi)
      nodeSizes[i] = Math.random() < 0.18 ? 4.2 + Math.random() * 2 : 2 + Math.random() * 1.2;
      nodePhase[i] = Math.random() * Math.PI * 2;
    };
    for (let i = 0; i < MAX_NODES; i += 1) {
      seedNode(i, worldW, WORLD_H);
    }

    // Alana göre hedef düğüm sayısı (yoğunluk sabit kalır)
    const desiredCount = () =>
      Math.max(46, Math.min(MAX_NODES, Math.round(worldW * WORLD_H * 0.5)));

    // --- Noktalar (yuvarlak yumuşak nokta shader'ı, beyaz) ---
    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    nodeGeometry.setAttribute("aSize", new THREE.BufferAttribute(nodeSizes, 1));
    nodeGeometry.setAttribute("aPhase", new THREE.BufferAttribute(nodePhase, 1));
    const nodeMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uDpr: { value: dpr } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uDpr;
        varying float vAlpha;
        void main() {
          vAlpha = 0.65 + 0.35 * sin(uTime * 1.4 + aPhase); // hafif kıpırtı
          gl_PointSize = aSize * uDpr;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float mask = smoothstep(0.5, 0.12, d); // yumuşak yuvarlak
          gl_FragColor = vec4(1.0, 1.0, 1.0, mask * vAlpha);
        }
      `,
    });
    const points = new THREE.Points(nodeGeometry, nodeMaterial);
    points.frustumCulled = false;
    group.add(points);

    // --- Bağlantı çizgileri (dinamik, beyaz; mesafeye göre soluklaşır) ---
    const segPositions = new Float32Array(MAX_SEGMENTS * 2 * 3);
    const segColors = new Float32Array(MAX_SEGMENTS * 2 * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(segPositions, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeometry.setAttribute("color", new THREE.BufferAttribute(segColors, 3).setUsage(THREE.DynamicDrawUsage));
    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    lines.frustumCulled = false;
    group.add(lines);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();
    let lastTime = startedAt;
    let frameId = 0;
    let running = false;

    // Mouse (dünya koordinatına çevrilir)
    const mouse = { x: 1e9, y: 1e9, active: false };
    let scrollFactor = 0;

    const handlePointer = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width - 0.5) * worldW;
      mouse.y = (0.5 - (event.clientY - rect.top) / rect.height) * WORLD_H;
      mouse.active = true;
    };
    const handlePointerLeave = () => {
      mouse.active = false;
    };
    const handleScroll = () => {
      scrollFactor = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    };

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      const w = Math.max(width, 1);
      const h = Math.max(height, 1);
      renderer.setSize(w, h, false);

      const aspect = w / h;
      const newWorldW = WORLD_H * aspect;

      // Genişlik değişince x koordinatlarını orantılı ölçekle (kesintisiz, taşma yok)
      const ratio = newWorldW / worldW;
      if (ratio !== 1 && Number.isFinite(ratio)) {
        for (let i = 0; i < MAX_NODES; i += 1) {
          nodePositions[i * 3] *= ratio;
        }
      }
      worldW = newWorldW;

      camera.left = -worldW / 2;
      camera.right = worldW / 2;
      camera.top = WORLD_H / 2;
      camera.bottom = -WORLD_H / 2;
      camera.updateProjectionMatrix();

      activeCount = desiredCount();
      nodeGeometry.setDrawRange(0, activeCount);
    };

    const halfW = () => worldW / 2;
    const halfH = WORLD_H / 2;

    const renderFrame = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      nodeMaterial.uniforms.uTime.value = elapsed;
      group.position.y = scrollFactor * 1.4; // hafif scroll parallax

      // Düğümleri sürükle + kenarlardan sek
      if (!prefersReducedMotion) {
        const hw = halfW();
        for (let i = 0; i < activeCount; i += 1) {
          let x = nodePositions[i * 3] + nodeVelocities[i * 2] * dt;
          let y = nodePositions[i * 3 + 1] + nodeVelocities[i * 2 + 1] * dt;
          if (x > hw || x < -hw) {
            nodeVelocities[i * 2] *= -1;
            x = Math.max(-hw, Math.min(hw, x));
          }
          if (y > halfH || y < -halfH) {
            nodeVelocities[i * 2 + 1] *= -1;
            y = Math.max(-halfH, Math.min(halfH, y));
          }
          nodePositions[i * 3] = x;
          nodePositions[i * 3 + 1] = y;
        }
        nodeGeometry.attributes.position.needsUpdate = true;
      }

      // Bağlantıları yeniden kur
      let seg = 0;
      const connectSq = CONNECT_DIST * CONNECT_DIST;
      for (let i = 0; i < activeCount && seg < MAX_SEGMENTS; i += 1) {
        const ax = nodePositions[i * 3];
        const ay = nodePositions[i * 3 + 1];
        for (let j = i + 1; j < activeCount && seg < MAX_SEGMENTS; j += 1) {
          const dx = ax - nodePositions[j * 3];
          const dy = ay - nodePositions[j * 3 + 1];
          const distSq = dx * dx + dy * dy;
          if (distSq < connectSq) {
            const alpha = (1 - Math.sqrt(distSq) / CONNECT_DIST) * 0.28;
            const o = seg * 6;
            segPositions[o] = ax;
            segPositions[o + 1] = ay;
            segPositions[o + 2] = 0;
            segPositions[o + 3] = nodePositions[j * 3];
            segPositions[o + 4] = nodePositions[j * 3 + 1];
            segPositions[o + 5] = 0;
            segColors[o] = segColors[o + 1] = segColors[o + 2] = alpha;
            segColors[o + 3] = segColors[o + 4] = segColors[o + 5] = alpha;
            seg += 1;
          }
        }

        // Mouse ile bağlantı (daha parlak — interaktif his)
        if (mouse.active && seg < MAX_SEGMENTS) {
          const mdx = ax - mouse.x;
          const mdy = ay - mouse.y;
          const mDistSq = mdx * mdx + mdy * mdy;
          if (mDistSq < MOUSE_DIST * MOUSE_DIST) {
            const alpha = (1 - Math.sqrt(mDistSq) / MOUSE_DIST) * 0.5;
            const o = seg * 6;
            segPositions[o] = ax;
            segPositions[o + 1] = ay;
            segPositions[o + 2] = 0;
            segPositions[o + 3] = mouse.x;
            segPositions[o + 4] = mouse.y;
            segPositions[o + 5] = 0;
            segColors[o] = segColors[o + 1] = segColors[o + 2] = alpha;
            segColors[o + 3] = segColors[o + 4] = segColors[o + 5] = alpha;
            seg += 1;
          }
        }
      }
      lineGeometry.setDrawRange(0, seg * 2);
      lineGeometry.attributes.position.needsUpdate = true;
      lineGeometry.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
    };

    const animate = (now: number) => {
      renderFrame(now);
      frameId = window.requestAnimationFrame(animate);
    };
    const start = () => {
      if (running || prefersReducedMotion) {
        return;
      }
      running = true;
      lastTime = performance.now();
      frameId = window.requestAnimationFrame(animate);
    };
    const stop = () => {
      running = false;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    resize();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          start();
        } else {
          stop();
        }
      },
      { threshold: 0 },
    );
    observer.observe(mount);

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    if (prefersReducedMotion) {
      renderFrame(performance.now());
    } else {
      start();
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      aria-hidden="true"
      data-testid="specia-orbit-scene"
    />
  );
}

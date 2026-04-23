import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const Terrain3D = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    let width = mountRef.current.clientWidth;
    let height = mountRef.current.clientHeight;
    let frameId;

    // SCENE
    const scene = new THREE.Scene();

    // CAMERA
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // GEOMETRY
    const geometry = new THREE.PlaneGeometry(120, 120, 40, 40);
    const material = new THREE.MeshBasicMaterial({
      color: 0x60a5fa, // Brighter blue
      wireframe: true,
      transparent: true,
      opacity: 0.1, // Much more subtle
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    scene.add(terrain);

    // ANIMATION LOGIC FOR HILLS
    const animateTerrain = (time) => {
      const positions = terrain.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        // Create wave/hill effect using Sin and Cos
        positions[i + 2] = 
          Math.sin(x * 0.1 + time * 0.001) * 2 + 
          Math.cos(y * 0.1 + time * 0.001) * 2 +
          Math.sin((x + y) * 0.05 + time * 0.0005) * 4;
      }
      terrain.geometry.attributes.position.needsUpdate = true;
    };

    const handleResize = () => {
      width = mountRef.current.clientWidth;
      height = mountRef.current.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const renderScene = (time) => {
      animateTerrain(time);
      terrain.rotation.z += 0.001; // Slow rotation
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(renderScene);
    };

    window.addEventListener('resize', handleResize);
    renderScene();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(frameId);
      mountRef.current.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none opacity-60" />;
};

export default Terrain3D;

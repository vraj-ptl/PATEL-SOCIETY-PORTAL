import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function FloatingNodes({ count = 150 }) {
  const groupRef = useRef();
  
  // Generate random positions spread widely to ensure the screen is ALWAYS filled
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
        // Spread x and y out drastically to cover ultra-wide monitors
        const x = (Math.random() - 0.5) * 50; 
        const y = (Math.random() - 0.5) * 50;
        // Keep z depth reasonable so they are visible
        const z = (Math.random() - 0.5) * 30 - 15;
        
        // Random starting rotations
        const rx = Math.random() * Math.PI;
        const ry = Math.random() * Math.PI;
        const rz = Math.random() * Math.PI;
        
        // Variable sizing
        const scale = 0.2 + Math.random() * 1.2;
        
        temp.push({ position: [x, y, z], rotation: [rx, ry, rz], scale: [scale, scale, scale] });
    }
    return temp;
  }, [count]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Very slow, professional rotation of the entire network field
      groupRef.current.rotation.y += delta * 0.03;
      groupRef.current.rotation.x += delta * 0.015;
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position} rotation={p.rotation} scale={p.scale}>
          {/* Professional icosahedron data nodes */}
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial 
            color="#6366f1" /* Fixed professional Indigo accent */
            wireframe 
            transparent 
            opacity={0.15} /* Subtle, not distracting */
          />
        </mesh>
      ))}
    </group>
  );
}

export default function ThreeBackground() {
  return (
    <>
      {/* Fixed professional dark slate background */}
      <color attach="background" args={['#0f172a']} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[0, 0, 5]} intensity={2} color="#38bdf8" distance={50} />

      {/* The continuous, screen-filling animated objects */}
      <FloatingNodes count={150} />
    </>
  );
}

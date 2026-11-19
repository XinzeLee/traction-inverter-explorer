import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createInverter } from './inverter.js';
import { createVehicleContext } from './vehicle.js';
import { createVehicleSystem } from './vehicleSystem.js';
import { pickableGroups } from './picking.js';

export default function Viewer({ exploded, vehicle, selected, systemSelected, isolate, onSelect, onSystemSelect, onParts, onSystemParts, onSystemConnections, resetKey }) {
  const host = useRef(null), markerHost = useRef(null), runtime = useRef(null), state = useRef({}), savedView = useRef(null);
  state.current = { exploded, vehicle, selected, systemSelected, isolate, onSelect, onSystemSelect };
  useEffect(() => {
    const element = host.current, markersElement = markerHost.current;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#eef1ef');
    const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
    camera.position.set(5.8, 5.2, 7.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.minDistance = 2.5; controls.maxDistance = 28;
    controls.target.set(0, 1.0, 0); controls.update();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x929ea1, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 3.0); key.position.set(4, 9, 7); scene.add(key);
    const fill = new THREE.DirectionalLight(0xb9d1ff, 1.1); fill.position.set(-5, 4, -4); scene.add(fill);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e8ece9', roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.66; scene.add(floor);
    const grid = new THREE.GridHelper(24, 48, 0xbcc8c5, 0xd4dcd8); grid.position.y = -0.655; grid.material.transparent = true; grid.material.opacity = 0.35; scene.add(grid);
    const { group: assembly, parts } = createInverter(THREE); scene.add(assembly);
    const car = createVehicleContext(); car.visible = false;
    const batteryEnvelope = car.getObjectByName('Illustrative battery envelope'); if (batteryEnvelope) batteryEnvelope.visible = false;
    scene.add(car);
    const { group: system, parts: vehicleParts, connections } = createVehicleSystem(THREE); system.visible = false; scene.add(system);
    const originals = new Map();
    const cloneMaterials = object => { if (object.isMesh) {const mats = Array.isArray(object.material) ? object.material : [object.material]; object.material = Array.isArray(object.material) ? mats.map(m => m.clone()) : mats[0].clone();} };
    parts.forEach(part => { originals.set(part.id, part.group.position.clone()); part.group.traverse(object => { if (object.isMesh) object.userData.partId = part.id; cloneMaterials(object); }); });
    vehicleParts.forEach(part => part.group.traverse(cloneMaterials));
    onParts(parts.map(({ group, explodedOffset, ...part }) => part));
    onSystemParts(vehicleParts.map(({ group, labelAnchor, ...part }) => part));
    onSystemConnections(connections);
    const markerData = [{id:'sys-inverter',name:'Traction inverter',labelAnchor:[2.3,1.70,0]}, ...vehicleParts];
    const markers = markerData.map((part,index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'system-marker'; button.textContent = String(index+1).padStart(2,'0'); button.title = part.name; button.setAttribute('aria-label', `${index+1}: ${part.name}`); button.setAttribute('aria-pressed','false'); button.style.display = 'none';
      button.addEventListener('click', () => state.current.onSystemSelect(part.id)); markersElement.appendChild(button);
      return { ...part, button, point: new THREE.Vector3(...part.labelAnchor) };
    });
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let down = null;
    const pointerDown = event => { down = {x:event.clientX, y:event.clientY}; };
    const pointerUp = event => {
      if (!down || Math.hypot(event.clientX-down.x, event.clientY-down.y) > 5) return;
      const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1); raycaster.setFromCamera(pointer, camera);
      if (state.current.vehicle) {
        const hits = raycaster.intersectObjects([...vehicleParts.map(p=>p.group), assembly], true);
        const hit = hits.find(x=>x.object.userData.systemPartId || x.object.userData.partId);
        if (hit) state.current.onSystemSelect(hit.object.userData.systemPartId || 'sys-inverter');
      } else {
        const hit = raycaster.intersectObjects(pickableGroups(parts), true).find(x => x.object.userData.partId);
        if (hit) state.current.onSelect(hit.object.userData.partId);
      }
    };
    renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointerup', pointerUp);
    const resize = () => { const { clientWidth, clientHeight } = element; if (!clientWidth || !clientHeight) return; camera.aspect = clientWidth/clientHeight; camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(18)) * Math.max(1, 1 / camera.aspect))); camera.updateProjectionMatrix(); renderer.setSize(clientWidth, clientHeight, false); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    let frame; const clock = new THREE.Clock(); const projected = new THREE.Vector3();
    const animate = () => {
      frame = requestAnimationFrame(animate); const dt = clock.getDelta(); const s = state.current;
      const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches; const factor = instant ? 1 : 1-Math.exp(-9*dt);
      car.visible = s.vehicle; system.visible = s.vehicle;
      floor.position.y += ((s.vehicle ? -0.01 : -0.66) - floor.position.y) * factor; grid.position.y = floor.position.y + 0.005;
      const targetScale = s.vehicle ? 0.38 : 1;
      assembly.scale.lerp(new THREE.Vector3(targetScale,targetScale,targetScale), factor);
      assembly.position.lerp(s.vehicle ? new THREE.Vector3(2.3,1.0,0) : new THREE.Vector3(0,0,0), factor);
      parts.forEach(part => {
        const original = originals.get(part.id), offset = part.explodedOffset;
        const target = original.clone().add(new THREE.Vector3(...offset).multiplyScalar(!s.vehicle && s.exploded ? 1 : 0));
        part.group.position.lerp(target, factor); part.group.visible = s.vehicle || !s.isolate || part.id === s.selected;
        part.group.traverse(object => { if (!object.isMesh) return; const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(m => {if (m.emissive) {const selectedNow = s.vehicle ? s.systemSelected === 'sys-inverter' : s.selected === part.id && !s.isolate; m.emissive.set(selectedNow ? '#1c6691' : '#000000'); m.emissiveIntensity = selectedNow ? 0.20 : 0;}}); });
      });
      vehicleParts.forEach(part => part.group.traverse(object => {if (!object.isMesh) return; const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m => {if (m.emissive) {m.emissive.set(part.id===s.systemSelected?'#23627a':'#000000');m.emissiveIntensity=part.id===s.systemSelected?.22:0;}});}));
      controls.update(); camera.updateMatrixWorld();
      const occupied = [];
      markers.forEach(marker => {
        if (!s.vehicle) {marker.button.style.display='none'; return;}
        projected.copy(marker.point).project(camera);
        const x=(projected.x*.5+.5)*element.clientWidth, y=(-projected.y*.5+.5)*element.clientHeight;
        const visible = projected.z > -1 && projected.z < 1 && x > 12 && x < element.clientWidth-12 && y > 12 && y < element.clientHeight-12;
        marker.button.style.display=visible?'grid':'none';
        if (!visible) return;
        let py=y; for(let n=0;n<5 && occupied.some(p=>Math.abs(p.x-x)<27 && Math.abs(p.y-py)<25);n++) py+=25;
        py=Math.min(element.clientHeight-16,py); occupied.push({x,y:py});
        marker.button.style.left=`${x}px`;marker.button.style.top=`${py}px`;marker.button.setAttribute('aria-pressed',String(marker.id===s.systemSelected));
      });
      renderer.render(scene,camera);
    }; animate();
    runtime.current = { camera, controls, parts };
    return () => { cancelAnimationFrame(frame); observer.disconnect(); renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); markers.forEach(m=>m.button.remove()); controls.dispose(); scene.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose()); }); renderer.dispose(); renderer.domElement.remove(); runtime.current = null; };
  }, []);
  useEffect(() => { if (!runtime.current) return; const { camera, controls } = runtime.current; if (vehicle) { camera.position.set(8.0, 7.1, 10.5); controls.target.set(-.2,.7,.5); } else { camera.position.set(5.8,5.2,7.2); controls.target.set(0,1.0,0); } controls.update(); }, [vehicle, resetKey]);
  useEffect(() => {
    const rt = runtime.current; if (!rt) return;
    if (!isolate) { if (savedView.current && !vehicle) {rt.camera.position.copy(savedView.current.position);rt.controls.target.copy(savedView.current.target);rt.controls.update();} savedView.current=null;return; }
    savedView.current = { position: rt.camera.position.clone(), target: rt.controls.target.clone() };
    const wait = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const timer=window.setTimeout(() => {const part=rt.parts.find(p=>p.id===selected);if(!part)return;const bounds=new THREE.Box3().setFromObject(part.group),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());const direction=rt.camera.position.clone().sub(rt.controls.target).normalize();const distance=Math.max(2.5,Math.max(size.x,size.y,size.z)/(2*Math.tan(THREE.MathUtils.degToRad(rt.camera.fov/2)))*1.7);rt.controls.target.copy(center);rt.camera.position.copy(center).addScaledVector(direction,distance);rt.controls.update();},wait);
    return () => window.clearTimeout(timer);
  }, [isolate, selected, vehicle]);
  return <><div className="viewer-canvas" ref={host} aria-label={vehicle ? 'Interactive 3D electric vehicle power system. Drag to rotate; select components from the list or numbered markers.' : 'Interactive 3D traction inverter. Drag to rotate, scroll to zoom; select components from the list.'}/><div className="system-markers" ref={markerHost}/></>;
}

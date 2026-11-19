import * as THREE from 'three';

/**
 * A deliberately simplified, translucent vehicle context for the inverter.
 * Units are illustrative: X runs from rear to front, Y is up, and Z is width.
 * The front axle is at (2.55, 0.66, 0); the ground is at Y = 0.
 * The returned group can be hidden or scaled without changing the inverter.
 */
export function createVehicleContext() {
  const vehicle = new THREE.Group();
  vehicle.name = 'Transparent vehicle context';
  vehicle.userData.contextOnly = true;

  const shell = new THREE.MeshPhysicalMaterial({
    color: 0x7ed6e0, metalness: 0.05, roughness: 0.35,
    transparent: true, opacity: 0.085, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9de1e7, metalness: 0.08, roughness: 0.25,
    transparent: true, opacity: 0.13, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const edge = new THREE.LineBasicMaterial({ color: 0x80d4dd, transparent: true, opacity: 0.55, depthWrite: false });
  const accent = new THREE.LineBasicMaterial({ color: 0x64c3d0, transparent: true, opacity: 0.32, depthWrite: false });
  const tires = new THREE.MeshStandardMaterial({ color: 0x1a2a34, roughness: 0.85, transparent: true, opacity: 0.72 });
  const rims = new THREE.MeshStandardMaterial({ color: 0x93adba, metalness: 0.65, roughness: 0.35, transparent: true, opacity: 0.75 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x6f9eac, metalness: 0.3, roughness: 0.55, transparent: true, opacity: 0.17, depthWrite: false });

  function line(points, material = edge, closed = false) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const item = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
    vehicle.add(item);
    return item;
  }
  function quad(a, b, c, d, material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
    geometry.computeVertexNormals();
    const item = new THREE.Mesh(geometry, material);
    vehicle.add(item);
    return item;
  }
  function box(x, y, z, w, h, d, material, name) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.name = name;
    vehicle.add(mesh);
    return mesh;
  }
  // Side outline of a generic passenger EV. The cubic curves create a soft,
  // recognizable vehicle silhouette while leaving the hardware unobscured.
  const side = new THREE.Shape();
  side.moveTo(-3.96, 0.66);
  side.lineTo(-3.92, 1.13);
  side.quadraticCurveTo(-3.82, 1.42, -3.38, 1.52);
  side.lineTo(-2.28, 1.64);
  side.quadraticCurveTo(-1.65, 2.25, -0.93, 2.42);
  side.quadraticCurveTo(0.13, 2.58, 1.23, 2.42);
  side.quadraticCurveTo(1.83, 2.31, 2.43, 1.67);
  side.lineTo(3.45, 1.51);
  side.quadraticCurveTo(3.93, 1.43, 4.02, 1.06);
  side.lineTo(4.04, 0.66);
  side.lineTo(-3.96, 0.66);
  const sideGeometry = new THREE.ShapeGeometry(side, 18);
  for (const z of [-1.47, 1.47]) {
    const panel = new THREE.Mesh(sideGeometry, shell);
    panel.position.z = z;
    vehicle.add(panel);
    const points = side.getPoints(18).map(p => [p.x, p.y, z]);
    line(points, edge, true);
    // Windows are unfilled so the drivetrain remains visible.
    line([[-2.05,1.65,z],[-1.55,2.14,z],[-0.85,2.31,z],[0.03,2.36,z],[0.03,1.65,z],[-2.05,1.65,z]], accent);
    line([[0.16,2.36,z],[1.15,2.31,z],[1.72,2.15,z],[2.21,1.65,z],[0.16,1.65,z],[0.16,2.36,z]], accent);
    line([[-0.01,1.65,z],[-0.03,0.78,z]], accent);
    line([[2.18,1.65,z],[2.08,0.78,z]], accent);
  }

  // Top surfaces: bonnet, windscreen, roof and rear window. Low opacity and
  // disabled depth writes keep the foreground inverter legible from any angle.
  const halfWidth = 1.47;
  const roofSections = [
    [-3.82,1.42,-2.28,1.64,shell],
    [-2.28,1.64,-0.93,2.42,glass],
    [-0.93,2.42,1.23,2.42,shell],
    [1.23,2.42,2.43,1.67,glass],
    [2.43,1.67,3.93,1.43,shell],
  ];
  for (const [x0,y0,x1,y1,material] of roofSections) {
    quad([x0,y0,-halfWidth],[x0,y0,halfWidth],[x1,y1,halfWidth],[x1,y1,-halfWidth], material);
    line([[x0,y0,-halfWidth],[x0,y0,halfWidth]], accent);
  }
  // Underfloor battery envelope and the barest chassis cues communicate the
  // installation context without presenting an exact vehicle design.
  box(-0.3,0.43,0,3.5,0.18,2.16,frame,'Illustrative battery envelope');
  line([[-2.15,0.55,-1.1],[1.55,0.55,-1.1],[1.55,0.55,1.1],[-2.15,0.55,1.1]],accent,true);
  line([[-3.7,0.62,-1.36],[3.7,0.62,-1.36],[3.7,0.62,1.36],[-3.7,0.62,1.36]],accent,true);

  const tireGeometry = new THREE.CylinderGeometry(0.66,0.66,0.32,32);
  const rimGeometry = new THREE.CylinderGeometry(0.41,0.41,0.335,24);
  // Cylinder axes point across the vehicle width.
  for (const x of [-2.55,2.55]) for (const z of [-1.48,1.48]) {
    for (const [geometry,material] of [[tireGeometry,tires],[rimGeometry,rims]]) {
      const wheel = new THREE.Mesh(geometry,material);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(x,0.66,z);
      vehicle.add(wheel);
    }
  }
  vehicle.traverse(object => { object.userData.contextOnly = true; });
  return vehicle;
}

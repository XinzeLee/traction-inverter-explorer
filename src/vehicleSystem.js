// A conceptual power-electronics system placed in a simplified battery EV.
// The layout explains topology, not a particular vehicle or physical routing.
// References: TI onboard/DC fast charging: https://www.ti.com/document-viewer/lit/html/SSZTA03/GUID-914A2889-092F-4218-8E24-16A295783CEF
// U.S. DOE wireless charging: https://www.energy.gov/sites/default/files/2024-11/VTO_2023_APR_ELECTRIFICATION%20REPORT_compliant_.pdf
// X is the vehicle's longitudinal axis, front +X; Y up; Z vehicle width.
export function createVehicleSystem(THREE) {
  const group = new THREE.Group(); group.name = 'EV power-electronics system';
  const parts = [], connections = [];
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, metalness: options.metalness ?? .25, roughness: options.roughness ?? .48, ...options });
  const m = {
    shell: material(0xb5c1c5, {metalness:.75,roughness:.3}), dark: material(0x293b47,{metalness:.35}),
    black: material(0x182a35), bolt: material(0xd8e1df,{metalness:.8,roughness:.25}),
    copper: material(0xc3804b,{metalness:.8}), pcb: material(0x1b5c51),
    orange: material(0xf28c43,{metalness:.08}), teal: material(0x20a0ac,{metalness:.08}),
    green: material(0x4ea969,{metalness:.08}), purple: material(0x8d78bf,{metalness:.08}),
    ceramic: material(0xe0e7df), pale: material(0xc9d8d9), darkblue: material(0x2b6787),
    transparent: material(0xa4c9ce,{metalness:.1,transparent:true,opacity:.19,depthWrite:false}),
    copperWire: material(0xee8740,{metalness:.1}), acWire: material(0x58a69a,{metalness:.1}), phaseWire: material(0x278fc7,{metalness:.1}),
    signal: material(0x8c6eb3,{metalness:.1}), charge: material(0x59ae78,{metalness:.1})
  };
  function box(p, x,y,z,w,h,d, mat, name='') { const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.name=name;p.add(mesh);return mesh; }
  function cylinder(p,x,y,z,r,h,mat,axis='y',segments=24) {const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);mesh.position.set(x,y,z);if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;p.add(mesh);return mesh;}
  function torus(p,x,y,z,r,t,mat,axis='y') {const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,28),mat);mesh.position.set(x,y,z);if(axis==='y')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.y=Math.PI/2;p.add(mesh);return mesh;}
  function screws(p,w,d,y) {for(const x of [-w/2+.07,w/2-.07])for(const z of [-d/2+.07,d/2-.07]){cylinder(p,x,y,z,.024,.014,m.bolt);}}
  function fins(p,w,d,y,n=5) {for(let i=0;i<n;i++)box(p,0,y,-d*.37+i*d*.74/(n-1),w*.75,.025,.018,m.pale);}
  function part(id,name,category,description,pos,anchor,build) {
    const item=new THREE.Group();item.name=name;item.position.set(...pos);build(item);
    item.traverse(child => {child.userData.systemPartId=id;});group.add(item);
    parts.push({id,name,category,description,group:item,labelAnchor:anchor});return item;
  }
  // Underfloor traction battery, its separate BMS is a monitoring/control unit.
  part('sys-battery','High-voltage battery pack','Energy storage','Stores DC energy for propulsion and high-voltage loads. The pack, cable locations and case are representative.',[-.45,.38,0],[-.45,.65,0],p=>{
    box(p,0,0,0,3.0,.26,1.88,m.dark,'Battery enclosure');box(p,0,.15,0,2.94,.035,1.82,m.shell);
    for(let i=0;i<6;i++)box(p,-1.20+i*.48,.174,0,.03,.015,1.70,m.dark);
    for(const x of [-1.34,1.34])for(const z of [-.79,.79])cylinder(p,x,.18,z,.025,.015,m.bolt);
    box(p,1.3,.05,-.55,.18,.16,.25,m.orange);
  });
  part('sys-bms','Battery management system','Energy storage','Monitors cell and pack conditions and coordinates protection; it communicates with the battery and is not a series power converter.',[-1.1,.67,-.65],[-1.1,.91,-.65],p=>{
    box(p,0,0,0,.52,.18,.32,m.dark);box(p,0,.1,0,.48,.025,.29,m.pcb);box(p,-.05,.13,0,.12,.035,.1,m.black);
    for(let i=0;i<5;i++)box(p,-.19+i*.09,.13,.09,.05,.022,.035,m.ceramic);
    box(p,.22,.07,0,.10,.09,.13,m.pale);screws(p,.49,.29,.12);
  });
  // A compact high-voltage distribution junction in the front of the pack.
  part('sys-junction','High-voltage power junction','Power distribution','Distributes battery high-voltage DC to the traction inverter and auxiliary loads. Contactors and fusing are represented inside the enclosure.',[.98,.75,-.65],[.98,1.04,-.65],p=>{
    box(p,0,0,0,.62,.28,.48,m.dark);box(p,0,.15,0,.59,.025,.45,m.shell);screws(p,.57,.43,.17);
    for(const z of [-.17,0,.17])box(p,.34,-.01,z,.12,.12,.11,m.orange);
    box(p,-.34,0,0,.12,.13,.22,m.orange);
  });
  part('sys-dcdc','HV–LV DC–DC converter','Auxiliaries','Converts the high-voltage DC bus to a lower-voltage supply for vehicle electronics and accessories.',[.18,.79,-.92],[.18,1.05,-.92],p=>{
    box(p,0,0,0,.70,.27,.44,m.shell);fins(p,.62,.4,.15,5);screws(p,.66,.4,.15);
    box(p,.37,0,-.1,.11,.13,.13,m.orange);box(p,-.38,0,.10,.10,.1,.13,m.purple);
  });
  part('sys-heater','PTC heater','Auxiliaries','An electric heater powered from the high-voltage system; the outer housing represents a coolant-based cabin heater.',[.63,.78,.91],[.63,1.07,.91],p=>{
    box(p,0,0,0,.64,.27,.38,m.shell);fins(p,.58,.35,.15,5);
    for(const x of [-.14,.14]){cylinder(p,x,0,.26,.045,.18,m.dark,'z');torus(p,x,0,.35,.045,.009,m.bolt,'z');}
    box(p,.35,0,-.09,.11,.12,.12,m.orange);
  });
  part('sys-compressor','Electric A/C compressor','Auxiliaries','A high-voltage electric compressor drives the vehicle air-conditioning refrigerant circuit.',[1.65,.70,.98],[1.65,1.05,.98],p=>{
    cylinder(p,0,0,0,.21,.52,m.shell,'x');cylinder(p,-.28,0,0,.17,.07,m.dark,'x');
    for(const x of [-.17,-.06,.05,.16])torus(p,x,0,0,.205,.012,m.dark,'x');
    box(p,.04,.24,0,.26,.09,.24,m.dark);box(p,.2,.22,-.08,.12,.10,.12,m.orange);
    cylinder(p,-.1,.18,.20,.04,.16,m.bolt,'z');cylinder(p,.1,.18,.20,.04,.16,m.bolt,'z');
  });
  part('sys-motor','Traction motor','Propulsion','Receives controlled three-phase AC from the inverter and converts electrical power to mechanical torque. The motor shown is representative.',[3.50,.70,0],[3.50,1.10,0],p=>{
    cylinder(p,0,0,0,.43,.78,m.shell,'z',32);cylinder(p,0,0,-.42,.36,.08,m.dark,'z',32);cylinder(p,0,0,.42,.34,.08,m.dark,'z',32);
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;box(p,.40*Math.cos(a),.40*Math.sin(a),0,.035,.035,.61,m.pale);}
    cylinder(p,0,0,.52,.10,.22,m.bolt,'z');torus(p,0,0,.46,.22,.018,m.bolt,'z');
    box(p,-.08,.39,-.08,.37,.15,.34,m.dark);for(let i=0;i<3;i++)box(p,-.19+i*.11,.47,-.09,.07,.08,.11,m.teal);
  });
  // Show the two power stages in a shared OBC package; each remains independently selectable.
  part('sys-obc-acdc','OBC AC–DC stage','Charging','The onboard charger first converts AC from the charge inlet to DC.',[-2.43,.72,.48],[-2.43,1.05,.48],p=>{
    box(p,0,0,0,.85,.30,.56,m.shell);box(p,0,.16,0,.78,.03,.50,m.pcb);
    for(let i=0;i<3;i++)box(p,-.27+i*.20,.21,-.06,.12,.08,.13,m.black);
    for(const x of [-.26,.25])cylinder(p,x,.22,.14,.05,.09,m.dark);screws(p,.78,.5,.18);
    box(p,-.45,0,0,.11,.12,.16,m.teal);
  });
  part('sys-obc-dcdc','OBC DC–DC stage','Charging','The isolated DC–DC stage regulates and transfers the onboard charger output to the high-voltage battery.',[-2.43,.72,-.22],[-2.43,1.05,-.22],p=>{
    box(p,0,0,0,.85,.30,.56,m.shell);box(p,0,.16,0,.78,.03,.50,m.pcb);
    box(p,-.16,.24,0,.27,.14,.25,m.dark);for(let i=0;i<4;i++)box(p,-.15+i*.07,.32,0,.025,.016,.24,m.copper);
    for(const x of [.13,.29])box(p,x,.22,.10,.11,.08,.13,m.black);screws(p,.78,.5,.18);
    box(p,.45,0,-.1,.11,.13,.14,m.orange);
  });
  part('sys-ac-inlet','AC charge inlet','Charging','Connects the onboard charger to an external AC supply.',[-2.66,.72,1.37],[-2.66,1.05,1.37],p=>{
    box(p,0,0,0,.30,.25,.16,m.dark);cylinder(p,0,0,.10,.09,.04,m.black,'z');
    for(const x of [-.045,.045])for(const y of [-.035,.035])cylinder(p,x,y,.13,.012,.018,m.bolt,'z',10);
  });
  // A separate receiver pickup is on the vehicle; an external floor pad couples across an air gap.
  part('sys-wireless-rx','Wireless charging receiver','Charging','A receiver pickup and electronics on the vehicle accept power magnetically from the external transmitter pad.',[-1.45,.25,.10],[-1.45,.53,.10],p=>{
    box(p,0,0,0,.92,.10,.68,m.dark);for(const x of [-.30,0,.30])box(p,x,-.06,0,.12,.025,.53,m.copper);
    box(p,.35,.08,.22,.20,.10,.14,m.shell);
  });
  part('sys-wireless-tx','Wireless transmitter pad (external)','External equipment','A ground-mounted transmitter transfers energy across an air gap to the vehicle receiver. The arc depicts magnetic coupling, not a cable.',[-1.45,.045,.10],[-1.45,.23,.10],p=>{
    box(p,0,0,0,1.08,.07,.82,m.dark);for(const r of [.14,.23,.32])torus(p,0,.042,0,r,.012,m.copper);
  });
  part('sys-dc-charger','DC fast charger (external)','External equipment','The external fast charger converts grid AC to controlled DC; DC charging feeds the battery directly, bypassing the onboard AC charger.',[-2.05,1.00,3.00],[-2.05,2.02,3.00],p=>{
    box(p,0,0,0,.84,1.76,.62,m.shell);box(p,0,.06,.32,.73,1.55,.04,m.dark);
    box(p,0,.52,.35,.48,.33,.025,m.darkblue);box(p,0,.52,.37,.39,.24,.012,m.pale);
    for(let i=0;i<5;i++)box(p,0,-.25-i*.075,.35,.53,.025,.018,m.pale);
    box(p,0,-.75,0,.90,.08,.72,m.dark);for(const x of [-.33,.33])box(p,x,.87,0,.05,.06,.54,m.dark);
  });
  // External station conversion stages are selectable and visible on the cabinet face.
  part('sys-fast-acdc','Fast charger AC–DC stage','External equipment','The external charger rectifies AC from the grid before the DC–DC power stage.',[-2.05,.65,3.34],[-2.05,.84,3.39],p=>{
    box(p,0,0,0,.55,.31,.07,m.teal);box(p,0,0,.042,.45,.22,.016,m.darkblue);
    for(let i=0;i<3;i++)box(p,-.13+i*.13,0,.055,.07,.12,.01,m.pale);
  });
  part('sys-fast-dcdc','Fast charger DC–DC stage','External equipment','The external charger regulates DC charging power before delivering it to the vehicle battery.',[-2.05,1.10,3.34],[-2.05,1.30,3.39],p=>{
    box(p,0,0,0,.55,.31,.07,m.green);box(p,0,0,.042,.45,.22,.016,m.darkblue);
    for(let i=0;i<4;i++)box(p,-.15+i*.10,0,.055,.035,.12,.01,m.copper);
  });
  // Paths are schematic bundles rather than dimensioned physical cable routing.
  // Legend: DC orange, charge DC green, inlet AC teal, motor three-phase blue, BMS signal purple.
  const pathMaterial = {dc:m.copperWire,ac:m.acWire,phase:m.phaseWire,signal:m.signal,charge:m.charge};
  function path(id,from,to,kind,points,description,radius=.028) {
    const curve=new THREE.CurvePath();for(let i=0;i<points.length-1;i++)curve.add(new THREE.LineCurve3(new THREE.Vector3(...points[i]),new THREE.Vector3(...points[i+1])));
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(16,points.length*8),radius,10,false),pathMaterial[kind]);mesh.name=id;mesh.userData.connectionId=id;group.add(mesh);
    connections.push({id,from,to,kind,description});
  }
  path('battery-junction','sys-battery','sys-junction','dc',[[.70,.55,-.62],[.79,.58,-.62],[.79,.75,-.65],[.67,.75,-.65]],'High-voltage DC distribution');
  path('junction-inverter','sys-junction','traction-inverter','dc',[[1.30,.75,-.65],[1.55,.76,-.65],[1.76,.88,-.49],[1.84,1.08,-.49]],'High-voltage DC feeds the inverter');
  // Three separate phase conductors between the inverter and traction motor.
  for(let i=0;i<3;i++){const startX=1.95+i*.35; const targetX=3.31+i*.11; const lane=.72+i*.07; path(`inverter-motor-${i+1}`,'traction-inverter','sys-motor','phase',[[startX,1.23,.59],[startX,1.24,lane],[3.14+i*.10,1.24,lane],[targetX,1.18,-.09]],'Three-phase AC to motor',.022);}
  path('junction-dcdc','sys-junction','sys-dcdc','dc',[[.68,.75,-.80],[.59,.75,-.92],[.54,.79,-.92]],'High-voltage DC for auxiliary converter',.022);
  path('junction-heater','sys-junction','sys-heater','dc',[[1.10,.75,-.39],[1.10,.68,.40],[.98,.68,.82]],'High-voltage DC for PTC heater',.022);
  path('junction-compressor','sys-junction','sys-compressor','dc',[[1.2,.75,-.39],[1.45,.71,-.22],[1.55,.71,.72],[1.85,.84,.90]],'High-voltage DC for A/C compressor',.022);
  path('bms-battery','sys-bms','sys-battery','signal',[[-1.1,.59,-.65],[-1.1,.55,-.65],[-.98,.55,-.65]],'Measurement and control connection',.016);
  path('ac-inlet-obc','sys-ac-inlet','sys-obc-acdc','ac',[[-2.66,.72,1.27],[-2.66,.72,.83],[-2.82,.72,.76]],'AC from vehicle inlet to onboard charger',.025);
  path('obc-stages','sys-obc-acdc','sys-obc-dcdc','charge',[[-2.43,.72,.19],[-2.43,.72,.07]],'Internal rectified DC link',.025);
  path('obc-battery','sys-obc-dcdc','sys-battery','charge',[[-1.98,.72,-.32],[-1.73,.62,-.32],[-1.68,.54,-.32]],'Regulated charging DC to battery',.025);
  path('wireless-battery','sys-wireless-rx','sys-battery','charge',[[-1.10,.33,.30],[-.93,.35,.45],[-.80,.43,.55]],'Receiver output to the battery',.022);
  path('fast-acdc-dcdc','sys-fast-acdc','sys-fast-dcdc','charge',[[-2.05,.81,3.38],[-2.05,.94,3.38]],'Rectified DC between external charger stages',.018);
  path('fast-charger-battery','sys-fast-dcdc','sys-battery','charge',[[-1.78,1.10,3.36],[-1.60,1.10,3.30],[-1.60,.70,3.00],[-1.45,.62,2.60],[-1.31,.57,1.55],[-1.20,.48,1.00]],'External DC charging path to battery',.035);
  // A conceptual magnetic-field relationship, never a conducting cable.
  connections.push({id:'wireless-coupling',from:'sys-wireless-tx',to:'sys-wireless-rx',kind:'wireless',description:'Magnetic coupling across an air gap'});
  const arcMat = new THREE.LineBasicMaterial({color:0x5ba8b1,transparent:true,opacity:.75});
  for(const r of [.16,.27,.38]) {const points=[];for(let i=0;i<24;i+=2){for(const step of [i,i+1]){const a=Math.PI*.15+step*Math.PI*.70/24;points.push(new THREE.Vector3(-1.45+r*Math.cos(a),.13+.055*Math.sin(a),.10+r*Math.sin(a)));}}const line=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),arcMat);line.name='Wireless field indication';line.userData.contextOnly=true;group.add(line);}
  return {group,parts,connections};
}

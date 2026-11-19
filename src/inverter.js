import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { refineInverterDetails } from './refinedDetails.js';

// Illustrative liquid-cooled, two-level, three-phase traction inverter.
// Geometry is authored for teaching; dimensions and ratings are not a product design.
// Power-stage form references: Wolfspeed CAB450M12XM3 outline and terminal layout;
// KEMET C4DE cylindrical film capacitor package; Rogers ROLINX insulated laminated bars.
// https://assets.wolfspeed.com/uploads/2024/01/Wolfspeed_CAB450M12XM3_data_sheet.pdf
// https://content.kemet.com/datasheets/KEM_F3059_C4DE.pdf
// https://www.rogerscorp.com/advanced-electronics-solutions/technical-expertise/busbar-technology
export function createInverter(THREE) {
  const group = new THREE.Group();
  group.name = 'Traction inverter assembly';
  const parts = [];
  const mat = (color, metalness = 0, roughness = .45, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  const m = {
    case: mat(0x687681, .76, .36), edge: mat(0x9eacb1, .8, .27), dark: mat(0x26343b, .48, .4),
    black: mat(0x171e24, .12, .48), ceramic: mat(0xd9e0dd, .15, .35), copper: mat(0xc67a4d, .83, .26),
    bus: mat(0xd69968, .84, .23), silver: mat(0xb8c5c7, .82, .24), pcb: mat(0x164e49, .18, .5),
    pcb2: mat(0x245e64, .15, .5), chip: mat(0x18232b, .1, .53), orange: mat(0xe47833, .14, .37),
    red: mat(0xc74938, .12, .4), blue: mat(0x3c8aa3, .35, .34), gold: mat(0xd3b066, .68, .3),
    lid: mat(0xa9c0c6, .5, .25, { transparent: true, opacity: .18, depthWrite: false }),
    plastic: mat(0x252d31, .05, .54), film: mat(0x324650, .06, .58),
    insulation: mat(0xded9cd, .04, .65), label: mat(0xb5c2bb, .03, .8),
  };
  const box = (parent, size, pos, material, name = '') => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...pos); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const rounded = (parent, size, pos, radius, material, name = '') => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, radius), material);
    mesh.position.set(...pos); mesh.name = name; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const cylinder = (parent, radius, height, pos, material, segments = 20) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
    mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  };
  const screw = (parent, x, y, z, radius = .045) => {
    cylinder(parent, radius, .025, [x, y, z], m.silver, 12);
    box(parent, [radius * 1.2, .005, .012], [x, y + .014, z], m.dark);
  };
  const component = (id, name, category, description, offset, build) => {
    const p = new THREE.Group(); p.name = name; p.userData.partId = id;
    build(p);
    // Assign the id to every descendant so simple raycasters can resolve the component.
    p.traverse(child => { child.userData.partId = id; });
    group.add(p); parts.push({ id, name, category, description, group: p, explodedOffset: offset }); return p;
  };

  component('housing', 'Cast housing', 'Enclosure', 'An aluminum enclosure supports and protects the inverter assembly and provides mounting points for the vehicle.', [-.2, -.25, 0], p => {
    box(p, [3.28, .12, 2.38], [0, .07, 0], m.case);
    box(p, [.12, .62, 2.38], [-1.58, .39, 0], m.case); box(p, [.12, .62, 2.38], [1.58, .39, 0], m.case);
    box(p, [3.1, .62, .12], [0, .39, -1.13], m.case); box(p, [3.1, .62, .12], [0, .39, 1.13], m.case);
    for (const x of [-1.4, 1.4]) for (const z of [-.96, .96]) screw(p, x, .72, z, .055);
    for (const x of [-1.73, 1.73]) for (const z of [-.73, .73]) { box(p, [.3, .1, .23], [x, .08, z], m.case); cylinder(p, .075, .12, [x, .13, z], m.dark); }
    for (let x = -1.35; x <= 1.35; x += .3) { box(p, [.06, .28, .06], [x, .34, 1.20], m.edge); }
  });
  component('coldplate', 'Liquid-cooled cold plate', 'Thermal management', 'A liquid-cooled base removes heat from the power switches; coolant enters and leaves through the two side fittings.', [0, -.55, 0], p => {
    box(p, [2.94, .16, 2.02], [0, .20, 0], m.silver);
    for (let i = 0; i < 8; i++) box(p, [2.68, .015, .035], [0, .29, -.87 + i * .25], m.edge);
    for (const z of [-.64, -.31]) {
      const fitting = cylinder(p, .085, .38, [1.72, .27, z], m.silver); fitting.rotation.z = Math.PI / 2;
      const end = cylinder(p, .11, .1, [1.93, .27, z], m.dark); end.rotation.z = Math.PI / 2;
    }
  });
  // Each group is one enclosed half-bridge package. Internal dies are deliberately
  // not shown: each enclosure contains the high- and low-side devices.
  const phaseColors = [m.gold, m.blue, m.red];
  for (let phase = 0; phase < 3; phase++) {
    const x = -.93 + phase * .93;
    component(`phase-${phase + 1}`, `${['U', 'V', 'W'][phase]} phase power switches`, 'Power stage', `An enclosed ${['U', 'V', 'W'][phase]} half-bridge module contains high-side and low-side switches. Its DC and phase terminals carry power; the smaller pins connect to the gate driver.`, [(-1 + phase) * .42, .8, .25], p => {
      // Metal mounting flange and molded body with three elevated power lugs.
      rounded(p, [.78, .055, .90], [x, .32, .35], .025, m.silver, 'Mounting base');
      rounded(p, [.68, .235, .77], [x, .463, .35], .035, m.plastic, 'Half-bridge module body');
      rounded(p, [.57, .015, .67], [x, .59, .35], .018, m.dark, 'Molded top');
      for (const dx of [-.31, .31]) for (const dz of [-.34, .34]) screw(p, x + dx, .36, .35 + dz, .027);
      // DC+ and DC− at the rear, and the AC phase lug at the front.
      for (const dx of [-.17, .17]) {
        rounded(p, [.15, .07, .16], [x + dx, .635, -.005], .012, m.silver, 'DC lug');
        cylinder(p, .034, .024, [x + dx, .68, -.005], m.dark, 6);
      }
      rounded(p, [.22, .06, .16], [x, .625, .66], .012, m.silver, 'AC output lug');
      cylinder(p, .041, .025, [x, .668, .66], m.dark, 6);
      // Two banks of fine signal pins are visually distinct from the power lugs.
      for (const dx of [-.30, .30]) for (let n=0; n<4; n++) {
        cylinder(p, .012, .085, [x + dx, .64, .16 + n*.095], m.silver, 8);
      }
      box(p, [.25, .004, .08], [x, .601, .39], m.label, 'Module identification area');
    });
  }
  component('dc-link', 'DC-link capacitor bank', 'DC link', 'A bank of representative film capacitors supplies the high-frequency switching current close to the power stage. Cylindrical cases and paired terminals make the DC-link assembly easy to identify.', [-2.1, .9, 1.25], p => {
    for (let i = 0; i < 5; i++) {
      const x = -1.12 + i * .56;
      // Cylindrical resin-filled film-capacitor cans with twin flat busbar tabs.
      const can = cylinder(p, .195, .43, [x, .525, -.68], m.plastic, 40); can.name = 'Film capacitor case';
      cylinder(p, .194, .026, [x, .751, -.68], m.dark, 40);
      cylinder(p, .172, .012, [x, .769, -.68], m.silver, 40);
      cylinder(p, .146, .009, [x, .779, -.68], m.black, 40);
      for (const z of [-.78, -.58]) {
        rounded(p, [.11, .03, .085], [x, .791, z], .008, m.copper, 'Flat capacitor terminal');
        cylinder(p, .026, .017, [x, .814, z], m.silver, 8);
      }
      rounded(p, [.21, .005, .06], [x, .786, -.68], .008, m.label, 'Capacitor label area');
    }
  });
  component('dc-busbars', 'Laminated DC busbars', 'DC link', 'Two closely spaced DC conductors connect the capacitor bank and the half-bridge modules. An insulating layer separates the overlapping conductors; the bends and lugs are illustrative.', [0, .75, .05], p => {
    // A broad conductor assembly with an explicit dielectric between layers.
    rounded(p, [2.72, .028, .23], [0, .84, -.78], .012, m.copper, 'DC positive layer');
    rounded(p, [2.76, .018, .32], [0, .862, -.68], .008, m.insulation, 'Lamination dielectric');
    rounded(p, [2.72, .028, .24], [0, .885, -.59], .012, m.bus, 'DC negative layer');
    for (let i = 0; i < 5; i++) {
      const x = -1.12 + i * .56;
      // Opposite capacitor terminals reach their respective insulated layers.
      box(p, [.09, .025, .10], [x, .826, -.78], m.copper);
      box(p, [.09, .07, .10], [x, .852, -.58], m.bus);
      screw(p, x, .868, -.78, .022); screw(p, x, .913, -.58, .022);
    }
    for (let phase = 0; phase < 3; phase++) {
      const x = -.93 + phase * .93;
      rounded(p, [.14, .027, .72], [x - .17, .84, -.40], .01, m.copper, 'Positive branch');
      rounded(p, [.14, .027, .53], [x + .17, .885, -.30], .01, m.bus, 'Negative branch');
      box(p, [.14, .17, .12], [x - .17, .755, -.01], m.copper);
      box(p, [.14, .215, .12], [x + .17, .778, -.01], m.bus);
      screw(p, x - .17, .86, -.005, .029); screw(p, x + .17, .905, -.005, .029);
    }
  });
  component('phase-busbars', 'Three-phase output busbars', 'Power stage', 'Each copper output conductor carries one phase of the inverter output to the motor connection.', [0, .75, .65], p => {
    for (let phase = 0; phase < 3; phase++) {
      const x = -.93 + phase * .93;
      rounded(p, [.16, .055, .58], [x, .62, .82], .012, m.bus, 'Phase output conductor');
      rounded(p, [.27, .055, .19], [x, .62, 1.07], .014, m.bus, 'Motor terminal pad');
      screw(p, x, .662, .66, .038); screw(p, x, .662, 1.06, .035);
      // An insulated sleeve distinguishes the phase conductor as it passes the sensor.
      rounded(p, [.19, .065, .11], [x, .62, .92], .014, m.insulation, 'Sensor passage insulation');
    }
  });
  component('gate-driver', 'Isolated gate-driver boards', 'Control and sensing', 'Gate drivers translate controller commands into isolated gate signals for the high-side and low-side semiconductor switches.', [0, 1.2, .15], p => {
    for (let phase = 0; phase < 3; phase++) {
      const x = -.93 + phase * .93;
      box(p, [.69, .045, .32], [x, .74, .20], m.pcb);
      for (const dx of [-.21, 0, .21]) {
        box(p, [.12, .045, .10], [x + dx, .79, .2], m.chip);
        for (const dz of [-.1, .1]) box(p, [.10, .025, .025], [x + dx, .78, .2 + dz], m.silver);
      }
      for (const dx of [-.28, .28]) screw(p, x + dx, .78, .30, .022);
    }
  });
  component('control-card', 'Control and communications card', 'Control and sensing', 'The controller measures operating conditions and produces switching commands; communications connect the inverter to the vehicle.', [0, 1.65, .5], p => {
    box(p, [1.05, .06, .62], [0, 1.03, -.49], m.pcb2);
    box(p, [.28, .055, .25], [0, 1.09, -.49], m.chip);
    for (const x of [-.39, .39]) for (const z of [-.66, -.33]) { box(p, [.12, .06, .09], [x, 1.09, z], m.chip); }
    for (const x of [-.42, .42]) for (const z of [-.72, -.25]) screw(p, x, 1.08, z, .022);
    for (let i = 0; i < 6; i++) box(p, [.045, .014, .11], [-.2 + i * .08, 1.07, -.72], m.gold);
    box(p, [.23, .11, .12], [.3, 1.10, -.23], m.dark);
    for (const x of [-.42, .42]) cylinder(p, .025, .22, [x, .9, -.69], m.silver, 12);
  });
  component('current-sensors', 'Phase-current sensors', 'Control and sensing', 'Current sensors report motor-phase current for closed-loop control and protection.', [.55, 1.0, .75], p => {
    for (let phase = 0; phase < 3; phase++) {
      const x = -.93 + phase * .93;
      box(p, [.31, .15, .16], [x, .72, .93], m.black);
      box(p, [.13, .16, .17], [x, .72, .93], m.bus);
      box(p, [.15, .035, .1], [x, .81, .93], m.pcb);
    }
  });
  component('hv-input', 'High-voltage DC input', 'Connections', 'The DC input connects the battery-side supply to the inverter DC link. Orange identifies high-voltage connections.', [-1, .3, -.8], p => {
    box(p, [.48, .36, .33], [-1.2, .48, -1.25], m.orange);
    for (const x of [-1.32, -1.08]) { const pin = cylinder(p, .055, .18, [x, .49, -1.45], m.silver); pin.rotation.x = Math.PI / 2; }
    box(p, [.3, .07, .15], [-1.2, .69, -1.24], m.dark);
  });
  component('motor-output', 'U / V / W motor terminals', 'Connections', 'The three motor terminals carry the inverter AC output to the electric machine.', [0, .35, 1.0], p => {
    for (let phase = 0; phase < 3; phase++) {
      const x = -.93 + phase * .93;
      box(p, [.32, .3, .35], [x, .53, 1.23], m.orange);
      const pin = cylinder(p, .07, .22, [x, .53, 1.46], m.silver); pin.rotation.x = Math.PI / 2;
      box(p, [.22, .07, .12], [x, .72, 1.2], phaseColors[phase]);
    }
  });
  component('lid', 'Removable enclosure cover', 'Enclosure', 'The cover seals the enclosure. It is shown translucent so the inverter internals remain visible.', [0, 2.0, 0], p => {
    box(p, [3.22, .065, 2.32], [0, 1.2, 0], m.lid);
    for (const x of [-1.55, 1.55]) box(p, [.055, .09, 2.32], [x, 1.2, 0], m.edge);
    for (const z of [-1.13, 1.13]) box(p, [3.2, .09, .055], [0, 1.2, z], m.edge);
    for (const x of [-1.42, 1.42]) for (const z of [-.97, .97]) screw(p, x, 1.26, z, .042);
  });
  refineInverterDetails(THREE, parts);
  return { group, parts };
}





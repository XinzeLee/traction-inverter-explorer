// Visual references describe real examples; the model combines details and is not a copy of any one product.
const ti = { label: 'TI traction inverter reference design', url: 'https://www.ti.com/lit/ug/tiduf23/tiduf23.pdf' };
const nxp = { label: 'NXP inverter reference platform', url: 'https://www.nxp.com/document/guide/getting-started-with-the-ev-invertergen3-ev-traction-inverter-control-reference-design-gen-3:GS-EV-INVERTERGEN3' };
const wolf = { label: 'Wolfspeed XM3 half-bridge module', url: 'https://assets.wolfspeed.com/uploads/2024/01/Wolfspeed_CAB450M12XM3_data_sheet.pdf' };
const tdk = { label: 'KEMET cylindrical DC-link film capacitor', url: 'https://content.kemet.com/datasheets/KEM_F3059_C4DE.pdf' };
const sensor = { label: 'LEM HAH3 traction current sensors', url: 'https://www.lem.com/en/hah3' };
const infineon = { label: 'Infineon inverter evaluation kit', url: 'https://www.infineon.com/assets/row/public/documents/10/42/infineon-an-g2-kitquickstart-applicationnotes-en.pdf' };
export const visualReferences = {
  'housing': [ti], 'lid': [ti], 'coldplate': [infineon, nxp],
  'phase-1': [wolf, ti], 'phase-2': [wolf, ti], 'phase-3': [wolf, ti],
  'dc-link': [tdk, ti], 'dc-busbars': [ti], 'phase-busbars': [ti, nxp],
  'gate-driver': [infineon, nxp], 'control-card': [nxp], 'current-sensors': [sensor, nxp],
  'hv-input': [nxp], 'motor-output': [nxp],
};

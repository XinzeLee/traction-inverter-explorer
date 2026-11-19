// Representative industrial details informed by TI's TIDM-02014 reference design
// (https://www.ti.com/lit/ug/tiduf23/tiduf23.pdf, sections 3.1.1.3–3.1.1.7)
// and LEM HAH3 / HC5 open-aperture sensors (https://www.lem.com/en/hah3,
// https://www.lem.com/en/hc5). This is an illustrative assembly, not a product replica.
export function refineInverterDetails(THREE, parts) {
  const byId = Object.fromEntries(parts.map(part => [part.id, part]));
  const material = (color, metalness = 0, roughness = .48, extra = {}) => new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});
  const m = {
    casting: material(0xb6c0c1,.46,.38), edge: material(0xd1d8d6,.52,.29), darkMetal: material(0x576669,.76,.32),
    steel: material(0xd4dddb,.52,.28), black: material(0x202a2d,.1,.62), dark:material(0x10191b,.18,.45),
    seal: material(0x283237,.06,.8), orange: material(0xe67528,.08,.42), orangeDark: material(0xb85519,.12,.48),
    pcb: material(0x124e44,.08,.52), pcbEdge: material(0xb7a068,.28,.56), chip:material(0x202426,.06,.64),
    solder:material(0xc9cfca,.8,.25), copper:material(0xc37c4c,.82,.28), gold:material(0xd0b16c,.7,.28),
    cream: material(0xcabca0,.05,.66), white: material(0xe2e1d3,.03,.52),
    lid: material(0xb9c7c9,.58,.34,{transparent:true,opacity:.54,depthWrite:false})
  };
  const box = (p, s, pos, mat) => {const o=new THREE.Mesh(new THREE.BoxGeometry(...s),mat);o.position.set(...pos);p.add(o);return o;};
  const cyl = (p,r,h,pos,mat,n=28) => {const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,n),mat);o.position.set(...pos);p.add(o);return o;};
  const torus = (p,r,t,pos,mat,axis='y') => {const o=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,28),mat);o.position.set(...pos);if(axis==='y')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.y=Math.PI/2;p.add(o);return o;};
  const screw = (p,x,y,z,r=.038) => {cyl(p,r,.025,[x,y,z],m.steel,12);box(p,[r*1.05,.006,.009],[x,y+.014,z],m.dark);};
  const boltZ = (p,x,y,z,r=.035) => {const c=cyl(p,r,.025,[x,y,z],m.steel,12);c.rotation.x=Math.PI/2;};
  const axialX = (p,r,length,x,y,z,mat) => {const o=cyl(p,r,length,[x,y,z],mat);o.rotation.z=Math.PI/2;return o;};
  const axialZ = (p,r,length,x,y,z,mat) => {const o=cyl(p,r,length,[x,y,z],mat);o.rotation.x=Math.PI/2;return o;};
  const addTube = (p,points,r,mat) => {const curve = new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,r,8,false),mat);p.add(mesh);};
  const replace = (id, description, build) => {const part=byId[id];if(!part)throw new Error(`Missing inverter component: ${id}`);part.group.clear();if(description)part.description=description;build(part.group);part.group.traverse(child=>{child.userData.partId=id;});};

  replace('housing','A ribbed cast-metal enclosure supports the internal stack and provides a bolted flange for the removable cover. The visible mounting bosses and seals are illustrative.',p=>{
    box(p,[3.28,.12,2.38],[0,.06,0],m.casting);
    // Raised peripheral walls meet the cover flange at y=1.17.
    for(const x of [-1.58,1.58])box(p,[.12,1.05,2.38],[x,.645,0],m.casting);
    // Split end walls around the connector apertures so the plugs and phase
    // conductors pass through the casing rather than a solid wall.
    for(const z of [-1.13,1.13]){
      box(p,[3.05,.26,.12],[0,.25,z],m.casting);
      box(p,[3.05,.34,.12],[0,1.00,z],m.casting);
    }
    for(const [a,b] of [[-1.525,-1.15],[-.71,-.22],[.22,.71],[1.15,1.525]])box(p,[b-a,.45,.12],[(a+b)/2,.605,1.13],m.casting);
    for(const [a,b] of [[-1.525,-1.50],[-.90,1.525]])box(p,[b-a,.45,.12],[(a+b)/2,.605,-1.13],m.casting);
    for(const x of [-1.57,1.57])box(p,[.22,.06,2.42],[x,1.14,0],m.edge);
    for(const z of [-1.14,1.14])box(p,[3.03,.06,.22],[0,1.14,z],m.edge);
    // Outside stiffening fins and shallow casting webs.
    for(const x of [-1.49,-1.05,-.61,-.17,.27,.71,1.15,1.49]) {
      if (![ -.93, 0, .93 ].some(v=>Math.abs(x-v)<.25)) box(p,[.075,.74,.12],[x,.54,1.205],m.casting);
      if (Math.abs(x+1.20)>.38) box(p,[.075,.74,.12],[x,.54,-1.205],m.casting);
    }
    for(const z of [-.91,-.46,0,.46,.91])for(const x of [-1.65,1.65])box(p,[.12,.74,.075],[x,.54,z],m.casting);
    for(const x of [-1.75,1.75])for(const z of [-.8,.8]){box(p,[.35,.11,.30],[x,.11,z],m.casting);cyl(p,.085,.012,[x,.175,z],m.darkMetal);torus(p,.086,.014,[x,.18,z],m.edge);}
    // Gasket line around the lid seat.
    for(const x of [-1.45,1.45])box(p,[.025,.012,2.06],[x,1.175,0],m.seal);
    for(const z of [-1.02,1.02])box(p,[2.92,.012,.025],[0,1.175,z],m.seal);
  });
  replace('coldplate','A flat liquid-cooled cold plate contacts the power modules. Two hose connections represent coolant inlet and outlet; the internal passages are not exposed.',p=>{
    box(p,[2.94,.16,2.02],[0,.20,0],m.steel);
    box(p,[2.78,.012,1.86],[0,.286,0],m.edge);
    for (const y of [.11,.145,.18]) {
      for (const z of [-1.005,1.005]) box(p,[2.85,.012,.025],[0,y,z],m.darkMetal);
      for (const x of [-1.465,1.465]) box(p,[.025,.012,1.99],[x,y,0],m.darkMetal);
    }
    for(const x of [-1.32,1.32])for(const z of [-.86,.86]) screw(p,x,.302,z,.035);
    // Joined fittings: hex bases, hose barbs, sealing O-rings and dark bores.
    for(const z of [-.67,-.32]){
      axialX(p,.115,.15,1.49,.23,z,m.darkMetal).geometry=new THREE.CylinderGeometry(.115,.115,.15,6);
      axialX(p,.084,.36,1.70,.23,z,m.steel);
      for(const x of [1.59,1.70,1.80])torus(p,.084,.012,[x,.23,z],m.darkMetal,'x');
      axialX(p,.059,.006,1.889,.23,z,m.dark);
      torus(p,.064,.011,[1.893,.23,z],m.seal,'x');
    }
  });
  const pcb = (p,x,y,z,w,d) => {
    box(p,[w,.045,d],[x,y,z],m.pcbEdge);box(p,[w,.015,d],[x,y+.03,z],m.pcb);
    for(const dx of [-w/2+.075,w/2-.075])for(const dz of [-d/2+.075,d/2-.075]){torus(p,.032,.008,[x+dx,y+.042,z+dz],m.gold);cyl(p,.021,.006,[x+dx,y+.044,z+dz],m.dark);}
  };
  const chip = (p,x,y,z,w,d) => {
    box(p,[w,.035,d],[x,y,z],m.chip);
    for(let i=0;i<4;i++){const dz=(i-1.5)*d*.2;for(const s of [-1,1])box(p,[.035,.008,.012],[x+s*(w/2+.012),y-.009,z+dz],m.solder);}
    cyl(p,.008,.003,[x-w*.33,y+.019,z-d*.31],m.cream,10);
  };
  const smd=(p,x,y,z) => {box(p,[.06,.025,.028],[x,y,z],m.cream);for(const dx of [-.025,.025])box(p,[.012,.026,.029],[x+dx,y,z],m.solder);};
  replace('gate-driver','A common green gate-driver board carries isolated driver channels and bias circuits near the three power modules. It is a representative arrangement, not a PCB layout for manufacture.',p=>{
    // A full-width board gives the exploded stack the coherent outline of an inverter.
    pcb(p,0,.735,.20,2.67,.48);
    for(let phase=0;phase<3;phase++){
      const x=-.93+phase*.93;
      for(const dx of [-.19,.19]){
        chip(p,x+dx,.80,.20,.16,.105);
        box(p,[.095,.04,.075],[x+dx,.802,.09],m.black);
        for(let i=0;i<3;i++)smd(p,x+dx-.045+i*.045,.792,.30);
      }
      for(const dx of [-.28,.28]){
        box(p,[.055,.06,.055],[x+dx,.79,.36],m.white);
        for(let i=0;i<3;i++)smd(p,x+dx+(i-1)*.045,.79,.03);
      }
      box(p,[.12,.08,.08],[x,.81,.02],m.dark);
      for(let i=0;i<4;i++)box(p,[.012,.014,.045],[x+(i-1.5)*.025,.855,.02],m.gold);
    }
  });
  replace('control-card','The controller PCB carries the microcontroller and interfaces for gate commands, current feedback, protection and vehicle communications. The layout is illustrative.',p=>{
    pcb(p,0,1.03,-.49,2.55,.68);
    chip(p,-.05,1.095,-.48,.29,.25);
    for(let i=0;i<8;i++){const d=(i-3.5)*.028;for(const sign of [-1,1]){box(p,[.018,.008,.010],[-.05+sign*.159,1.087,-.48+d],m.solder);box(p,[.010,.008,.018],[-.05+d,1.087,-.48+sign*.139],m.solder);}}
    for(const x of [-1.06,-.75,-.42,.36,.69,1.02]){
      chip(p,x,1.095,-.52,.14,.105);
      for(let i=0;i<3;i++)smd(p,x+(i-1)*.05,1.09,-.30);
      box(p,[.085,.05,.08],[x,1.10,-.69],m.black);
    }
    for(const x of [-1.12,-.88,.76,1.02]){
      box(p,[.13,.08,.09],[x,1.12,-.23],m.black);
      for(let i=0;i<4;i++)box(p,[.015,.008,.06],[x+(i-1.5)*.026,1.165,-.23],m.gold);
    }
    for(const x of [-1.14,1.14])for(const z of [-.72,-.25]){cyl(p,.025,.14,[x,.94,z],m.steel,12);screw(p,x,1.075,z,.026);}
  });
  replace('current-sensors','Three aperture-style sensors surround the phase busbars. They measure magnetic field around each conductor and send current feedback to the controller.',p=>{
    for(let phase=0;phase<3;phase++){
      const x=-.93+phase*.93,z=.93,cy=.62;
      // Four sides leave a true open window around the flat phase conductor.
      box(p,[.42,.065,.20],[x,cy+.13,z],m.black);box(p,[.42,.065,.20],[x,cy-.13,z],m.black);
      box(p,[.07,.20,.20],[x-.175,cy,z],m.black);box(p,[.07,.20,.20],[x+.175,cy,z],m.black);
      for(const dx of [-.17,.17]) box(p,[.025,.17,.03],[x+dx,cy,z+.11],m.darkMetal);
      box(p,[.20,.055,.12],[x,cy+.19,z-.02],m.pcb);
      chip(p,x,cy+.23,z-.02,.09,.06);
      box(p,[.10,.06,.07],[x+.14,cy+.18,z-.03],m.black);
    }
  });
  replace('hv-input','The orange two-pole connector identifies the high-voltage DC input from the battery. The connector has a mounting flange, locking feature and recessed contacts.',p=>{
    box(p,[.60,.46,.09],[-1.20,.57,-1.215],m.darkMetal);
    for(const x of [-1.43,-.97])for(const y of [.40,.74])boltZ(p,x,y,-1.27,.027);
    box(p,[.48,.34,.30],[-1.20,.57,-1.37],m.orange);
    box(p,[.38,.27,.06],[-1.20,.57,-1.54],m.orangeDark);
    box(p,[.39,.07,.11],[-1.20,.77,-1.40],m.black);
    for(const x of [-1.31,-1.09]){axialZ(p,.075,.02,x,.57,-1.575,m.black);axialZ(p,.04,.025,x,.57,-1.59,m.steel);torus(p,.076,.009,[x,.57,-1.594],m.seal,'z');}
    // Simplified internal connection tabs reach the two separate DC layers.
    for(const [x,y,metal] of [[-1.31,.70,m.copper],[-1.09,.75,m.steel]]){
      box(p,[.075,.027,.38],[x,y,-.99],metal);
      box(p,[.075,y-.56,.07],[x,(y+.56)/2,-1.16],metal);
    }
  });
  replace('motor-output','Three sealed orange high-voltage terminals carry the U, V and W phase currents to the traction motor.',p=>{
    for(let phase=0;phase<3;phase++){
      const x=-.93+phase*.93;
      box(p,[.40,.39,.08],[x,.60,1.19],m.darkMetal);
      for(const dx of [-.15,.15])for(const dy of [-.14,.14])boltZ(p,x+dx,.60+dy,1.24,.024);
      box(p,[.32,.29,.27],[x,.60,1.37],m.orange);
      box(p,[.24,.21,.045],[x,.60,1.53],m.orangeDark);
      axialZ(p,.09,.015,x,.60,1.565,m.black);axialZ(p,.054,.02,x,.60,1.58,m.steel);torus(p,.092,.009,[x,.60,1.59],m.seal,'z');
      box(p,[.16,.05,.09],[x,.775,1.37],m.black);
      box(p,[.16,.055,.18],[x,.62,1.16],m.copper);
    }
  });
  replace('lid','The removable cover bolts to a gasketed flange. It is shown translucent so the interior remains visible; a real enclosure cover would normally be opaque.',p=>{
    box(p,[3.22,.065,2.32],[0,1.215,0],m.lid);
    for(const x of [-1.55,1.55])box(p,[.10,.07,2.32],[x,1.215,0],m.edge);
    for(const z of [-1.12,1.12])box(p,[3.04,.07,.10],[0,1.215,z],m.edge);
    for(const x of [-1.42,-.48,.48,1.42])for(const z of [-1.03,1.03])screw(p,x,1.26,z,.038);
    for(const x of [-1.49,1.49])for(const z of [-.62,0,.62])screw(p,x,1.26,z,.035);
    // Reinforcing ribs and bosses evoke the cast metal lid while the translucent
    // face keeps the contents inspectable in assembled view.
    for(const x of [-1.15,-.92,-.69,-.46,-.23,0,.23,.46,.69,.92,1.15])box(p,[.032,.025,1.80],[x,1.264,0],m.edge);
    for(const x of [-1.42,1.42])for(const z of [-.98,-.48,0,.48,.98]){
      cyl(p,.07,.05,[x,1.25,z],m.casting,20);screw(p,x,1.284,z,.028);
    }
    for(const z of [-1.04,1.04])box(p,[2.80,.035,.055],[0,1.26,z],m.casting);
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createInverter } from '../src/inverter.js';
import { createVehicleContext } from '../src/vehicle.js';
import { pickableGroups } from '../src/picking.js';

test('assembly exposes independently positioned and named parts', () => {
  const {group, parts} = createInverter(THREE);
  assert.equal(parts.length, 14);
  assert.equal(new Set(parts.map(p => p.id)).size, parts.length);
  for (const part of parts) {
    assert.equal(part.group.parent, group);
    assert.equal(part.explodedOffset.length, 3);
    assert.ok(part.name && part.description && part.category);
    assert.ok(part.group.children.length);
  }
  assert.deepEqual(parts.filter(p=>/^phase-[123]$/.test(p.id)).map(p=>p.name), ['U phase power switches','V phase power switches','W phase power switches']);
});
test('vehicle is separate, marked as context and has finite dimensions', () => {
  const vehicle = createVehicleContext();
  assert.ok(vehicle.children.length > 0);
  vehicle.traverse(child => { if (child !== vehicle) assert.equal(child.userData.contextOnly, true); });
  const size = new THREE.Box3().setFromObject(vehicle).getSize(new THREE.Vector3());
  assert.ok(size.x > 7 && size.x < 10 && size.y > 1 && size.z > 2);
});


test('isolated views never allow a hidden component to intercept a click', () => {
  const {parts} = createInverter(THREE);
  for (const p of parts) p.group.visible = p.id === 'coldplate';
  assert.deepEqual(pickableGroups(parts), [parts.find(p => p.id === 'coldplate').group]);
  parts.find(p => p.id === 'lid').group.visible = true;
  assert.deepEqual(pickableGroups(parts), [parts.find(p => p.id === 'coldplate').group]);
});

test('cover seats on enclosure and reference-informed packages are present', () => {
  const {parts} = createInverter(THREE);
  const get = id => parts.find(p => p.id === id).group;
  const top = new THREE.Box3().setFromObject(get('housing')).max.y;
  const bottom = new THREE.Box3().setFromObject(get('lid')).min.y;
  assert.ok(Math.abs(top - bottom) < .015, `cover gap: ${bottom - top}`);
  for (const id of ['phase-1','phase-2','phase-3']) {
    const names=[];get(id).traverse(child=>names.push(child.name));
    assert.ok(names.includes('Half-bridge module body'));
    assert.ok(names.includes('AC output lug'));
    assert.equal(names.filter(n=>n === 'DC lug').length, 2);
  }
  const capNames=[];get('dc-link').traverse(child=>capNames.push(child.name));
  assert.equal(capNames.filter(n=>n === 'Film capacitor case').length, 5);
  assert.equal(capNames.filter(n=>n === 'Flat capacitor terminal').length, 10);
});

import { createVehicleSystem } from '../src/vehicleSystem.js';

test('vehicle model contains the requested system components and valid named connections', () => {
  const {group, parts, connections} = createVehicleSystem(THREE);
  const ids = new Set(parts.map(part => part.id));
  assert.equal(ids.size, 15);
  for (const id of ['sys-battery','sys-bms','sys-junction','sys-motor','sys-dcdc','sys-heater','sys-compressor','sys-obc-acdc','sys-obc-dcdc','sys-ac-inlet','sys-wireless-rx','sys-wireless-tx','sys-dc-charger','sys-fast-acdc','sys-fast-dcdc']) assert.ok(ids.has(id), id);
  ids.add('traction-inverter');
  for (const connection of connections) { assert.ok(ids.has(connection.from), connection.id); assert.ok(ids.has(connection.to), connection.id); }
  assert.equal(connections.filter(c=>c.kind==='phase').length, 3);
  assert.ok(connections.some(c=>c.from==='sys-junction' && c.to==='traction-inverter'));
  assert.ok(connections.some(c=>c.from==='sys-fast-dcdc' && c.to==='sys-battery'));
  assert.ok(connections.some(c=>c.from==='sys-obc-dcdc' && c.to==='sys-battery'));
  assert.ok(connections.some(c=>c.from==='sys-wireless-tx' && c.to==='sys-wireless-rx' && c.kind==='wireless'));
  assert.equal(group.getObjectByName('wireless-coupling'), undefined, 'wireless coupling must not become a cable');
  assert.ok(connections.filter(c=>c.from==='sys-bms' || c.to==='sys-bms').every(c=>c.kind==='signal'));
});

// lib/sankeyDataBuilder.test.ts
// Test for battery-consumer separation logic

import { buildSankeyData } from './sankeyDataBuilder';
import type { EnergyFlowData } from './sankeyDataBuilder';
import { createRootNode, createGroupNode } from './consumerHierarchy';

console.log('🧪 BATTERY-CONSUMER SEPARATION TESTS\n');
console.log('=' .repeat(70));

// Create test consumer tree
const consumerTree = createRootNode();

// Add apartments group (should be supplied by Battery 2)
const apartmentsNode = createGroupNode(
  'apartments',
  'Wohnungen',
  'building',
  8000, // 8 kW
  'measured',
  ['apartments']
);
consumerTree.children.push(apartmentsNode);

// Add shared group (should be supplied by Battery 1)
const sharedNode = createGroupNode(
  'shared',
  'Allgemein',
  'building',
  4000, // 4 kW
  'measured',
  ['shared']
);
consumerTree.children.push(sharedNode);

// Update root power
consumerTree.powerW = apartmentsNode.powerW + sharedNode.powerW;

// Test scenario: Both batteries discharging, no PV
const energyFlow: EnergyFlowData = {
  pvProductionW: 0, // No PV production
  battery1SocPercent: 60,
  battery2SocPercent: 55,
  battery1Direction: 'discharging',
  battery2Direction: 'discharging',
  netFlowW: -12000 // Deficit (consuming more than producing)
};

console.log('\n✓ TEST 1: BATTERY SEPARATION - Both Discharging');
console.log('-'.repeat(70));
console.log('  Scenario: No PV, both batteries discharging');
console.log(`  Apartments consumption: ${apartmentsNode.powerW / 1000}kW`);
console.log(`  Shared consumption: ${sharedNode.powerW / 1000}kW`);

const sankeyData = buildSankeyData(consumerTree, null, energyFlow, true);

console.log(`\n  Nodes (${sankeyData.nodes.length}):`);
sankeyData.nodes.forEach((node, i) => {
  console.log(`    [${i}] ${node.name} (${node.id})`);
});

console.log(`\n  Links (${sankeyData.links.length}):`);
let bat1ToWR1 = false;
let bat2ToWR2 = false;
let wr1ToShared = false;
let wr2ToApartments = false;

sankeyData.links.forEach((link) => {
  const sourceName = sankeyData.nodes[link.source].name;
  const targetName = sankeyData.nodes[link.target].name;
  console.log(`    ${sourceName} -> ${targetName}: ${(link.value / 1000).toFixed(2)}kW`);
  
  // Check battery -> inverter connections
  if (sourceName.startsWith('Bat1') && targetName === 'WR1') {
    bat1ToWR1 = true;
  }
  if (sourceName.startsWith('Bat2') && targetName === 'WR2') {
    bat2ToWR2 = true;
  }
  // Check inverter -> consumer connections
  if (sourceName === 'WR1' && targetName.startsWith('Allgemein')) {
    wr1ToShared = true;
  }
  if (sourceName === 'WR2' && targetName.startsWith('Wohnungen')) {
    wr2ToApartments = true;
  }
});

// Verify separation
console.log('\n  Battery-Inverter-Consumer Connection Check:');
console.log(`    Battery 1 -> WR1: ${bat1ToWR1 ? '✅ PRESENT (correct)' : '❌ ABSENT (should exist)'}`);
console.log(`    Battery 2 -> WR2: ${bat2ToWR2 ? '✅ PRESENT (correct)' : '❌ ABSENT (should exist)'}`);
console.log(`    WR1 -> Shared: ${wr1ToShared ? '✅ PRESENT (correct)' : '❌ ABSENT (should exist)'}`);
console.log(`    WR2 -> Apartments: ${wr2ToApartments ? '✅ PRESENT (correct)' : '❌ ABSENT (should exist)'}`);

// Check if separation is correct
const separationCorrect = bat1ToWR1 && bat2ToWR2 && wr1ToShared && wr2ToApartments;

if (separationCorrect) {
  console.log('\n  ✅ PASS: Battery-Inverter separation is correct!');
  console.log('    - Battery 1 -> WR1 -> Shared (Allgemeinteil)');
  console.log('    - Battery 2 -> WR2 -> Apartments (Wohnungen)');
} else {
  console.error('\n  ❌ FAIL: Battery-Inverter separation is incorrect!');
  if (!bat1ToWR1) {
    console.error('    - Battery 1 should connect to WR1');
  }
  if (!bat2ToWR2) {
    console.error('    - Battery 2 should connect to WR2');
  }
  if (!wr1ToShared) {
    console.error('    - WR1 should supply Shared');
  }
  if (!wr2ToApartments) {
    console.error('    - WR2 should supply Apartments');
  }
}

// Test scenario 2: Only Battery 1 discharging
console.log('\n✓ TEST 2: ONLY BATTERY 1 DISCHARGING');
console.log('-'.repeat(70));

const energyFlow2: EnergyFlowData = {
  pvProductionW: 0,
  battery1SocPercent: 60,
  battery2SocPercent: 55,
  battery1Direction: 'discharging',
  battery2Direction: 'idle',
  netFlowW: -12000
};

const sankeyData2 = buildSankeyData(consumerTree, null, energyFlow2, true);

let bat1ToWR1_test2 = false;
let bat2Supply = false;
let gridToWR2 = false;

console.log(`  Links (${sankeyData2.links.length}):`);
sankeyData2.links.forEach((link) => {
  const sourceName = sankeyData2.nodes[link.source].name;
  const targetName = sankeyData2.nodes[link.target].name;
  console.log(`    ${sourceName} -> ${targetName}: ${(link.value / 1000).toFixed(2)}kW`);
  
  if (sourceName.startsWith('Bat1') && targetName === 'WR1') bat1ToWR1_test2 = true;
  if (sourceName.startsWith('Bat2')) bat2Supply = true;
  if (sourceName === 'Netz' && targetName === 'WR2') {
    gridToWR2 = true;
  }
});

if (bat1ToWR1_test2 && !bat2Supply && gridToWR2) {
  console.log('\n  ✅ PASS: Battery 1 -> WR1 -> Shared, Grid -> WR2 -> Apartments');
} else {
  console.error('\n  ❌ FAIL: Expected Battery 1 -> WR1 for Shared and Grid -> WR2 for Apartments');
}

console.log('\n' + '='.repeat(70));
console.log('✅ BATTERY SEPARATION TESTS COMPLETED\n');

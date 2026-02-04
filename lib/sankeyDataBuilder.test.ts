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
let bat1ToApartments = false;
let bat1ToShared = false;
let bat2ToApartments = false;
let bat2ToShared = false;

sankeyData.links.forEach((link) => {
  const sourceName = sankeyData.nodes[link.source].name;
  const targetName = sankeyData.nodes[link.target].name;
  console.log(`    ${sourceName} -> ${targetName}: ${(link.value / 1000).toFixed(2)}kW`);
  
  // Check battery connections
  if (sourceName.startsWith('Bat1') && targetName.startsWith('Wohnungen')) {
    bat1ToApartments = true;
  }
  if (sourceName.startsWith('Bat1') && targetName.startsWith('Allgemein')) {
    bat1ToShared = true;
  }
  if (sourceName.startsWith('Bat2') && targetName.startsWith('Wohnungen')) {
    bat2ToApartments = true;
  }
  if (sourceName.startsWith('Bat2') && targetName.startsWith('Allgemein')) {
    bat2ToShared = true;
  }
});

// Verify separation
console.log('\n  Battery Connection Check:');
console.log(`    Battery 1 -> Apartments: ${bat1ToApartments ? '❌ PRESENT (should NOT exist)' : '✅ ABSENT (correct)'}`);
console.log(`    Battery 1 -> Shared: ${bat1ToShared ? '✅ PRESENT (correct)' : '❌ ABSENT (should exist)'}`);
console.log(`    Battery 2 -> Apartments: ${bat2ToApartments ? '✅ PRESENT (correct)' : '❌ ABSENT (should exist)'}`);
console.log(`    Battery 2 -> Shared: ${bat2ToShared ? '❌ PRESENT (should NOT exist)' : '✅ ABSENT (correct)'}`);

// Check if separation is correct
const separationCorrect = !bat1ToApartments && bat1ToShared && bat2ToApartments && !bat2ToShared;

if (separationCorrect) {
  console.log('\n  ✅ PASS: Battery separation is correct!');
  console.log('    - Battery 1 only supplies Shared (Allgemeinteil)');
  console.log('    - Battery 2 only supplies Apartments (Wohnungen)');
} else {
  console.error('\n  ❌ FAIL: Battery separation is incorrect!');
  if (bat1ToApartments) {
    console.error('    - Battery 1 should NOT supply Apartments');
  }
  if (!bat1ToShared) {
    console.error('    - Battery 1 should supply Shared');
  }
  if (!bat2ToApartments) {
    console.error('    - Battery 2 should supply Apartments');
  }
  if (bat2ToShared) {
    console.error('    - Battery 2 should NOT supply Shared');
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

let bat1Supply = false;
let bat2Supply = false;
let gridToApartments = false;

console.log(`  Links (${sankeyData2.links.length}):`);
sankeyData2.links.forEach((link) => {
  const sourceName = sankeyData2.nodes[link.source].name;
  const targetName = sankeyData2.nodes[link.target].name;
  console.log(`    ${sourceName} -> ${targetName}: ${(link.value / 1000).toFixed(2)}kW`);
  
  if (sourceName.startsWith('Bat1')) bat1Supply = true;
  if (sourceName.startsWith('Bat2')) bat2Supply = true;
  if (sourceName === 'Netz' && targetName.startsWith('Wohnungen')) {
    gridToApartments = true;
  }
});

if (bat1Supply && !bat2Supply && gridToApartments) {
  console.log('\n  ✅ PASS: Battery 1 supplies Shared, Grid supplies Apartments');
} else {
  console.error('\n  ❌ FAIL: Expected Battery 1 for Shared and Grid for Apartments');
}

console.log('\n' + '='.repeat(70));
console.log('✅ BATTERY SEPARATION TESTS COMPLETED\n');

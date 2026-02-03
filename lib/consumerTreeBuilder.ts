// lib/consumerTreeBuilder.ts
// Build hierarchical consumer tree from simulation data

import {
  ConsumerNode,
  createRootNode,
  createGroupNode,
  createDeviceNode,
  applyApartmentTemplate,
  applySharedTemplate,
  updateNodePowerFromChildren,
} from './consumerHierarchy';
import { Tenant } from './models';

export interface TenantConsumptionData {
  tenant: Tenant;
  householdPowerW: number;
  evChargingPowerW: number;
}

export interface CommonAreaData {
  pool: number;
  heating: number;
  garage: number;
  boiler: number;
}

/**
 * Build complete hierarchical consumer tree
 */
export function buildConsumerTree(
  tenantsData: TenantConsumptionData[],
  commonAreaData: CommonAreaData,
  includeAssumptions: boolean = true
): ConsumerNode {
  const root = createRootNode();
  
  // Create main branches
  const apartmentsNode = createGroupNode(
    'apartments',
    'Wohnungen',
    'building',
    0, // Will be calculated from children
    'mixed',
    ['Apartments']
  );
  
  const sharedNode = createGroupNode(
    'shared',
    'Gemeinschaft/Allgemein',
    'building',
    0, // Will be calculated from children
    'mixed',
    ['Shared', 'Common']
  );
  
  // Build apartment branches
  tenantsData.forEach((tenantData, index) => {
    const apartment = buildApartmentNode(tenantData, includeAssumptions);
    apartmentsNode.children.push(apartment);
  });
  
  // Build shared area branch
  const sharedChildren = buildSharedAreaNode(commonAreaData, includeAssumptions);
  sharedNode.children.push(...sharedChildren);
  
  // Add branches to root
  root.children.push(apartmentsNode);
  root.children.push(sharedNode);
  
  // Calculate aggregated power values bottom-up
  updateNodePowerFromChildren(root);
  
  return root;
}

/**
 * Build an apartment node with optional assumed breakdown
 */
function buildApartmentNode(
  tenantData: TenantConsumptionData,
  includeAssumptions: boolean
): ConsumerNode {
  const { tenant, householdPowerW, evChargingPowerW } = tenantData;
  const totalPowerW = householdPowerW + evChargingPowerW;
  
  const apartmentNode = createGroupNode(
    `apartment_${tenant.id}`,
    tenant.name,
    'apartments',
    totalPowerW,
    'simulated', // We have simulated data for totals
    ['Apartment']
  );
  
  if (includeAssumptions && totalPowerW > 0) {
    // We have total power but not detailed breakdown - apply assumptions
    const hasEV = evChargingPowerW > 0;
    
    // Create direct children for measured/known values
    if (evChargingPowerW > 0) {
      apartmentNode.children.push(createDeviceNode(
        `${apartmentNode.id}_ev`,
        `EV Laden (${tenant.vehicleType || 'Fahrzeug'})`,
        apartmentNode.id,
        evChargingPowerW,
        'simulated', // We simulated this
        ['EV', 'Mobility']
      ));
    }
    
    // Apply assumption template for household consumption
    if (householdPowerW > 0) {
      const assumedChildren = applyApartmentTemplate(
        apartmentNode,
        householdPowerW,
        undefined,
        false, // EV already handled separately
        0
      );
      apartmentNode.children.push(...assumedChildren);
    }
    
    // Mark as mixed source since we have both simulated totals and assumed details
    if (apartmentNode.children.length > 0) {
      apartmentNode.source = 'mixed';
    }
  } else if (!includeAssumptions) {
    // Without assumptions, just show the total as a single value
    // No children, the apartment node itself represents the total
    apartmentNode.source = 'simulated';
  }
  
  return apartmentNode;
}

/**
 * Build shared/common area nodes with optional breakdown
 */
function buildSharedAreaNode(
  commonAreaData: CommonAreaData,
  includeAssumptions: boolean
): ConsumerNode[] {
  const children: ConsumerNode[] = [];
  
  // Pool
  if (commonAreaData.pool > 0) {
    const poolNode = createGroupNode(
      'shared_pool',
      'Pool',
      'shared',
      commonAreaData.pool,
      'simulated',
      ['Pool', 'Shared']
    );
    
    if (includeAssumptions && commonAreaData.pool >= 200) {
      // Breakdown pool into pump, heating, control
      poolNode.children = [
        createDeviceNode(
          'shared_pool_pump',
          'Pumpe',
          'shared_pool',
          commonAreaData.pool * 0.6,
          'assumed',
          ['Pool', 'Pump'],
          {
            rule: 'PoolBreakdown',
            weightSet: 'default',
            confidence: 0.7,
            reason: 'Typical pool equipment distribution',
          }
        ),
        createDeviceNode(
          'shared_pool_heating',
          'Poolheizung',
          'shared_pool',
          commonAreaData.pool * 0.35,
          'assumed',
          ['Pool', 'Heating'],
          {
            rule: 'PoolBreakdown',
            weightSet: 'default',
            confidence: 0.7,
            reason: 'Typical pool equipment distribution',
          }
        ),
        createDeviceNode(
          'shared_pool_control',
          'Steuerung',
          'shared_pool',
          commonAreaData.pool * 0.05,
          'assumed',
          ['Pool', 'Control'],
          {
            rule: 'PoolBreakdown',
            weightSet: 'default',
            confidence: 0.7,
            reason: 'Typical pool equipment distribution',
          }
        ),
      ];
      poolNode.source = 'mixed';
    }
    
    children.push(poolNode);
  }
  
  // Heating
  if (commonAreaData.heating > 0) {
    const heatingNode = createGroupNode(
      'shared_heating',
      'Heizung',
      'shared',
      commonAreaData.heating,
      'simulated',
      ['Heating', 'HVAC', 'Shared']
    );
    
    if (includeAssumptions && commonAreaData.heating >= 200) {
      // Breakdown heating into heat pump, circulation, control
      heatingNode.children = [
        createDeviceNode(
          'shared_heating_heatpump',
          'Wärmepumpe',
          'shared_heating',
          commonAreaData.heating * 0.8,
          'assumed',
          ['Heating', 'HeatPump'],
          {
            rule: 'HeatingBreakdown',
            weightSet: 'default',
            confidence: 0.75,
            reason: 'Heat pump typically dominates heating consumption',
          }
        ),
        createDeviceNode(
          'shared_heating_circulation',
          'Umwälzpumpen',
          'shared_heating',
          commonAreaData.heating * 0.15,
          'assumed',
          ['Heating', 'Pump'],
          {
            rule: 'HeatingBreakdown',
            weightSet: 'default',
            confidence: 0.75,
            reason: 'Circulation pumps for heating system',
          }
        ),
        createDeviceNode(
          'shared_heating_control',
          'Regelung',
          'shared_heating',
          commonAreaData.heating * 0.05,
          'assumed',
          ['Heating', 'Control'],
          {
            rule: 'HeatingBreakdown',
            weightSet: 'default',
            confidence: 0.75,
            reason: 'Control systems and sensors',
          }
        ),
      ];
      heatingNode.source = 'mixed';
    }
    
    children.push(heatingNode);
  }
  
  // Garage
  if (commonAreaData.garage > 0) {
    const garageNode = createGroupNode(
      'shared_garage',
      'Garage/Technik',
      'shared',
      commonAreaData.garage,
      'simulated',
      ['Garage', 'Shared']
    );
    
    if (includeAssumptions && commonAreaData.garage >= 100) {
      // Breakdown garage
      garageNode.children = [
        createDeviceNode(
          'shared_garage_lighting',
          'Beleuchtung',
          'shared_garage',
          commonAreaData.garage * 0.4,
          'assumed',
          ['Garage', 'Lighting'],
          {
            rule: 'GarageBreakdown',
            weightSet: 'default',
            confidence: 0.6,
            reason: 'Garage lighting and equipment',
          }
        ),
        createDeviceNode(
          'shared_garage_door',
          'Tor',
          'shared_garage',
          commonAreaData.garage * 0.3,
          'assumed',
          ['Garage', 'Door'],
          {
            rule: 'GarageBreakdown',
            weightSet: 'default',
            confidence: 0.6,
            reason: 'Garage door motors',
          }
        ),
        createDeviceNode(
          'shared_garage_other',
          'Sonstiges',
          'shared_garage',
          commonAreaData.garage * 0.3,
          'assumed',
          ['Garage', 'Other'],
          {
            rule: 'GarageBreakdown',
            weightSet: 'default',
            confidence: 0.6,
            reason: 'Workshop, tools, other equipment',
          }
        ),
      ];
      garageNode.source = 'mixed';
    }
    
    children.push(garageNode);
  }
  
  // Boiler
  if (commonAreaData.boiler > 0) {
    const boilerNode = createGroupNode(
      'shared_boiler',
      'Boiler/WW',
      'shared',
      commonAreaData.boiler,
      'simulated',
      ['Boiler', 'HotWater', 'Shared']
    );
    
    if (includeAssumptions && commonAreaData.boiler >= 100) {
      // Breakdown boiler
      boilerNode.children = [
        createDeviceNode(
          'shared_boiler_main',
          'Boiler',
          'shared_boiler',
          commonAreaData.boiler * 0.85,
          'assumed',
          ['Boiler', 'HotWater'],
          {
            rule: 'BoilerBreakdown',
            weightSet: 'default',
            confidence: 0.7,
            reason: 'Main boiler heating element',
          }
        ),
        createDeviceNode(
          'shared_boiler_circulation',
          'Zirkulation',
          'shared_boiler',
          commonAreaData.boiler * 0.10,
          'assumed',
          ['Boiler', 'Circulation'],
          {
            rule: 'BoilerBreakdown',
            weightSet: 'default',
            confidence: 0.7,
            reason: 'Hot water circulation pump',
          }
        ),
        createDeviceNode(
          'shared_boiler_control',
          'Regelung',
          'shared_boiler',
          commonAreaData.boiler * 0.05,
          'assumed',
          ['Boiler', 'Control'],
          {
            rule: 'BoilerBreakdown',
            weightSet: 'default',
            confidence: 0.7,
            reason: 'Temperature control and monitoring',
          }
        ),
      ];
      boilerNode.source = 'mixed';
    }
    
    children.push(boilerNode);
  }
  
  return children;
}

/**
 * Convert tree to flat list (for debugging/validation)
 */
export function flattenTree(node: ConsumerNode): ConsumerNode[] {
  const result: ConsumerNode[] = [node];
  node.children.forEach(child => {
    result.push(...flattenTree(child));
  });
  return result;
}

/**
 * Validate tree integrity (no double counting)
 */
export function validateTree(node: ConsumerNode): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  function validate(n: ConsumerNode): number {
    if (n.children.length === 0) {
      return n.powerW;
    }
    
    const childrenSum = n.children.reduce((sum, child) => sum + validate(child), 0);
    const difference = Math.abs(n.powerW - childrenSum);
    
    // Allow small rounding errors (< 0.1W)
    if (difference > 0.1) {
      errors.push(
        `Node "${n.name}" (${n.id}): powerW=${n.powerW.toFixed(2)}W but children sum to ${childrenSum.toFixed(2)}W (diff: ${difference.toFixed(2)}W)`
      );
    }
    
    return childrenSum;
  }
  
  validate(node);
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

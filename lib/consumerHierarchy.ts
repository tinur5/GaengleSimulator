// lib/consumerHierarchy.ts
// Hierarchical consumer structure with assumption-based fallbacks

export type NodeType = 'root' | 'group' | 'device';
export type DataSource = 'measured' | 'simulated' | 'assumed' | 'mixed';

export interface AssumptionMeta {
  rule: string;
  weightSet: string;
  confidence: number; // 0-1
  reason?: string;
}

export interface ConsumerNode {
  id: string;
  name: string;
  type: NodeType;
  parentId: string | null;
  powerW: number; // Current power in Watts
  energyWh?: number; // Optional accumulated energy
  source: DataSource;
  assumptionMeta?: AssumptionMeta;
  tags: string[]; // e.g. ["EV", "Kitchen", "HVAC", "Shared"]
  children: ConsumerNode[];
}

// Template for apartment breakdown
export interface ApartmentWeights {
  kitchen: number;
  washing: number;
  itStandby: number;
  ev: number;
  lighting: number;
  other: number;
  unknown: number;
}

// Template for shared/common areas
export interface SharedWeights {
  pool: number;
  heating: number;
  garage: number;
  boiler: number;
  ventilation: number;
  lighting: number;
  other: number;
  unknown: number;
}

// Kitchen device breakdown
export interface KitchenWeights {
  oven: number;
  stove: number;
  fridge: number;
  dishwasher: number;
  other: number;
}

// Default weights for apartment (normalized to 1.0 when EV not charging)
export const DEFAULT_APARTMENT_WEIGHTS: ApartmentWeights = {
  kitchen: 0.25,      // 25% - Kitchen appliances
  washing: 0.15,      // 15% - Washing machine, dryer
  itStandby: 0.20,    // 20% - IT, entertainment, standby
  ev: 0.0,            // 0% - EV charging (when not active)
  lighting: 0.15,     // 15% - Lighting
  other: 0.20,        // 20% - Other household
  unknown: 0.05,      // 5% - Unaccounted
};

// Kitchen breakdown weights (sub-level)
export const DEFAULT_KITCHEN_WEIGHTS: KitchenWeights = {
  oven: 0.30,         // 30% of kitchen consumption
  stove: 0.35,        // 35% of kitchen consumption
  fridge: 0.20,       // 20% of kitchen consumption (constant)
  dishwasher: 0.10,   // 10% of kitchen consumption
  other: 0.05,        // 5% of kitchen consumption
};

// Default weights for shared areas
export const DEFAULT_SHARED_WEIGHTS: SharedWeights = {
  pool: 0.30,         // 30% - Pool pump and heating
  heating: 0.35,      // 35% - Heat pump and circulation
  garage: 0.10,       // 10% - Garage, doors, lighting
  boiler: 0.15,       // 15% - Hot water boiler
  ventilation: 0.05,  // 5% - Ventilation systems
  lighting: 0.03,     // 3% - Outdoor lighting
  other: 0.02,        // 2% - Other
  unknown: 0.00,      // 0% - Usually well-defined
};

// Depth limits for assumption generation
export const MAX_ASSUMPTION_DEPTH = 3;
export const MIN_POWER_THRESHOLD_W = 50; // Don't subdivide below 50W

/**
 * Create a root node for the building
 */
export function createRootNode(): ConsumerNode {
  return {
    id: 'building',
    name: 'Gebäude',
    type: 'root',
    parentId: null,
    powerW: 0,
    source: 'mixed',
    tags: ['root'],
    children: [],
  };
}

/**
 * Create a group node (e.g., apartment, common area, room)
 */
export function createGroupNode(
  id: string,
  name: string,
  parentId: string,
  powerW: number,
  source: DataSource,
  tags: string[] = []
): ConsumerNode {
  return {
    id,
    name,
    type: 'group',
    parentId,
    powerW,
    source,
    tags,
    children: [],
  };
}

/**
 * Create a device node (leaf)
 */
export function createDeviceNode(
  id: string,
  name: string,
  parentId: string,
  powerW: number,
  source: DataSource,
  tags: string[] = [],
  assumptionMeta?: AssumptionMeta
): ConsumerNode {
  return {
    id,
    name,
    type: 'device',
    parentId,
    powerW,
    source,
    tags,
    children: [],
    assumptionMeta,
  };
}

/**
 * Apply apartment template to create assumed child nodes
 */
export function applyApartmentTemplate(
  parentNode: ConsumerNode,
  totalPowerW: number,
  weights: ApartmentWeights = DEFAULT_APARTMENT_WEIGHTS,
  evCharging: boolean = false,
  depth: number = 0
): ConsumerNode[] {
  if (depth >= MAX_ASSUMPTION_DEPTH || totalPowerW < MIN_POWER_THRESHOLD_W) {
    return [];
  }

  const children: ConsumerNode[] = [];
  const assumptionMeta: AssumptionMeta = {
    rule: 'ApartmentTemplate',
    weightSet: 'default',
    confidence: 0.7,
    reason: 'No detailed measurement data available',
  };

  // Adjust weights if EV is charging
  let adjustedWeights = { ...weights };
  if (evCharging) {
    // When EV charges, it typically dominates consumption
    const evPower = 11000; // 11kW typical AC charging
    const remainingPower = Math.max(0, totalPowerW - evPower);
    
    // Create EV node
    if (evPower > 0) {
      children.push(createDeviceNode(
        `${parentNode.id}_ev`,
        'EV Laden',
        parentNode.id,
        evPower,
        'assumed',
        ['EV', 'Mobility'],
        assumptionMeta
      ));
    }
    
    // Distribute remaining power among other categories
    totalPowerW = remainingPower;
  }

  // Kitchen
  const kitchenPower = totalPowerW * adjustedWeights.kitchen;
  if (kitchenPower >= MIN_POWER_THRESHOLD_W) {
    const kitchenNode = createGroupNode(
      `${parentNode.id}_kitchen`,
      'Küche',
      parentNode.id,
      kitchenPower,
      'assumed',
      ['Kitchen']
    );
    
    // Add kitchen sub-devices if power is significant
    if (kitchenPower >= 200 && depth < MAX_ASSUMPTION_DEPTH - 1) {
      kitchenNode.children = applyKitchenTemplate(kitchenNode, kitchenPower, depth + 1);
      if (kitchenNode.children.length > 0) {
        kitchenNode.source = 'assumed';
      }
    }
    
    children.push(kitchenNode);
  }

  // Washing
  const washingPower = totalPowerW * adjustedWeights.washing;
  if (washingPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_washing`,
      'Waschen',
      parentNode.id,
      washingPower,
      'assumed',
      ['Washing'],
      assumptionMeta
    ));
  }

  // IT & Standby
  const itPower = totalPowerW * adjustedWeights.itStandby;
  if (itPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_it`,
      'IT/Standby',
      parentNode.id,
      itPower,
      'assumed',
      ['IT', 'Standby'],
      assumptionMeta
    ));
  }

  // Lighting
  const lightingPower = totalPowerW * adjustedWeights.lighting;
  if (lightingPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_lighting`,
      'Beleuchtung',
      parentNode.id,
      lightingPower,
      'assumed',
      ['Lighting'],
      assumptionMeta
    ));
  }

  // Other
  const otherPower = totalPowerW * adjustedWeights.other;
  if (otherPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_other`,
      'Sonstiges',
      parentNode.id,
      otherPower,
      'assumed',
      ['Other'],
      assumptionMeta
    ));
  }

  // Unknown
  const unknownPower = totalPowerW * adjustedWeights.unknown;
  if (unknownPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_unknown`,
      'Unbekannt',
      parentNode.id,
      unknownPower,
      'assumed',
      ['Unknown'],
      assumptionMeta
    ));
  }

  return children;
}

/**
 * Apply kitchen template for detailed breakdown
 */
export function applyKitchenTemplate(
  parentNode: ConsumerNode,
  totalPowerW: number,
  depth: number = 0
): ConsumerNode[] {
  if (depth >= MAX_ASSUMPTION_DEPTH || totalPowerW < MIN_POWER_THRESHOLD_W) {
    return [];
  }

  const children: ConsumerNode[] = [];
  const weights = DEFAULT_KITCHEN_WEIGHTS;
  const assumptionMeta: AssumptionMeta = {
    rule: 'KitchenTemplate',
    weightSet: 'default',
    confidence: 0.6,
    reason: 'Typical kitchen appliance distribution',
  };

  // Oven
  const ovenPower = totalPowerW * weights.oven;
  if (ovenPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_oven`,
      'Backofen',
      parentNode.id,
      ovenPower,
      'assumed',
      ['Kitchen', 'Cooking'],
      assumptionMeta
    ));
  }

  // Stove
  const stovePower = totalPowerW * weights.stove;
  if (stovePower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_stove`,
      'Kochfeld',
      parentNode.id,
      stovePower,
      'assumed',
      ['Kitchen', 'Cooking'],
      assumptionMeta
    ));
  }

  // Fridge
  const fridgePower = totalPowerW * weights.fridge;
  if (fridgePower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_fridge`,
      'Kühlschrank',
      parentNode.id,
      fridgePower,
      'assumed',
      ['Kitchen', 'Cooling'],
      assumptionMeta
    ));
  }

  // Dishwasher
  const dishwasherPower = totalPowerW * weights.dishwasher;
  if (dishwasherPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_dishwasher`,
      'Geschirrspüler',
      parentNode.id,
      dishwasherPower,
      'assumed',
      ['Kitchen'],
      assumptionMeta
    ));
  }

  // Other
  const otherPower = totalPowerW * weights.other;
  if (otherPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_other`,
      'Sonstiges',
      parentNode.id,
      otherPower,
      'assumed',
      ['Kitchen', 'Other'],
      assumptionMeta
    ));
  }

  return children;
}

/**
 * Apply shared/common area template
 */
export function applySharedTemplate(
  parentNode: ConsumerNode,
  totalPowerW: number,
  weights: SharedWeights = DEFAULT_SHARED_WEIGHTS,
  depth: number = 0
): ConsumerNode[] {
  if (depth >= MAX_ASSUMPTION_DEPTH || totalPowerW < MIN_POWER_THRESHOLD_W) {
    return [];
  }

  const children: ConsumerNode[] = [];
  const assumptionMeta: AssumptionMeta = {
    rule: 'SharedTemplate',
    weightSet: 'default',
    confidence: 0.75,
    reason: 'Common area distribution based on building configuration',
  };

  // Pool
  const poolPower = totalPowerW * weights.pool;
  if (poolPower >= MIN_POWER_THRESHOLD_W) {
    const poolNode = createGroupNode(
      `${parentNode.id}_pool`,
      'Pool',
      parentNode.id,
      poolPower,
      'assumed',
      ['Pool', 'Shared']
    );
    
    // Pool sub-devices
    if (poolPower >= 200 && depth < MAX_ASSUMPTION_DEPTH - 1) {
      poolNode.children = [
        createDeviceNode(
          `${poolNode.id}_pump`,
          'Pumpe',
          poolNode.id,
          poolPower * 0.6,
          'assumed',
          ['Pool', 'Pump'],
          assumptionMeta
        ),
        createDeviceNode(
          `${poolNode.id}_heating`,
          'Poolheizung',
          poolNode.id,
          poolPower * 0.35,
          'assumed',
          ['Pool', 'Heating'],
          assumptionMeta
        ),
        createDeviceNode(
          `${poolNode.id}_control`,
          'Steuerung',
          poolNode.id,
          poolPower * 0.05,
          'assumed',
          ['Pool', 'Control'],
          assumptionMeta
        ),
      ];
    }
    
    children.push(poolNode);
  }

  // Heating
  const heatingPower = totalPowerW * weights.heating;
  if (heatingPower >= MIN_POWER_THRESHOLD_W) {
    const heatingNode = createGroupNode(
      `${parentNode.id}_heating`,
      'Heizung',
      parentNode.id,
      heatingPower,
      'assumed',
      ['Heating', 'HVAC', 'Shared']
    );
    
    // Heating sub-devices
    if (heatingPower >= 200 && depth < MAX_ASSUMPTION_DEPTH - 1) {
      heatingNode.children = [
        createDeviceNode(
          `${heatingNode.id}_heatpump`,
          'Wärmepumpe',
          heatingNode.id,
          heatingPower * 0.8,
          'assumed',
          ['Heating', 'HeatPump'],
          assumptionMeta
        ),
        createDeviceNode(
          `${heatingNode.id}_circulation`,
          'Umwälzpumpen',
          heatingNode.id,
          heatingPower * 0.15,
          'assumed',
          ['Heating', 'Pump'],
          assumptionMeta
        ),
        createDeviceNode(
          `${heatingNode.id}_control`,
          'Regelung',
          heatingNode.id,
          heatingPower * 0.05,
          'assumed',
          ['Heating', 'Control'],
          assumptionMeta
        ),
      ];
    }
    
    children.push(heatingNode);
  }

  // Garage
  const garagePower = totalPowerW * weights.garage;
  if (garagePower >= MIN_POWER_THRESHOLD_W) {
    children.push(createGroupNode(
      `${parentNode.id}_garage`,
      'Garage/Technik',
      parentNode.id,
      garagePower,
      'assumed',
      ['Garage', 'Shared']
    ));
  }

  // Boiler
  const boilerPower = totalPowerW * weights.boiler;
  if (boilerPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createGroupNode(
      `${parentNode.id}_boiler`,
      'Boiler/WW',
      parentNode.id,
      boilerPower,
      'assumed',
      ['Boiler', 'HotWater', 'Shared']
    ));
  }

  // Ventilation
  const ventilationPower = totalPowerW * weights.ventilation;
  if (ventilationPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_ventilation`,
      'Lüftung',
      parentNode.id,
      ventilationPower,
      'assumed',
      ['Ventilation', 'HVAC', 'Shared'],
      assumptionMeta
    ));
  }

  // Outdoor Lighting
  const lightingPower = totalPowerW * weights.lighting;
  if (lightingPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_lighting`,
      'Außenbeleuchtung',
      parentNode.id,
      lightingPower,
      'assumed',
      ['Lighting', 'Shared'],
      assumptionMeta
    ));
  }

  // Other
  const otherPower = totalPowerW * weights.other;
  if (otherPower >= MIN_POWER_THRESHOLD_W) {
    children.push(createDeviceNode(
      `${parentNode.id}_other`,
      'Sonstiges',
      parentNode.id,
      otherPower,
      'assumed',
      ['Other', 'Shared'],
      assumptionMeta
    ));
  }

  return children;
}

/**
 * Calculate total power of a node including all children (aggregation)
 */
export function aggregatePower(node: ConsumerNode): number {
  if (node.children.length === 0) {
    return node.powerW;
  }
  
  // Sum up children (prevent double counting)
  return node.children.reduce((sum, child) => sum + aggregatePower(child), 0);
}

/**
 * Update node power from children (bottom-up aggregation)
 */
export function updateNodePowerFromChildren(node: ConsumerNode): void {
  if (node.children.length === 0) {
    return; // Leaf node, use its own power
  }
  
  // First update all children recursively
  node.children.forEach(child => updateNodePowerFromChildren(child));
  
  // Then aggregate from children
  node.powerW = node.children.reduce((sum, child) => sum + child.powerW, 0);
  
  // Update source to 'mixed' if children have different sources
  const sources = new Set(node.children.map(c => c.source));
  if (sources.size > 1) {
    node.source = 'mixed';
  }
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(root: ConsumerNode, id: string): ConsumerNode | null {
  if (root.id === id) {
    return root;
  }
  
  for (const child of root.children) {
    const found = findNodeById(child, id);
    if (found) {
      return found;
    }
  }
  
  return null;
}

/**
 * Get breadcrumb path from root to node
 */
export function getBreadcrumbPath(root: ConsumerNode, targetId: string): ConsumerNode[] {
  const path: ConsumerNode[] = [];
  
  function findPath(node: ConsumerNode): boolean {
    path.push(node);
    
    if (node.id === targetId) {
      return true;
    }
    
    for (const child of node.children) {
      if (findPath(child)) {
        return true;
      }
    }
    
    path.pop();
    return false;
  }
  
  findPath(root);
  return path;
}

/**
 * Filter tree to show only non-assumed nodes
 */
export function filterAssumedNodes(node: ConsumerNode, showAssumptions: boolean): ConsumerNode {
  if (showAssumptions) {
    return node; // Return as is
  }
  
  // Create a copy of the node
  const filtered: ConsumerNode = { ...node, children: [] };
  
  // If this node is assumed and has no measured children, skip its children
  if (node.source === 'assumed') {
    // Collapse assumed nodes - keep the parent but remove assumed children
    filtered.children = [];
    return filtered;
  }
  
  // Recursively filter children
  filtered.children = node.children
    .map(child => filterAssumedNodes(child, showAssumptions))
    .filter(child => child.source !== 'assumed' || showAssumptions);
  
  return filtered;
}

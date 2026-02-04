// lib/sankeyDataBuilder.ts
// Build Sankey diagram data from hierarchical consumer tree with drill-down support

import { ConsumerNode } from './consumerHierarchy';

export interface SankeyNode {
  id: string;
  name: string;
  powerW?: number;
  source?: string;
  tags?: string[];
}

export interface SankeyLink {
  source: number; // Index in nodes array
  target: number; // Index in nodes array
  value: number;  // Power in W (will be scaled for display)
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// Constants
const MAX_BATTERY_DISCHARGE_W = 10000; // Maximum battery discharge rate in watts

export interface EnergyFlowData {
  pvProductionW: number;
  battery1SocPercent: number;
  battery2SocPercent: number;
  battery1Direction: 'charging' | 'discharging' | 'idle';
  battery2Direction: 'charging' | 'discharging' | 'idle';
  netFlowW: number;
}

/**
 * Build Sankey data for a specific focus node (drill-down)
 * @param consumerTree The full consumer hierarchy
 * @param focusNodeId The ID of the node to focus on (null = root view)
 * @param energyFlow Energy flow data (PV, battery, grid)
 * @param showAssumptions Whether to include assumed nodes
 */
export function buildSankeyData(
  consumerTree: ConsumerNode,
  focusNodeId: string | null,
  energyFlow: EnergyFlowData,
  showAssumptions: boolean = true
): SankeyData {
  // Find the focus node
  const focusNode = focusNodeId ? findNode(consumerTree, focusNodeId) : consumerTree;
  
  if (!focusNode) {
    // Fallback to root if focus node not found
    return buildRootLevelSankey(consumerTree, energyFlow, showAssumptions);
  }
  
  // If focus is root (building), show top-level view
  if (focusNode.id === 'building') {
    return buildRootLevelSankey(consumerTree, energyFlow, showAssumptions);
  }
  
  // Otherwise, show drill-down view for this node (including apartments and shared)
  return buildDrillDownSankey(focusNode, energyFlow, showAssumptions);
}

/**
 * Build top-level Sankey: PV/Battery/Grid -> Apartments + Shared
 */
function buildRootLevelSankey(
  consumerTree: ConsumerNode,
  energyFlow: EnergyFlowData,
  showAssumptions: boolean
): SankeyData {
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  
  // Energy sources
  const pvIndex = nodes.length;
  nodes.push({ id: 'pv', name: `PV ${(energyFlow.pvProductionW / 1000).toFixed(1)}kW`, source: 'production' });
  
  const bat1Index = nodes.length;
  nodes.push({ 
    id: 'bat1', 
    name: `Bat1 ${energyFlow.battery1SocPercent.toFixed(0)}%`, 
    source: 'storage',
    tags: [energyFlow.battery1Direction]
  });
  
  const bat2Index = nodes.length;
  nodes.push({ 
    id: 'bat2', 
    name: `Bat2 ${energyFlow.battery2SocPercent.toFixed(0)}%`, 
    source: 'storage',
    tags: [energyFlow.battery2Direction]
  });
  
  const gridIndex = nodes.length;
  nodes.push({ id: 'grid', name: 'Netz', source: 'grid' });
  
  // Consumer groups
  const apartmentsNode = consumerTree.children.find(c => c.id === 'apartments');
  const sharedNode = consumerTree.children.find(c => c.id === 'shared');
  
  const apartmentsIndex = nodes.length;
  if (apartmentsNode) {
    const hasChildren = apartmentsNode.children && apartmentsNode.children.length > 0;
    nodes.push({ 
      id: 'apartments', 
      name: `Wohnungen ${(apartmentsNode.powerW / 1000).toFixed(1)}kW`,
      powerW: apartmentsNode.powerW,
      source: apartmentsNode.source,
      tags: hasChildren ? ['has-children'] : []
    });
  }
  
  const sharedIndex = nodes.length;
  if (sharedNode) {
    const hasChildren = sharedNode.children && sharedNode.children.length > 0;
    nodes.push({ 
      id: 'shared', 
      name: `Allgemein ${(sharedNode.powerW / 1000).toFixed(1)}kW`,
      powerW: sharedNode.powerW,
      source: sharedNode.source,
      tags: hasChildren ? ['has-children'] : []
    });
  }
  
  // Calculate flows
  const totalConsumptionW = (apartmentsNode?.powerW || 0) + (sharedNode?.powerW || 0);
  const pvAvailableW = energyFlow.pvProductionW;
  const deficitW = Math.max(0, totalConsumptionW - pvAvailableW);
  const surplusW = Math.max(0, pvAvailableW - totalConsumptionW);
  
  // PV flows
  if (pvAvailableW > 0) {
    const pvToConsumption = Math.min(pvAvailableW, totalConsumptionW);
    
    // Distribute PV to consumers proportionally
    if (apartmentsNode && apartmentsNode.powerW > 0) {
      const apartmentShare = (apartmentsNode.powerW / totalConsumptionW) * pvToConsumption;
      if (apartmentShare > 0.05) {
        links.push({ source: pvIndex, target: apartmentsIndex, value: apartmentShare });
      }
    }
    
    if (sharedNode && sharedNode.powerW > 0) {
      const sharedShare = (sharedNode.powerW / totalConsumptionW) * pvToConsumption;
      if (sharedShare > 0.05) {
        links.push({ source: pvIndex, target: sharedIndex, value: sharedShare });
      }
    }
    
    // PV surplus to batteries or grid
    if (surplusW > 0) {
      // Charging batteries - distribute based on which are charging
      const chargingBat1 = energyFlow.battery1Direction === 'charging';
      const chargingBat2 = energyFlow.battery2Direction === 'charging';
      const numChargingBatteries = (chargingBat1 ? 1 : 0) + (chargingBat2 ? 1 : 0);
      
      if (numChargingBatteries > 0) {
        const surplusPerBattery = surplusW / numChargingBatteries;
        if (chargingBat1) {
          links.push({ source: pvIndex, target: bat1Index, value: surplusPerBattery });
        }
        if (chargingBat2) {
          links.push({ source: pvIndex, target: bat2Index, value: surplusPerBattery });
        }
      }
      
      // Export to grid (if batteries full or not charging)
      if (!chargingBat1 && !chargingBat2) {
        links.push({ source: pvIndex, target: gridIndex, value: surplusW });
      }
    }
  }
  
  // Deficit: from batteries or grid
  // Battery 1 (inverterId: 1) supplies ONLY shared (Allgemeinteil)
  // Battery 2 (inverterId: 2) supplies ONLY apartments (Wohnungen)
  if (deficitW > 0) {
    let sharedDeficit = sharedNode?.powerW || 0;
    let apartmentsDeficit = apartmentsNode?.powerW || 0;
    
    // Subtract PV contribution that was already allocated
    const pvToConsumption = Math.min(pvAvailableW, totalConsumptionW);
    if (totalConsumptionW > 0) {
      if (sharedNode && sharedNode.powerW > 0) {
        const sharedPvShare = (sharedNode.powerW / totalConsumptionW) * pvToConsumption;
        sharedDeficit = Math.max(0, sharedDeficit - sharedPvShare);
      }
      if (apartmentsNode && apartmentsNode.powerW > 0) {
        const apartmentsPvShare = (apartmentsNode.powerW / totalConsumptionW) * pvToConsumption;
        apartmentsDeficit = Math.max(0, apartmentsDeficit - apartmentsPvShare);
      }
    }
    
    // Battery 1 supplies ONLY shared area
    if (energyFlow.battery1Direction === 'discharging' && sharedDeficit > 0) {
      const fromBat1 = Math.min(sharedDeficit, MAX_BATTERY_DISCHARGE_W);
      if (fromBat1 > 0.05 && sharedNode) {
        links.push({ source: bat1Index, target: sharedIndex, value: fromBat1 });
        sharedDeficit -= fromBat1;
      }
    }
    
    // Battery 2 supplies ONLY apartments
    if (energyFlow.battery2Direction === 'discharging' && apartmentsDeficit > 0) {
      const fromBat2 = Math.min(apartmentsDeficit, MAX_BATTERY_DISCHARGE_W);
      if (fromBat2 > 0.05 && apartmentsNode) {
        links.push({ source: bat2Index, target: apartmentsIndex, value: fromBat2 });
        apartmentsDeficit -= fromBat2;
      }
    }
    
    // Remaining deficit from grid
    if (sharedDeficit > 0.05 && sharedNode) {
      links.push({ source: gridIndex, target: sharedIndex, value: sharedDeficit });
    }
    if (apartmentsDeficit > 0.05 && apartmentsNode) {
      links.push({ source: gridIndex, target: apartmentsIndex, value: apartmentsDeficit });
    }
  }
  
  return { nodes, links };
}

/**
 * Build drill-down Sankey: Show children of focus node with proper energy sources
 */
function buildDrillDownSankey(
  focusNode: ConsumerNode,
  energyFlow: EnergyFlowData,
  showAssumptions: boolean
): SankeyData {
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];
  
  // Filter children based on showAssumptions
  const children = showAssumptions 
    ? focusNode.children 
    : focusNode.children.filter(c => c.source !== 'assumed');
  
  if (children.length === 0) {
    // No children to show, fall back to showing the node itself
    nodes.push({
      id: focusNode.id,
      name: `${focusNode.name} ${(focusNode.powerW / 1000).toFixed(1)}kW`,
      powerW: focusNode.powerW,
      source: focusNode.source
    });
    return { nodes, links };
  }
  
  // Add energy sources (same as root level for consistency)
  const pvIndex = nodes.length;
  nodes.push({ id: 'pv', name: `PV ${(energyFlow.pvProductionW / 1000).toFixed(1)}kW`, source: 'production' });
  
  const bat1Index = nodes.length;
  nodes.push({ 
    id: 'bat1', 
    name: `Bat1 ${energyFlow.battery1SocPercent.toFixed(0)}%`, 
    source: 'storage',
    tags: [energyFlow.battery1Direction]
  });
  
  const bat2Index = nodes.length;
  nodes.push({ 
    id: 'bat2', 
    name: `Bat2 ${energyFlow.battery2SocPercent.toFixed(0)}%`, 
    source: 'storage',
    tags: [energyFlow.battery2Direction]
  });
  
  const gridIndex = nodes.length;
  nodes.push({ id: 'grid', name: 'Netz', source: 'grid' });
  
  // Add child nodes
  const childStartIndex = nodes.length;
  const validChildren = children.filter(child => !(!showAssumptions && child.source === 'assumed'));
  
  validChildren.forEach(child => {
    const powerKw = (child.powerW / 1000).toFixed(1);
    const badge = child.source === 'assumed' ? ' 📊' : 
                  child.source === 'simulated' ? ' ⚙️' : '';
    const hasChildren = child.children && child.children.length > 0;
    
    nodes.push({
      id: child.id,
      name: `${child.name} ${powerKw}kW${badge}`,
      powerW: child.powerW,
      source: child.source,
      tags: hasChildren ? ['has-children', ...(child.tags || [])] : child.tags
    });
  });
  
  // Calculate energy flows to children (same logic as root)
  const totalConsumptionW = validChildren.reduce((sum, child) => sum + child.powerW, 0);
  
  if (totalConsumptionW === 0) {
    return { nodes, links };
  }
  
  const pvAvailableW = energyFlow.pvProductionW;
  const deficitW = Math.max(0, totalConsumptionW - pvAvailableW);
  const surplusW = Math.max(0, pvAvailableW - totalConsumptionW);
  
  // PV flows to children
  if (pvAvailableW > 0) {
    const pvToConsumption = Math.min(pvAvailableW, totalConsumptionW);
    
    // Distribute PV to children proportionally
    validChildren.forEach((child, i) => {
      if (child.powerW > 0) {
        const childShare = (child.powerW / totalConsumptionW) * pvToConsumption;
        if (childShare > 0.05) {
          links.push({ 
            source: pvIndex, 
            target: childStartIndex + i, 
            value: childShare 
          });
        }
      }
    });
    
    // PV surplus to batteries or grid (only show if surplus exists)
    if (surplusW > 0) {
      const chargingBat1 = energyFlow.battery1Direction === 'charging';
      const chargingBat2 = energyFlow.battery2Direction === 'charging';
      const numChargingBatteries = (chargingBat1 ? 1 : 0) + (chargingBat2 ? 1 : 0);
      
      if (numChargingBatteries > 0) {
        const surplusPerBattery = surplusW / numChargingBatteries;
        if (chargingBat1) {
          links.push({ source: pvIndex, target: bat1Index, value: surplusPerBattery });
        }
        if (chargingBat2) {
          links.push({ source: pvIndex, target: bat2Index, value: surplusPerBattery });
        }
      }
      
      // Export to grid if batteries not charging
      if (!chargingBat1 && !chargingBat2) {
        links.push({ source: pvIndex, target: gridIndex, value: surplusW });
      }
    }
  }
  
  // Deficit: from batteries or grid
  // Determine which battery should supply based on the focus node
  // Battery 1 (inverterId: 1) supplies ONLY shared (Allgemeinteil)
  // Battery 2 (inverterId: 2) supplies ONLY apartments (Wohnungen)
  if (deficitW > 0) {
    // Determine if this is a shared or apartments branch
    const isSharedBranch = focusNode.id === 'shared' || focusNode.id.startsWith('shared_');
    const isApartmentsBranch = focusNode.id === 'apartments' || focusNode.id.startsWith('apartment_');
    
    // Calculate total deficit after PV
    const pvToConsumption = Math.min(pvAvailableW, totalConsumptionW);
    let remainingDeficit = deficitW;
    
    // Battery 1 supplies ONLY if this is shared branch
    if (isSharedBranch && energyFlow.battery1Direction === 'discharging') {
      const fromBat1 = Math.min(remainingDeficit, MAX_BATTERY_DISCHARGE_W);
      if (fromBat1 > 0.05) {
        validChildren.forEach((child, i) => {
          if (child.powerW > 0) {
            const share = (child.powerW / totalConsumptionW) * fromBat1;
            links.push({ source: bat1Index, target: childStartIndex + i, value: share });
          }
        });
        remainingDeficit -= fromBat1;
      }
    }
    
    // Battery 2 supplies ONLY if this is apartments branch
    if (isApartmentsBranch && energyFlow.battery2Direction === 'discharging') {
      const fromBat2 = Math.min(remainingDeficit, MAX_BATTERY_DISCHARGE_W);
      if (fromBat2 > 0.05) {
        validChildren.forEach((child, i) => {
          if (child.powerW > 0) {
            const share = (child.powerW / totalConsumptionW) * fromBat2;
            links.push({ source: bat2Index, target: childStartIndex + i, value: share });
          }
        });
        remainingDeficit -= fromBat2;
      }
    }
    
    // Remaining deficit from grid
    if (remainingDeficit > 0.05) {
      validChildren.forEach((child, i) => {
        if (child.powerW > 0) {
          const share = (child.powerW / totalConsumptionW) * remainingDeficit;
          links.push({ source: gridIndex, target: childStartIndex + i, value: share });
        }
      });
    }
  }
  
  return { nodes, links };
}

/**
 * Find node by ID
 */
function findNode(root: ConsumerNode, id: string): ConsumerNode | null {
  if (root.id === id) {
    return root;
  }
  
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) {
      return found;
    }
  }
  
  return null;
}

/**
 * Get breadcrumb path for navigation
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

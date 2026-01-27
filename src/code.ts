/**
 * Cape Partner Expansion - Main Plugin Code
 *
 * This code runs in the Figma plugin sandbox and handles:
 * - Creating local variable collections for overrides
 * - Creating local variables that shadow library variables
 * - Rebinding components to use local override variables
 */

import {
  TOKEN_OVERRIDES,
  OVERRIDE_COLLECTION_NAME,
  TARGET_MODE_NAME,
  type TokenOverride
} from './overrides/token-overrides';

// Message types for UI ↔ Plugin communication
interface ApplyOverridesMessage {
  type: 'apply-overrides';
  scope: 'selection' | 'page' | 'document';
}

interface CancelMessage {
  type: 'cancel';
}

type PluginMessage = ApplyOverridesMessage | CancelMessage;

interface OverrideResult {
  variableName: string;
  status: 'created' | 'updated' | 'error';
  message?: string;
}

interface RebindResult {
  nodeName: string;
  property: string;
  fromVariable: string;
  toVariable: string;
}

interface ApplyResultMessage {
  type: 'apply-result';
  success: boolean;
  results: OverrideResult[];
  rebindResults: RebindResult[];
  collectionId?: string;
  error?: string;
  debugInfo?: string[];
}

// Map to store created local variables by name
const localVariableMap = new Map<string, Variable>();

// Show the UI
figma.showUI(__html__, {
  width: 420,
  height: 600,
  title: 'Cape Partner Expansion',
});

/**
 * Find an existing variable collection by name
 */
function findCollection(name: string): VariableCollection | null {
  const collections = figma.variables.getLocalVariableCollections();
  return collections.find(c => c.name === name) || null;
}

/**
 * Find a variable in a collection by name
 */
function findVariableInCollection(
  collection: VariableCollection,
  variableName: string
): Variable | null {
  const variables = figma.variables.getLocalVariables('COLOR');
  return variables.find(v =>
    v.variableCollectionId === collection.id && v.name === variableName
  ) || null;
}

/**
 * Get or create the Light mode in a collection
 */
function getOrCreateLightMode(collection: VariableCollection): string {
  const existingMode = collection.modes.find(m => m.name === TARGET_MODE_NAME);
  if (existingMode) {
    return existingMode.modeId;
  }

  if (collection.modes.length === 1) {
    collection.renameMode(collection.modes[0].modeId, TARGET_MODE_NAME);
    return collection.modes[0].modeId;
  }

  const newModeId = collection.addMode(TARGET_MODE_NAME);
  return newModeId;
}

/**
 * Check if a variable name matches one of our override targets
 */
function getOverrideForVariable(variableName: string): TokenOverride | null {
  // Normalize: remove leading slashes, convert to lowercase
  const normalized = variableName.replace(/^\/+/, '').toLowerCase();

  for (const override of TOKEN_OVERRIDES) {
    const overrideNormalized = override.variableName.toLowerCase();

    // Direct match
    if (normalized === overrideNormalized) {
      return override;
    }

    // Match at end (in case there's a collection prefix)
    if (normalized.endsWith('/' + overrideNormalized)) {
      return override;
    }

    // Match if the variable name ends with our target (without leading slash)
    if (normalized.endsWith(overrideNormalized)) {
      return override;
    }
  }
  return null;
}

/**
 * Get nodes to process based on scope
 */
function getNodesByScope(scope: 'selection' | 'page' | 'document'): SceneNode[] {
  switch (scope) {
    case 'selection':
      return [...figma.currentPage.selection];
    case 'page':
      return [...figma.currentPage.children];
    case 'document':
      const allNodes: SceneNode[] = [];
      for (const page of figma.root.children) {
        allNodes.push(...page.children);
      }
      return allNodes;
  }
}

/**
 * Recursively collect all nodes from a tree
 */
function collectAllNodes(nodes: readonly SceneNode[]): SceneNode[] {
  const result: SceneNode[] = [];

  function traverse(node: SceneNode) {
    result.push(node);
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child);
      }
    }
  }

  for (const node of nodes) {
    traverse(node);
  }

  return result;
}

/**
 * Rebind a node's variable references to use local overrides
 */
function rebindNodeVariables(node: SceneNode, rebindResults: RebindResult[], debugInfo: string[]): void {
  // Check if node supports bound variables
  if (!('boundVariables' in node)) {
    return;
  }

  const boundVars = node.boundVariables;
  if (!boundVars) {
    return;
  }

  // Process fills
  if ('fills' in node && boundVars.fills && Array.isArray(boundVars.fills)) {
    for (let i = 0; i < boundVars.fills.length; i++) {
      const binding = boundVars.fills[i];
      if (binding && binding.id) {
        processBinding(node, 'fills', i, binding, rebindResults, debugInfo);
      }
    }
  }

  // Process strokes
  if ('strokes' in node && boundVars.strokes && Array.isArray(boundVars.strokes)) {
    for (let i = 0; i < boundVars.strokes.length; i++) {
      const binding = boundVars.strokes[i];
      if (binding && binding.id) {
        processBinding(node, 'strokes', i, binding, rebindResults, debugInfo);
      }
    }
  }

  // Also check for single bindings (some properties use object instead of array)
  if (boundVars.fills && !Array.isArray(boundVars.fills) && (boundVars.fills as any).id) {
    processBinding(node, 'fills', 0, boundVars.fills as VariableAlias, rebindResults, debugInfo);
  }

  if (boundVars.strokes && !Array.isArray(boundVars.strokes) && (boundVars.strokes as any).id) {
    processBinding(node, 'strokes', 0, boundVars.strokes as VariableAlias, rebindResults, debugInfo);
  }
}

/**
 * Process a single variable binding
 */
function processBinding(
  node: SceneNode,
  property: 'fills' | 'strokes',
  index: number,
  binding: VariableAlias,
  rebindResults: RebindResult[],
  debugInfo: string[]
): void {
  try {
    // Get the original variable
    const originalVar = figma.variables.getVariableById(binding.id);
    if (!originalVar) {
      debugInfo.push(`Could not find variable with ID: ${binding.id}`);
      return;
    }

    debugInfo.push(`Found binding on ${node.name}.${property}[${index}]: "${originalVar.name}"`);

    // Check if this variable should be overridden
    const override = getOverrideForVariable(originalVar.name);
    if (!override) {
      debugInfo.push(`  -> No override match for "${originalVar.name}"`);
      return;
    }

    debugInfo.push(`  -> Matched override: "${override.variableName}"`);

    // Get the local override variable
    const localVar = localVariableMap.get(override.variableName);
    if (!localVar) {
      debugInfo.push(`  -> ERROR: Local variable not found for "${override.variableName}"`);
      return;
    }

    // Rebind using setBoundVariableForPaint (required for fills/strokes)
    try {
      // Check if node has the property and it's an array
      if (!(property in node)) {
        debugInfo.push(`  -> ERROR: Node doesn't have ${property} property`);
        return;
      }

      const paintsArray = (node as any)[property] as readonly Paint[];
      if (!paintsArray || !Array.isArray(paintsArray) || index >= paintsArray.length) {
        debugInfo.push(`  -> ERROR: Invalid paint index ${index}`);
        return;
      }

      // Clone the paint and rebind the variable
      const paint = paintsArray[index];
      if (paint.type !== 'SOLID') {
        debugInfo.push(`  -> Skipping non-solid paint type: ${paint.type}`);
        return;
      }

      // Create a new paint with the variable binding
      const newPaint = figma.variables.setBoundVariableForPaint(paint, 'color', localVar);

      // Clone the paints array and update the specific paint
      const newPaints = [...paintsArray];
      newPaints[index] = newPaint;

      // Set the updated paints back on the node
      (node as any)[property] = newPaints;

      rebindResults.push({
        nodeName: node.name,
        property: `${property}[${index}]`,
        fromVariable: originalVar.name,
        toVariable: localVar.name,
      });

      debugInfo.push(`  -> SUCCESS: Rebound to local variable`);
    } catch (rebindError) {
      debugInfo.push(`  -> Rebind error: ${rebindError}`);
    }
  } catch (error) {
    debugInfo.push(`Error processing ${property} on ${node.name}: ${error}`);
  }
}

/**
 * Apply all token overrides and rebind variables
 */
function applyTokenOverrides(scope: 'selection' | 'page' | 'document'): ApplyResultMessage {
  const results: OverrideResult[] = [];
  const rebindResults: RebindResult[] = [];
  const debugInfo: string[] = [];

  // Clear the local variable map
  localVariableMap.clear();

  try {
    // Step 1: Create/update local override variables
    let collection = findCollection(OVERRIDE_COLLECTION_NAME);

    if (!collection) {
      collection = figma.variables.createVariableCollection(OVERRIDE_COLLECTION_NAME);
      debugInfo.push(`Created new collection: ${OVERRIDE_COLLECTION_NAME}`);
    } else {
      debugInfo.push(`Using existing collection: ${OVERRIDE_COLLECTION_NAME}`);
    }

    const lightModeId = getOrCreateLightMode(collection);
    debugInfo.push(`Using Light mode ID: ${lightModeId}`);

    // Create/update each override variable
    for (const override of TOKEN_OVERRIDES) {
      try {
        let variable = findVariableInCollection(collection, override.variableName);
        let status: 'created' | 'updated';

        if (variable) {
          status = 'updated';
        } else {
          variable = figma.variables.createVariable(
            override.variableName,
            collection.id,
            'COLOR'
          );
          status = 'created';
        }

        variable.setValueForMode(lightModeId, override.rgbaColor);
        localVariableMap.set(override.variableName, variable);

        results.push({
          variableName: override.variableName,
          status,
          message: `${override.hexColor}`,
        });
      } catch (error) {
        results.push({
          variableName: override.variableName,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    debugInfo.push(`Created ${localVariableMap.size} local override variables`);

    // Step 2: Rebind variables on nodes
    const rootNodes = getNodesByScope(scope);
    const allNodes = collectAllNodes(rootNodes);

    debugInfo.push(`Processing ${allNodes.length} nodes in scope: ${scope}`);

    for (const node of allNodes) {
      rebindNodeVariables(node, rebindResults, debugInfo);
    }

    debugInfo.push(`Total rebinds: ${rebindResults.length}`);

    const errorCount = results.filter(r => r.status === 'error').length;

    return {
      type: 'apply-result',
      success: errorCount === 0,
      results,
      rebindResults,
      collectionId: collection.id,
      debugInfo,
    };

  } catch (error) {
    console.error('Failed to apply overrides:', error);
    return {
      type: 'apply-result',
      success: false,
      results,
      rebindResults,
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo,
    };
  }
}

// Handle messages from the UI
figma.ui.onmessage = (msg: PluginMessage) => {
  switch (msg.type) {
    case 'apply-overrides':
      const result = applyTokenOverrides(msg.scope || 'selection');
      // Log debug info to console
      if (result.debugInfo) {
        console.log('=== Cape Overrides Debug ===');
        result.debugInfo.forEach(info => console.log(info));
        console.log('============================');
      }
      figma.ui.postMessage(result);
      break;

    case 'cancel':
      figma.closePlugin();
      break;
  }
};

// Send initial data to UI
figma.ui.postMessage({
  type: 'init',
  overrides: TOKEN_OVERRIDES.map(o => ({
    variableName: o.variableName,
    description: o.description,
    hexColor: o.hexColor,
  })),
  hasSelection: figma.currentPage.selection.length > 0,
});

// Listen for selection changes and update UI
figma.on('selectionchange', () => {
  figma.ui.postMessage({
    type: 'selection-changed',
    hasSelection: figma.currentPage.selection.length > 0,
  });
});

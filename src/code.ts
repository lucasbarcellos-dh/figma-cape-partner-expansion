/**
 * Cape Partner Expansion - Main Plugin Code
 *
 * This code runs in the Figma plugin sandbox and handles:
 * - Finding the "Cape Overrides" collection from the "Partner Expansion" library
 * - Importing override variables from the library
 * - Rebinding components to use the library override variables
 */

import {
  TOKEN_OVERRIDES,
  type TokenOverride
} from './overrides/token-overrides';

// Library and collection names to look for
const LIBRARY_NAME = '[Cape] Partner Expansion';
const COLLECTION_NAME = 'Cape Overrides';
const B2B_LIBRARY_NAME = '[Cape] B2B variables';

// Message types for UI ↔ Plugin communication
interface ApplyOverridesMessage {
  type: 'apply-overrides';
  scope: 'selection' | 'page' | 'document';
}

interface CancelMessage {
  type: 'cancel';
}

interface RemapTokensMessage {
  type: 'remap-tokens';
  scope: 'selection' | 'page' | 'document';
}

type PluginMessage = ApplyOverridesMessage | CancelMessage | RemapTokensMessage;

interface OverrideResult {
  variableName: string;
  status: 'imported' | 'not_found' | 'error';
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

interface RemapResultMessage {
  type: 'remap-result';
  success: boolean;
  scannedCount: number;
  remappedCount: number;
  notFoundCount: number;
  errorCount: number;
  details: RemapDetail[];
  error?: string;
  debugInfo?: string[];
}

interface RemapDetail {
  nodeName: string;
  nodeId: string;
  property: string;
  variableName: string;
  status: 'remapped' | 'not_found' | 'unresolved' | 'error';
  message?: string;
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
 * Find the "Cape Overrides" collection from the "Partner Expansion" library
 */
async function findLibraryCollection(): Promise<{
  collection: LibraryVariableCollection;
  variables: LibraryVariable[];
  debugCollections: string[];
} | null> {
  const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

  // Log all available collections for debugging
  const debugCollections = collections.map(c => `"${c.name}" in "${c.libraryName}"`);
  console.log('Available library collections:', debugCollections);

  const targetCollection = collections.find(
    c => c.name === COLLECTION_NAME && c.libraryName === LIBRARY_NAME
  );

  if (!targetCollection) {
    return null;
  }

  const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(targetCollection.key);
  return { collection: targetCollection, variables, debugCollections };
}

/**
 * Find a local "Cape Overrides" collection (for when running in the library file itself)
 */
async function findLocalCollection(): Promise<{
  collection: VariableCollection;
  variables: Variable[];
  debugCollections: string[];
} | null> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  // Log all local collections for debugging
  const debugCollections = collections.map(c => `"${c.name}"`);
  console.log('Available local collections:', debugCollections);

  const targetCollection = collections.find(c => c.name === COLLECTION_NAME);

  if (!targetCollection) {
    return null;
  }

  const allVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  const variables = allVariables.filter(v => v.variableCollectionId === targetCollection.id);

  return { collection: targetCollection, variables, debugCollections };
}

/**
 * Match a library variable by name (case-insensitive)
 */
function matchLibraryVariable(
  libraryVars: LibraryVariable[],
  targetName: string
): LibraryVariable | null {
  const normalized = targetName.toLowerCase();
  return libraryVars.find(v => v.name.toLowerCase() === normalized) || null;
}

/**
 * Match a local variable by name (case-insensitive)
 */
function matchLocalVariable(
  localVars: Variable[],
  targetName: string
): Variable | null {
  const normalized = targetName.toLowerCase();
  return localVars.find(v => v.name.toLowerCase() === normalized) || null;
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
async function rebindNodeVariables(node: SceneNode, rebindResults: RebindResult[], debugInfo: string[]): Promise<void> {
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
        await processBinding(node, 'fills', i, binding, rebindResults, debugInfo);
      }
    }
  }

  // Process strokes
  if ('strokes' in node && boundVars.strokes && Array.isArray(boundVars.strokes)) {
    for (let i = 0; i < boundVars.strokes.length; i++) {
      const binding = boundVars.strokes[i];
      if (binding && binding.id) {
        await processBinding(node, 'strokes', i, binding, rebindResults, debugInfo);
      }
    }
  }

  // Also check for single bindings (some properties use object instead of array)
  if (boundVars.fills && !Array.isArray(boundVars.fills) && (boundVars.fills as any).id) {
    await processBinding(node, 'fills', 0, boundVars.fills as VariableAlias, rebindResults, debugInfo);
  }

  if (boundVars.strokes && !Array.isArray(boundVars.strokes) && (boundVars.strokes as any).id) {
    await processBinding(node, 'strokes', 0, boundVars.strokes as VariableAlias, rebindResults, debugInfo);
  }
}

/**
 * Process a single variable binding
 */
async function processBinding(
  node: SceneNode,
  property: 'fills' | 'strokes',
  index: number,
  binding: VariableAlias,
  rebindResults: RebindResult[],
  debugInfo: string[]
): Promise<void> {
  try {
    // Get the original variable
    const originalVar = await figma.variables.getVariableByIdAsync(binding.id);
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
 * Apply all token overrides by importing from library and rebinding variables
 */
async function applyTokenOverrides(scope: 'selection' | 'page' | 'document'): Promise<ApplyResultMessage> {
  const results: OverrideResult[] = [];
  const rebindResults: RebindResult[] = [];
  const debugInfo: string[] = [];

  // Clear the local variable map
  localVariableMap.clear();

  try {
    // Step 1: Try to find the library collection first
    debugInfo.push(`Looking for "${COLLECTION_NAME}" collection in "${LIBRARY_NAME}" library...`);
    const libraryData = await findLibraryCollection();

    if (libraryData && libraryData.debugCollections) {
      debugInfo.push(`Available library collections: ${libraryData.debugCollections.join(', ') || '(none)'}`);
    } else {
      // Log what library collections are available even if we didn't find ours
      const allLibCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
      debugInfo.push(`Available library collections: ${allLibCollections.map(c => `"${c.name}" in "${c.libraryName}"`).join(', ') || '(none)'}`);
    }

    // Step 2: If not found, try local collection (for when running in the library file itself)
    const localData = !libraryData ? await findLocalCollection() : null;

    if (localData && localData.debugCollections) {
      debugInfo.push(`Available local collections: ${localData.debugCollections.join(', ') || '(none)'}`);
    } else if (!libraryData) {
      // Log what local collections are available
      const allLocalCollections = await figma.variables.getLocalVariableCollectionsAsync();
      debugInfo.push(`Available local collections: ${allLocalCollections.map(c => `"${c.name}"`).join(', ') || '(none)'}`);
    }

    if (!libraryData && !localData) {
      return {
        type: 'apply-result',
        success: false,
        results: [],
        rebindResults: [],
        error: `Could not find "${COLLECTION_NAME}" collection. Make sure you're either in the library file or have the "${LIBRARY_NAME}" library enabled.`,
        debugInfo,
      };
    }

    const isUsingLibrary = !!libraryData;
    const sourceLabel = isUsingLibrary ? 'library' : 'local collection';

    if (libraryData) {
      debugInfo.push(`Found library collection with ${libraryData.variables.length} variables`);
    } else if (localData) {
      debugInfo.push(`Found local collection with ${localData.variables.length} variables (running in library file)`);
    }

    // Step 3: Get variables from library or local collection
    for (const override of TOKEN_OVERRIDES) {
      try {
        if (isUsingLibrary && libraryData) {
          // Import from library
          const libraryVar = matchLibraryVariable(libraryData.variables, override.variableName);

          if (!libraryVar) {
            debugInfo.push(`Variable not found in ${sourceLabel}: ${override.variableName}`);
            results.push({
              variableName: override.variableName,
              status: 'not_found',
              message: `Not found in ${sourceLabel}`,
            });
            continue;
          }

          const importedVar = await figma.variables.importVariableByKeyAsync(libraryVar.key);
          localVariableMap.set(override.variableName, importedVar);

          results.push({
            variableName: override.variableName,
            status: 'imported',
            message: `Imported from library`,
          });

          debugInfo.push(`Imported: ${override.variableName}`);
        } else if (localData) {
          // Use local variable directly
          const localVar = matchLocalVariable(localData.variables, override.variableName);

          if (!localVar) {
            debugInfo.push(`Variable not found in ${sourceLabel}: ${override.variableName}`);
            results.push({
              variableName: override.variableName,
              status: 'not_found',
              message: `Not found in ${sourceLabel}`,
            });
            continue;
          }

          localVariableMap.set(override.variableName, localVar);

          results.push({
            variableName: override.variableName,
            status: 'imported',
            message: `Found in local collection`,
          });

          debugInfo.push(`Found local: ${override.variableName}`);
        }
      } catch (error) {
        results.push({
          variableName: override.variableName,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        debugInfo.push(`Error getting ${override.variableName}: ${error}`);
      }
    }

    debugInfo.push(`Loaded ${localVariableMap.size} variables from ${sourceLabel}`);

    // Step 3: Rebind variables on nodes
    const rootNodes = getNodesByScope(scope);
    const allNodes = collectAllNodes(rootNodes);

    debugInfo.push(`Processing ${allNodes.length} nodes in scope: ${scope}`);

    for (const node of allNodes) {
      await rebindNodeVariables(node, rebindResults, debugInfo);
    }

    debugInfo.push(`Total rebinds: ${rebindResults.length}`);

    const errorCount = results.filter(r => r.status === 'error').length;
    const notFoundCount = results.filter(r => r.status === 'not_found').length;

    return {
      type: 'apply-result',
      success: errorCount === 0,
      results,
      rebindResults,
      debugInfo,
      error: notFoundCount > 0 ? `${notFoundCount} variable(s) not found in library` : undefined,
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

// ============================================================
// B2B Variable Remapping Functions
// ============================================================

/**
 * Build a cache of B2B library variables mapped by name
 */
async function buildB2BLibraryCache(): Promise<{
  variablesByName: Map<string, LibraryVariable>;
  collectionKeys: Set<string>;
  debugInfo: string[];
} | null> {
  const debugInfo: string[] = [];

  const collections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

  // Find all collections from the B2B library
  const b2bCollections = collections.filter(c => c.libraryName === B2B_LIBRARY_NAME);

  if (b2bCollections.length === 0) {
    debugInfo.push(`B2B library "${B2B_LIBRARY_NAME}" not found or not enabled`);
    debugInfo.push(`Available libraries: ${[...new Set(collections.map(c => c.libraryName))].join(', ') || '(none)'}`);
    return null;
  }

  debugInfo.push(`Found ${b2bCollections.length} collection(s) in B2B library`);

  const variablesByName = new Map<string, LibraryVariable>();
  const collectionKeys = new Set<string>();

  for (const collection of b2bCollections) {
    collectionKeys.add(collection.key);
    const variables = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
    debugInfo.push(`  Collection "${collection.name}": ${variables.length} variables`);

    for (const variable of variables) {
      // Store by full name (includes path like "colors/primary/500")
      variablesByName.set(variable.name.toLowerCase(), variable);
    }
  }

  debugInfo.push(`Total B2B variables cached: ${variablesByName.size}`);

  return { variablesByName, collectionKeys, debugInfo };
}

/**
 * Check if a variable binding needs to be remapped to the B2B library.
 * This detects variables that:
 * - Are completely orphaned (variable no longer exists)
 * - Are local copies (no longer linked to any library)
 * - Are from a different library (not B2B)
 */
async function isVariableUnlinkedFromB2B(
  binding: VariableAlias,
  b2bCollectionKeys: Set<string>,
  debugInfo: string[]
): Promise<{
  unlinked: boolean;
  variableName: string | null;
  reason: 'orphaned' | 'local' | 'wrong_library' | null;
}> {
  const variable = await figma.variables.getVariableByIdAsync(binding.id);

  if (!variable) {
    // Completely orphaned - can't determine name
    debugInfo.push(`    Variable ID ${binding.id}: orphaned (not found)`);
    return { unlinked: true, variableName: null, reason: 'orphaned' };
  }

  debugInfo.push(`    Variable "${variable.name}": remote=${variable.remote}, key=${variable.key}`);

  // If variable is local (not remote), it's an orphaned library variable
  if (!variable.remote) {
    debugInfo.push(`    -> Local variable (not from any library), needs remapping`);
    return { unlinked: true, variableName: variable.name, reason: 'local' };
  }

  // Variable is remote - check if it's from the B2B library by checking collection
  const collection = await figma.variables.getVariableCollectionByIdAsync(variable.variableCollectionId);

  if (!collection) {
    debugInfo.push(`    -> Collection not found, treating as orphaned`);
    return { unlinked: true, variableName: variable.name, reason: 'orphaned' };
  }

  debugInfo.push(`    Collection "${collection.name}": remote=${collection.remote}, key=${collection.key}`);

  // Check if the collection is local (not from library)
  if (!collection.remote) {
    debugInfo.push(`    -> Collection is local, needs remapping`);
    return { unlinked: true, variableName: variable.name, reason: 'local' };
  }

  // Check if the collection is from B2B library
  // The collection key format varies, so we check if any B2B key matches
  const isFromB2B = b2bCollectionKeys.has(collection.key);

  if (!isFromB2B) {
    debugInfo.push(`    -> From different library (key: ${collection.key}), needs remapping to B2B`);
    debugInfo.push(`    -> B2B collection keys: ${[...b2bCollectionKeys].join(', ')}`);
    return { unlinked: true, variableName: variable.name, reason: 'wrong_library' };
  }

  debugInfo.push(`    -> Already linked to B2B library, skipping`);
  return { unlinked: false, variableName: null, reason: null };
}

/**
 * Process a single node for unlinked B2B variables and remap them
 */
async function processNodeForRemapping(
  node: SceneNode,
  b2bCache: Map<string, LibraryVariable>,
  b2bCollectionKeys: Set<string>,
  details: RemapDetail[],
  debugInfo: string[]
): Promise<{ scanned: number; remapped: number; notFound: number; errors: number }> {
  const stats = { scanned: 0, remapped: 0, notFound: 0, errors: 0 };

  if (!('boundVariables' in node)) {
    return stats;
  }

  const boundVars = node.boundVariables;
  if (!boundVars) {
    return stats;
  }

  // Process fills
  if ('fills' in node && boundVars.fills && Array.isArray(boundVars.fills)) {
    for (let i = 0; i < boundVars.fills.length; i++) {
      const binding = boundVars.fills[i];
      if (binding && binding.id) {
        const result = await processBindingForRemapping(
          node, 'fills', i, binding, b2bCache, b2bCollectionKeys, details, debugInfo
        );
        stats.scanned += result.scanned;
        stats.remapped += result.remapped;
        stats.notFound += result.notFound;
        stats.errors += result.errors;
      }
    }
  }

  // Process strokes
  if ('strokes' in node && boundVars.strokes && Array.isArray(boundVars.strokes)) {
    for (let i = 0; i < boundVars.strokes.length; i++) {
      const binding = boundVars.strokes[i];
      if (binding && binding.id) {
        const result = await processBindingForRemapping(
          node, 'strokes', i, binding, b2bCache, b2bCollectionKeys, details, debugInfo
        );
        stats.scanned += result.scanned;
        stats.remapped += result.remapped;
        stats.notFound += result.notFound;
        stats.errors += result.errors;
      }
    }
  }

  // Handle single bindings (some properties use object instead of array)
  if (boundVars.fills && !Array.isArray(boundVars.fills) && (boundVars.fills as VariableAlias).id) {
    const result = await processBindingForRemapping(
      node, 'fills', 0, boundVars.fills as VariableAlias, b2bCache, b2bCollectionKeys, details, debugInfo
    );
    stats.scanned += result.scanned;
    stats.remapped += result.remapped;
    stats.notFound += result.notFound;
    stats.errors += result.errors;
  }

  if (boundVars.strokes && !Array.isArray(boundVars.strokes) && (boundVars.strokes as VariableAlias).id) {
    const result = await processBindingForRemapping(
      node, 'strokes', 0, boundVars.strokes as VariableAlias, b2bCache, b2bCollectionKeys, details, debugInfo
    );
    stats.scanned += result.scanned;
    stats.remapped += result.remapped;
    stats.notFound += result.notFound;
    stats.errors += result.errors;
  }

  return stats;
}

/**
 * Process a single binding for remapping
 */
async function processBindingForRemapping(
  node: SceneNode,
  property: 'fills' | 'strokes',
  index: number,
  binding: VariableAlias,
  b2bCache: Map<string, LibraryVariable>,
  b2bCollectionKeys: Set<string>,
  details: RemapDetail[],
  debugInfo: string[]
): Promise<{ scanned: number; remapped: number; notFound: number; errors: number }> {
  const stats = { scanned: 1, remapped: 0, notFound: 0, errors: 0 };

  try {
    debugInfo.push(`  Checking ${node.name}.${property}[${index}]...`);
    const { unlinked, variableName, reason } = await isVariableUnlinkedFromB2B(binding, b2bCollectionKeys, debugInfo);

    if (!unlinked) {
      // Variable is properly linked to B2B, nothing to do
      return { scanned: 1, remapped: 0, notFound: 0, errors: 0 };
    }

    if (!variableName) {
      // Completely orphaned - can't resolve name
      details.push({
        nodeName: node.name,
        nodeId: node.id,
        property: `${property}[${index}]`,
        variableName: '(unknown)',
        status: 'unresolved',
        message: 'Variable is completely orphaned - cannot determine original name',
      });
      stats.errors++;
      debugInfo.push(`  ${node.name}.${property}[${index}]: Orphaned variable (cannot resolve name)`);
      return stats;
    }

    debugInfo.push(`  ${node.name}.${property}[${index}]: Unlinked "${variableName}" (${reason})`);

    // Try to find matching variable in B2B library
    const normalizedName = variableName.toLowerCase();
    const libraryVar = b2bCache.get(normalizedName);

    if (!libraryVar) {
      details.push({
        nodeName: node.name,
        nodeId: node.id,
        property: `${property}[${index}]`,
        variableName,
        status: 'not_found',
        message: `Variable "${variableName}" not found in B2B library`,
      });
      stats.notFound++;
      debugInfo.push(`    -> Not found in B2B library`);
      return stats;
    }

    // Import the library variable
    const importedVar = await figma.variables.importVariableByKeyAsync(libraryVar.key);

    // Rebind the variable
    if (!(property in node)) {
      stats.errors++;
      return stats;
    }

    const paintsArray = (node as any)[property] as readonly Paint[];
    if (!paintsArray || !Array.isArray(paintsArray) || index >= paintsArray.length) {
      stats.errors++;
      return stats;
    }

    const paint = paintsArray[index];
    if (paint.type !== 'SOLID') {
      debugInfo.push(`    -> Skipping non-solid paint type: ${paint.type}`);
      return { scanned: 1, remapped: 0, notFound: 0, errors: 0 };
    }

    // Create new paint with the variable binding
    const newPaint = figma.variables.setBoundVariableForPaint(paint, 'color', importedVar);

    // Update the paints array
    const newPaints = [...paintsArray];
    newPaints[index] = newPaint;
    (node as any)[property] = newPaints;

    details.push({
      nodeName: node.name,
      nodeId: node.id,
      property: `${property}[${index}]`,
      variableName,
      status: 'remapped',
      message: `Remapped to B2B library variable`,
    });
    stats.remapped++;
    debugInfo.push(`    -> Remapped successfully`);

  } catch (error) {
    details.push({
      nodeName: node.name,
      nodeId: node.id,
      property: `${property}[${index}]`,
      variableName: '(error)',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    stats.errors++;
    debugInfo.push(`    -> Error: ${error}`);
  }

  return stats;
}

/**
 * Main function to remap unlinked B2B tokens
 */
async function remapUnlinkedTokens(scope: 'selection' | 'page' | 'document'): Promise<RemapResultMessage> {
  const details: RemapDetail[] = [];
  const debugInfo: string[] = [];

  let totalScanned = 0;
  let totalRemapped = 0;
  let totalNotFound = 0;
  let totalErrors = 0;

  try {
    debugInfo.push(`Starting B2B token remapping for scope: ${scope}`);

    // Build B2B library cache
    const cacheResult = await buildB2BLibraryCache();

    if (!cacheResult) {
      return {
        type: 'remap-result',
        success: false,
        scannedCount: 0,
        remappedCount: 0,
        notFoundCount: 0,
        errorCount: 0,
        details: [],
        error: `Could not find "${B2B_LIBRARY_NAME}" library. Make sure it is enabled in your file's library settings.`,
        debugInfo,
      };
    }

    debugInfo.push(...cacheResult.debugInfo);

    const { variablesByName, collectionKeys } = cacheResult;

    // Get nodes to process
    const rootNodes = getNodesByScope(scope);
    const allNodes = collectAllNodes(rootNodes);

    debugInfo.push(`Processing ${allNodes.length} nodes...`);

    // Process each node
    for (const node of allNodes) {
      const stats = await processNodeForRemapping(
        node, variablesByName, collectionKeys, details, debugInfo
      );
      totalScanned += stats.scanned;
      totalRemapped += stats.remapped;
      totalNotFound += stats.notFound;
      totalErrors += stats.errors;
    }

    debugInfo.push(`Scan complete: ${totalScanned} bindings scanned, ${totalRemapped} remapped, ${totalNotFound} not found, ${totalErrors} errors`);

    return {
      type: 'remap-result',
      success: totalErrors === 0,
      scannedCount: totalScanned,
      remappedCount: totalRemapped,
      notFoundCount: totalNotFound,
      errorCount: totalErrors,
      details,
      debugInfo,
    };

  } catch (error) {
    console.error('Failed to remap tokens:', error);
    return {
      type: 'remap-result',
      success: false,
      scannedCount: totalScanned,
      remappedCount: totalRemapped,
      notFoundCount: totalNotFound,
      errorCount: totalErrors + 1,
      details,
      error: error instanceof Error ? error.message : 'Unknown error',
      debugInfo,
    };
  }
}

// Handle messages from the UI
figma.ui.onmessage = async (msg: PluginMessage) => {
  switch (msg.type) {
    case 'apply-overrides':
      const result = await applyTokenOverrides(msg.scope || 'selection');
      // Log debug info to console
      if (result.debugInfo) {
        console.log('=== Cape Overrides Debug ===');
        result.debugInfo.forEach(info => console.log(info));
        console.log('============================');
      }
      figma.ui.postMessage(result);
      break;

    case 'remap-tokens':
      const remapResult = await remapUnlinkedTokens(msg.scope || 'selection');
      // Log debug info to console
      if (remapResult.debugInfo) {
        console.log('=== B2B Token Remap Debug ===');
        remapResult.debugInfo.forEach(info => console.log(info));
        console.log('==============================');
      }
      figma.ui.postMessage(remapResult);
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

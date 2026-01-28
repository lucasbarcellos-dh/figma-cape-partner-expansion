/**
 * Cape Partner Expansion - Plugin UI
 *
 * React-based UI for the Figma plugin
 */

import * as React from 'react';
import { createRoot } from 'react-dom/client';

// Types for messages
interface TokenOverrideInfo {
  variableName: string;
  description: string;
  hexColor: string;
}

interface InitMessage {
  type: 'init';
  overrides: TokenOverrideInfo[];
  hasSelection: boolean;
}

interface SelectionChangedMessage {
  type: 'selection-changed';
  hasSelection: boolean;
}

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

interface RemapDetail {
  nodeName: string;
  nodeId: string;
  property: string;
  variableName: string;
  status: 'remapped' | 'not_found' | 'unresolved' | 'error';
  message?: string;
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

type PluginMessage = InitMessage | ApplyResultMessage | SelectionChangedMessage | RemapResultMessage;

type Tab = 'apply' | 'remap';

type Scope = 'selection' | 'page' | 'document';

// Styles
const styles = {
  container: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: '12px',
    flexShrink: 0,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '11px',
    color: '#666',
  },
  scopeSection: {
    flexShrink: 0,
  },
  tabSection: {
    flexShrink: 0,
  },
  tabButtons: {
    display: 'flex',
    gap: '0px',
    borderBottom: '1px solid #e5e5e5',
  },
  tabButton: {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    backgroundColor: 'transparent',
    color: '#666',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    transition: 'all 0.2s',
  },
  tabButtonActive: {
    color: '#18A0FB',
    borderBottomColor: '#18A0FB',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#333',
  },
  scopeButtons: {
    display: 'flex',
    gap: '8px',
  },
  scopeButton: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ddd',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    backgroundColor: '#fff',
    transition: 'all 0.2s',
  },
  scopeButtonActive: {
    backgroundColor: '#18A0FB',
    borderColor: '#18A0FB',
    color: 'white',
  },
  section: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  },
  overrideList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  overrideItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '11px',
  },
  colorSwatch: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    flexShrink: 0,
  },
  overrideInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  variableName: {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#333',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  overrideDescription: {
    fontSize: '10px',
    color: '#666',
    marginTop: '2px',
  },
  footer: {
    borderTop: '1px solid #e5e5e5',
    paddingTop: '12px',
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  button: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  primaryButton: {
    backgroundColor: '#18A0FB',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    color: '#333',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  resultSection: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #18A0FB',
  },
  errorSection: {
    backgroundColor: '#fff0f0',
    border: '1px solid #ff4444',
  },
  resultTitle: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  resultItem: {
    fontSize: '10px',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusBadge: {
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '9px',
    fontWeight: 500,
  },
  importedBadge: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  notFoundBadge: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  errorBadge: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  reboundBadge: {
    backgroundColor: '#cce5ff',
    color: '#004085',
  },
  rebindSection: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#e8f5e9',
    borderRadius: '6px',
    border: '1px solid #4caf50',
  },
  rebindItem: {
    fontSize: '10px',
    padding: '4px 0',
    borderBottom: '1px solid #c8e6c9',
  },
  rebindNodeName: {
    fontWeight: 500,
  },
  rebindDetail: {
    color: '#666',
    marginLeft: '8px',
  },
  remapDescription: {
    fontSize: '12px',
    color: '#666',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  statBox: {
    padding: '12px 8px',
    borderRadius: '6px',
    textAlign: 'center' as const,
    backgroundColor: '#f5f5f5',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '10px',
    color: '#666',
    textTransform: 'uppercase' as const,
  },
  remappedStat: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  notFoundStat: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  errorStat: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  detailsList: {
    maxHeight: '200px',
    overflow: 'auto',
  },
  detailItem: {
    fontSize: '10px',
    padding: '6px 8px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    marginBottom: '4px',
  },
};

function App() {
  const [overrides, setOverrides] = React.useState<TokenOverrideInfo[]>([]);
  const [hasSelection, setHasSelection] = React.useState(false);
  const [scope, setScope] = React.useState<Scope>('selection');
  const [activeTab, setActiveTab] = React.useState<Tab>('apply');
  const [isApplying, setIsApplying] = React.useState(false);
  const [result, setResult] = React.useState<ApplyResultMessage | null>(null);
  const [isRemapping, setIsRemapping] = React.useState(false);
  const [remapResult, setRemapResult] = React.useState<RemapResultMessage | null>(null);

  React.useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as PluginMessage;

      if (msg.type === 'init') {
        setOverrides(msg.overrides);
        setHasSelection(msg.hasSelection);
        if (!msg.hasSelection) {
          setScope('page');
        }
      } else if (msg.type === 'apply-result') {
        setIsApplying(false);
        setResult(msg);
      } else if (msg.type === 'remap-result') {
        setIsRemapping(false);
        setRemapResult(msg);
      } else if (msg.type === 'selection-changed') {
        setHasSelection(msg.hasSelection);
        // If selection becomes available and we're on page/document, switch to selection
        if (msg.hasSelection && scope !== 'selection') {
          setScope('selection');
        }
        // If selection is cleared while we're on selection scope, switch to page
        if (!msg.hasSelection && scope === 'selection') {
          setScope('page');
        }
      }
    };
  }, [scope]);

  const handleApply = () => {
    setIsApplying(true);
    setResult(null);
    parent.postMessage({ pluginMessage: { type: 'apply-overrides', scope } }, '*');
  };

  const handleCancel = () => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
  };

  const handleRemap = () => {
    setIsRemapping(true);
    setRemapResult(null);
    parent.postMessage({ pluginMessage: { type: 'remap-tokens', scope } }, '*');
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // Clear results when switching tabs
    if (tab === 'apply') {
      setRemapResult(null);
    } else {
      setResult(null);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Cape Partner Expansion</div>
        <div style={styles.subtitle}>
          Apply token overrides and rebind variables
        </div>
      </div>

      <div style={styles.scopeSection}>
        <div style={styles.sectionTitle}>Apply to:</div>
        <div style={styles.scopeButtons}>
          <button
            style={{
              ...styles.scopeButton,
              ...(scope === 'selection' ? styles.scopeButtonActive : {}),
            }}
            onClick={() => setScope('selection')}
            disabled={!hasSelection}
            title={!hasSelection ? 'No selection' : 'Apply to selected layers'}
          >
            Selection
          </button>
          <button
            style={{
              ...styles.scopeButton,
              ...(scope === 'page' ? styles.scopeButtonActive : {}),
            }}
            onClick={() => setScope('page')}
          >
            Current page
          </button>
          <button
            style={{
              ...styles.scopeButton,
              ...(scope === 'document' ? styles.scopeButtonActive : {}),
            }}
            onClick={() => setScope('document')}
          >
            Entire file
          </button>
        </div>
      </div>

      <div style={styles.tabSection}>
        <div style={styles.tabButtons}>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'apply' ? styles.tabButtonActive : {}),
            }}
            onClick={() => handleTabChange('apply')}
          >
            Apply Overrides
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(activeTab === 'remap' ? styles.tabButtonActive : {}),
            }}
            onClick={() => handleTabChange('remap')}
          >
            Remap Tokens
          </button>
        </div>
      </div>

      {activeTab === 'apply' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Token overrides ({overrides.length})</div>
          <div style={styles.overrideList}>
            {overrides.map((override) => (
              <div key={override.variableName} style={styles.overrideItem}>
                <div
                  style={{
                    ...styles.colorSwatch,
                    backgroundColor: override.hexColor,
                  }}
                />
                <div style={styles.overrideInfo}>
                  <div style={styles.variableName}>{override.variableName}</div>
                  <div style={styles.overrideDescription}>
                    {override.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {result && (
            <>
              <div
                style={{
                  ...styles.resultSection,
                  ...(result.success ? {} : styles.errorSection),
                }}
              >
                <div style={styles.resultTitle}>
                  Variables {result.success ? 'imported from library' : '(some errors)'}
                </div>
                {result.results.map((r) => (
                  <div key={r.variableName} style={styles.resultItem}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        ...(r.status === 'imported'
                          ? styles.importedBadge
                          : r.status === 'not_found'
                          ? styles.notFoundBadge
                          : styles.errorBadge),
                      }}
                    >
                      {r.status === 'not_found' ? 'not found' : r.status}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                      {r.variableName}
                    </span>
                  </div>
                ))}
                {result.error && (
                  <div style={{ color: '#721c24', marginTop: '8px' }}>
                    Error: {result.error}
                  </div>
                )}
              </div>

              {result.rebindResults && result.rebindResults.length > 0 && (
                <div style={styles.rebindSection}>
                  <div style={styles.resultTitle}>
                    Rebound {result.rebindResults.length} variable references
                  </div>
                  {result.rebindResults.slice(0, 10).map((r, i) => (
                    <div key={i} style={styles.rebindItem}>
                      <span style={styles.rebindNodeName}>{r.nodeName}</span>
                      <span style={styles.rebindDetail}>
                        {r.property}: {r.fromVariable} → {r.toVariable}
                      </span>
                    </div>
                  ))}
                  {result.rebindResults.length > 10 && (
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                      ...and {result.rebindResults.length - 10} more
                    </div>
                  )}
                </div>
              )}

              {result.rebindResults && result.rebindResults.length === 0 && (
                <div style={{ ...styles.resultSection, backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
                  <div style={styles.resultTitle}>No variables rebound</div>
                  <div style={{ fontSize: '10px', color: '#856404' }}>
                    No matching variable bindings found in the {scope}.
                    Check the debug log below for details.
                  </div>
                </div>
              )}

              {result.debugInfo && result.debugInfo.length > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px', border: '1px solid #ddd' }}>
                  <div style={styles.resultTitle}>Debug log</div>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', maxHeight: '150px', overflow: 'auto', whiteSpace: 'pre-wrap', color: '#666' }}>
                    {result.debugInfo.join('\n')}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'remap' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Remap B2B Variable Tokens</div>
          <div style={styles.remapDescription}>
            Scan for variables unlinked from "[Cape] B2B variables" and rebind them by matching names.
          </div>

          {remapResult && (
            <>
              <div style={styles.statsGrid}>
                <div style={styles.statBox}>
                  <div style={styles.statValue}>{remapResult.scannedCount}</div>
                  <div style={styles.statLabel}>Scanned</div>
                </div>
                <div style={{ ...styles.statBox, ...(remapResult.remappedCount > 0 ? styles.remappedStat : {}) }}>
                  <div style={styles.statValue}>{remapResult.remappedCount}</div>
                  <div style={styles.statLabel}>Remapped</div>
                </div>
                <div style={{ ...styles.statBox, ...(remapResult.notFoundCount > 0 ? styles.notFoundStat : {}) }}>
                  <div style={styles.statValue}>{remapResult.notFoundCount}</div>
                  <div style={styles.statLabel}>Not Found</div>
                </div>
                <div style={{ ...styles.statBox, ...(remapResult.errorCount > 0 ? styles.errorStat : {}) }}>
                  <div style={styles.statValue}>{remapResult.errorCount}</div>
                  <div style={styles.statLabel}>Errors</div>
                </div>
              </div>

              {remapResult.error && (
                <div style={{ ...styles.resultSection, ...styles.errorSection, marginBottom: '12px' }}>
                  <div style={styles.resultTitle}>Error</div>
                  <div style={{ fontSize: '11px', color: '#721c24' }}>
                    {remapResult.error}
                  </div>
                </div>
              )}

              {remapResult.details.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={styles.sectionTitle}>Details ({remapResult.details.length})</div>
                  <div style={styles.detailsList}>
                    {remapResult.details.slice(0, 20).map((detail, i) => (
                      <div key={i} style={styles.detailItem}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              ...styles.statusBadge,
                              ...(detail.status === 'remapped'
                                ? styles.importedBadge
                                : detail.status === 'not_found'
                                ? styles.notFoundBadge
                                : styles.errorBadge),
                            }}
                          >
                            {detail.status}
                          </span>
                          <span style={{ fontWeight: 500 }}>{detail.nodeName}</span>
                        </div>
                        <div style={{ color: '#666', marginLeft: '4px' }}>
                          {detail.property}: {detail.variableName}
                          {detail.message && <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>({detail.message})</span>}
                        </div>
                      </div>
                    ))}
                    {remapResult.details.length > 20 && (
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '8px', textAlign: 'center' }}>
                        ...and {remapResult.details.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {remapResult.debugInfo && remapResult.debugInfo.length > 0 && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px', border: '1px solid #ddd' }}>
                  <div style={styles.resultTitle}>Debug log</div>
                  <div style={{ fontSize: '9px', fontFamily: 'monospace', maxHeight: '150px', overflow: 'auto', whiteSpace: 'pre-wrap', color: '#666' }}>
                    {remapResult.debugInfo.join('\n')}
                  </div>
                </div>
              )}
            </>
          )}

          {!remapResult && (
            <div style={{ ...styles.resultSection, backgroundColor: '#f5f5f5', borderColor: '#ddd' }}>
              <div style={{ fontSize: '11px', color: '#666' }}>
                Click "Remap tokens" to scan for unlinked B2B variables and rebind them.
              </div>
            </div>
          )}
        </div>
      )}

      <div style={styles.footer}>
        <button
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={handleCancel}
        >
          Close
        </button>
        {activeTab === 'apply' && (
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(isApplying ? styles.disabledButton : {}),
            }}
            onClick={handleApply}
            disabled={isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply overrides'}
          </button>
        )}
        {activeTab === 'remap' && (
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(isRemapping ? styles.disabledButton : {}),
            }}
            onClick={handleRemap}
            disabled={isRemapping}
          >
            {isRemapping ? 'Remapping...' : 'Remap tokens'}
          </button>
        )}
      </div>
    </div>
  );
}

// Mount the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

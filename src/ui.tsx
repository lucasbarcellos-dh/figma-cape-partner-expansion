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

type PluginMessage = InitMessage | ApplyResultMessage | SelectionChangedMessage;

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
};

function App() {
  const [overrides, setOverrides] = React.useState<TokenOverrideInfo[]>([]);
  const [hasSelection, setHasSelection] = React.useState(false);
  const [scope, setScope] = React.useState<Scope>('selection');
  const [isApplying, setIsApplying] = React.useState(false);
  const [result, setResult] = React.useState<ApplyResultMessage | null>(null);

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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Cape Partner Expansion</div>
        <div style={styles.subtitle}>
          Apply Cape component token overrides and rebind variables
        </div>
      </div>

      <div style={styles.scopeSection}>
        <div style={styles.sectionTitle}>Apply to:</div>
        <div style={styles.scopeButtons}>
          <button
            style={{
              ...styles.scopeButton,
              ...(scope === 'selection' ? styles.scopeButtonActive : {}),
              ...((!hasSelection && scope !== 'selection') ? {} : {}),
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
            Current Page
          </button>
          <button
            style={{
              ...styles.scopeButton,
              ...(scope === 'document' ? styles.scopeButtonActive : {}),
            }}
            onClick={() => setScope('document')}
          >
            Entire File
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Token Overrides ({overrides.length})</div>
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
                Variables {result.success ? 'Imported from Library' : '(Some Errors)'}
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
                  Rebound {result.rebindResults.length} Variable References
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
                <div style={styles.resultTitle}>No Variables Rebound</div>
                <div style={{ fontSize: '10px', color: '#856404' }}>
                  No matching variable bindings found in the {scope}.
                  Check the debug log below for details.
                </div>
              </div>
            )}

            {result.debugInfo && result.debugInfo.length > 0 && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px', border: '1px solid #ddd' }}>
                <div style={styles.resultTitle}>Debug Log</div>
                <div style={{ fontSize: '9px', fontFamily: 'monospace', maxHeight: '150px', overflow: 'auto', whiteSpace: 'pre-wrap', color: '#666' }}>
                  {result.debugInfo.join('\n')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={styles.footer}>
        <button
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={handleCancel}
        >
          Close
        </button>
        <button
          style={{
            ...styles.button,
            ...styles.primaryButton,
            ...(isApplying ? styles.disabledButton : {}),
          }}
          onClick={handleApply}
          disabled={isApplying}
        >
          {isApplying ? 'Applying...' : 'Apply Overrides'}
        </button>
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

/**
 * Token override definitions for Cape Extension Overrides
 *
 * These mappings correspond to the CSS overrides in:
 * packages/layout/src/daemons/CapeVendorExpansion/cape-vendor-expansion.scss
 */

export interface TokenOverride {
  /** The Figma variable name (slash-separated) */
  variableName: string;
  /** Description of what this override does */
  description: string;
  /** The override color in hex format */
  hexColor: string;
  /** The override color as RGBA (0-1 range for Figma) */
  rgbaColor: RGBA;
  /** Optional category for grouping in the UI */
  category?: string;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Convert hex color to RGBA (0-1 range)
 */
export function hexToRgba(hex: string): RGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
    a: 1,
  };
}

// Jacaranda Grey color palette
export const JACARANDA_GREY = {
  '00': '#FFFFFF',
  '01': '#F4F5F6',
  '05': '#E9EAEC',
  '10': '#CECED4',
  '20': '#b9bac1',
  '30': '#93949D',
  '40': '#7F8088',
  '50': '#6C6D73',
  '60': '#56565C',
  '70': '#434347',
  '80': '#343437',
  '90': '#28282A',
  '95': '#1E1E20',
  '99': '#141415',
  '100': '#000000',
} as const;

// Override value for grey-01 (CSS changes it from #F4F5F6 to #f1f2f4)
export const GREY_01_OVERRIDE = '#f1f2f4';

// Cape Success color palette (for switch overrides)
export const CAPE_SUCCESS = {
  '60': '#048A42',
  '70': '#047538',
} as const;

/**
 * All color-related token overrides from cape-vendor-expansion.scss
 *
 * Organized by category:
 * - Global token group overrides (action, form, control)
 * - Component-specific overrides (chip, search, switch, border, alert)
 */
export const TOKEN_OVERRIDES: TokenOverride[] = [
  // ===================================
  // GLOBAL TOKEN GROUP OVERRIDES
  // ===================================

  // Action color overrides
  {
    variableName: 'action/color/secondary/enabled',
    description: 'Secondary action enabled state → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
    category: 'Action',
  },
  {
    variableName: 'action/color/secondary/hover',
    description: 'Secondary action hover state → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
    category: 'Action',
  },

  // Form color overrides
  {
    variableName: 'form/color/branded/primary/enabled',
    description: 'Form branded primary enabled → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
    category: 'Form',
  },
  {
    variableName: 'form/color/branded/primary/hover',
    description: 'Form branded primary hover → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
    category: 'Form',
  },

  // Control color overrides
  {
    variableName: 'control/color/branded/primary/enabled',
    description: 'Control branded primary enabled → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
    category: 'Control',
  },
  {
    variableName: 'control/color/branded/primary/hover',
    description: 'Control branded primary hover → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
    category: 'Control',
  },

  // ===================================
  // COMPONENT-SPECIFIC OVERRIDES
  // ===================================

  // Chip component overrides
  // CSS: --cp-chip-color-branded-primary-enabled: var(--cp-color-jacaranda-grey-05);
  {
    variableName: 'chip/color/branded/primary/enabled',
    description: 'Chip branded primary enabled → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
    category: 'Chip',
  },
  // CSS: --cp-chip-color-branded-primary-hover: var(--cp-color-jacaranda-grey-10);
  {
    variableName: 'chip/color/branded/primary/hover',
    description: 'Chip branded primary hover → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
    category: 'Chip',
  },

  // Search component overrides
  // CSS: --cp-search-color-branded-primary-enabled: var(--cp-color-jacaranda-grey-05);
  {
    variableName: 'search/color/branded/primary/enabled',
    description: 'Search branded primary enabled → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
    category: 'Search',
  },
  // CSS: --cp-search-color-branded-primary-hover: var(--cp-color-jacaranda-grey-10);
  {
    variableName: 'search/color/branded/primary/hover',
    description: 'Search branded primary hover → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
    category: 'Search',
  },

  // Switch component overrides
  // CSS: --cp-switch-color-active-enabled: var(--cp-action-color-success-primary-enabled);
  {
    variableName: 'switch/color/active/enabled',
    description: 'Switch active enabled → success green',
    hexColor: CAPE_SUCCESS['70'],
    rgbaColor: hexToRgba(CAPE_SUCCESS['70']),
    category: 'Switch',
  },
  // CSS: --cp-switch-color-active-hover: var(--cp-action-color-success-primary-hover);
  {
    variableName: 'switch/color/active/hover',
    description: 'Switch active hover → success green',
    hexColor: CAPE_SUCCESS['60'],
    rgbaColor: hexToRgba(CAPE_SUCCESS['60']),
    category: 'Switch',
  },

  // Alert component overrides (neutral variant)
  // CSS: --cp-alert-background-color: var(--cp-color-jacaranda-grey-01) (for neutral variant)
  // In Figma, neutral alerts use feedback/color/disabled/low
  {
    variableName: 'feedback/color/disabled/low',
    description: 'Alert neutral background → grey-01',
    hexColor: GREY_01_OVERRIDE,
    rgbaColor: hexToRgba(GREY_01_OVERRIDE),
    category: 'Alert',
  },

  // Border color overrides
  // CSS: --cp-border-color-high: var(--cp-color-jacaranda-grey-01);
  {
    variableName: 'border/color/high',
    description: 'Border high emphasis → grey-01 (overridden)',
    hexColor: GREY_01_OVERRIDE,
    rgbaColor: hexToRgba(GREY_01_OVERRIDE),
    category: 'Border',
  },

  // ===================================
  // BASE COLOR OVERRIDE
  // ===================================

  // Grey-01 base color override (affects multiple components)
  // CSS: --cp-color-jacaranda-grey-01: #f1f2f4;
  {
    variableName: 'color/jacaranda/grey/01',
    description: 'Jacaranda grey-01 (F4F5F6 → f1f2f4)',
    hexColor: GREY_01_OVERRIDE,
    rgbaColor: hexToRgba(GREY_01_OVERRIDE),
    category: 'Base',
  },
];

/**
 * Collection name for the local override variables
 */
export const OVERRIDE_COLLECTION_NAME = 'Cape Overrides';

/**
 * Mode name to target in the override collection
 */
export const TARGET_MODE_NAME = 'Light';

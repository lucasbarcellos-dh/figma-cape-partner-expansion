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

/**
 * Token group overrides - these modify semantic token values
 *
 * CSS Reference:
 * --cp-action-color-secondary-enabled: var(--cp-color-jacaranda-grey-05) !important;
 * --cp-action-color-secondary-hover: var(--cp-color-jacaranda-grey-10) !important;
 * --cp-form-color-branded-primary-enabled: var(--cp-color-jacaranda-grey-05) !important;
 * --cp-form-color-branded-primary-hover: var(--cp-color-jacaranda-grey-10) !important;
 * --cp-control-color-branded-primary-enabled: var(--cp-color-jacaranda-grey-05) !important;
 * --cp-control-color-branded-primary-hover: var(--cp-color-jacaranda-grey-10) !important;
 * --cp-color-jacaranda-grey-01: #f1f2f4;
 */
export const TOKEN_OVERRIDES: TokenOverride[] = [
  // Action color overrides
  {
    variableName: 'action/color/secondary/enabled',
    description: 'Secondary action enabled state → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
  },
  {
    variableName: 'action/color/secondary/hover',
    description: 'Secondary action hover state → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
  },

  // Form color overrides
  {
    variableName: 'form/color/branded/primary/enabled',
    description: 'Form branded primary enabled state → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
  },
  {
    variableName: 'form/color/branded/primary/hover',
    description: 'Form branded primary hover state → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
  },

  // Control color overrides
  {
    variableName: 'control/color/branded/primary/enabled',
    description: 'Control branded primary enabled state → grey-05',
    hexColor: JACARANDA_GREY['05'],
    rgbaColor: hexToRgba(JACARANDA_GREY['05']),
  },
  {
    variableName: 'control/color/branded/primary/hover',
    description: 'Control branded primary hover state → grey-10',
    hexColor: JACARANDA_GREY['10'],
    rgbaColor: hexToRgba(JACARANDA_GREY['10']),
  },

  // Base color override (grey-01 gets a different value)
  {
    variableName: 'color/jacaranda/grey/01',
    description: 'Jacaranda grey-01 override (F4F5F6 → f1f2f4)',
    hexColor: GREY_01_OVERRIDE,
    rgbaColor: hexToRgba(GREY_01_OVERRIDE),
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

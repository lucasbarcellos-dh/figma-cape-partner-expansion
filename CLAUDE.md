# Figma Cape Partner Expansion Plugin

## Purpose
A Figma plugin that applies Cape Partner Expansion overrides to designs, matching the CSS overrides used in the codebase (vendor-partner-portal).

## Reference: CSS Overrides
Source: `packages/layout/src/daemons/CapeVendorExpansion/cape-vendor-expansion.scss`

### Token Group Overrides (CSS)
```scss
--cp-action-color-secondary-enabled: var(--cp-color-jacaranda-grey-05) !important;
--cp-action-color-secondary-hover: var(--cp-color-jacaranda-grey-10) !important;
--cp-form-color-branded-primary-enabled: var(--cp-color-jacaranda-grey-05) !important;
--cp-form-color-branded-primary-hover: var(--cp-color-jacaranda-grey-10) !important;
--cp-control-color-branded-primary-enabled: var(--cp-color-jacaranda-grey-05) !important;
--cp-control-color-branded-primary-hover: var(--cp-color-jacaranda-grey-10) !important;
--cp-color-jacaranda-grey-01: #f1f2f4;
```

## Cape Color Reference: Jacaranda Grey

| Token | Hex Value |
|-------|-----------|
| 00 | #FFFFFF |
| 01 | #F4F5F6 |
| 05 | #E9EAEC |
| 10 | #CECED4 |
| 20 | #b9bac1 |
| 30 | #93949D |
| 40 | #7F8088 |
| 50 | #6C6D73 |
| 60 | #56565C |
| 70 | #434347 |
| 80 | #343437 |
| 90 | #28282A |
| 95 | #1E1E20 |
| 99 | #141415 |
| 100 | #000000 |

**Note:** The CSS override changes `--cp-color-jacaranda-grey-01` from `#F4F5F6` to `#f1f2f4`

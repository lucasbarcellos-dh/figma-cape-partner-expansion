# Figma Cape Partner Expansion Plugin

A Figma plugin that applies Cape Partner Expansion design token overrides to designs, matching the CSS overrides used in the Partner Portal codebase.

## Purpose

This plugin allows designers to quickly apply brand-specific color token overrides across Figma designs. It rebinds existing Cape design token variables to their Partner Expansion equivalents, ensuring design consistency with the production CSS implementation.

## Installation

### From Figma Community
Install directly from the Figma Community: [Cape Partner Expansion](https://www.figma.com/community/plugin/1597944895506459760/cape-partner-expansion)

### Local Development
1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the plugin:
   ```bash
   npm run build
   ```
4. In Figma Desktop, go to **Plugins > Development > Import plugin from manifest...**
5. Select the `manifest.json` file from this repository

## Usage

1. Open a Figma file that uses Cape design tokens
2. Run the plugin via **Plugins > Cape Partner Expansion**
3. Choose a scope:
   - **Selection** - Apply to selected layers only
   - **Page** - Apply to all elements on current page
   - **Document** - Apply to all elements across all pages
4. Click **Apply Overrides**
5. Review the results showing imported variables and rebind counts

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build for production (minified) |
| `npm run watch` | Watch mode for development |

### Project Structure

```
figma-cape-partner-expansion/
├── src/
│   ├── code.ts              # Plugin sandbox code (Figma API)
│   ├── ui.tsx               # React UI component
│   └── overrides/
│       └── token-overrides.ts  # Token definitions
├── data/
│   ├── cape-tokens.json     # Token reference data
│   └── cape-vendor-expansion.scss  # CSS override reference
├── dist/                    # Build output
├── build.mjs                # ESBuild configuration
├── manifest.json            # Figma plugin manifest
└── package.json
```

### Tech Stack

- **Build Tool**: ESBuild
- **UI Framework**: React 18
- **Language**: TypeScript 5
- **Figma API**: Plugin Typings v1.98

## How It Works

1. **Library Detection**: Searches for the "[Cape] Partner Expansion" library and "Cape Overrides" variable collection
2. **Variable Import**: Imports override variables from the shared library
3. **Node Traversal**: Recursively processes all nodes in the selected scope
4. **Variable Rebinding**: For each node with fill or stroke properties bound to Cape variables, rebinds them to the corresponding override variable
5. **Result Reporting**: Displays detailed results including import status, rebind counts, and any errors

## Requirements

- Figma Desktop app (for local development)
- Access to the Cape Partner Expansion team library (for production use)
- Node.js 18+ (for development)

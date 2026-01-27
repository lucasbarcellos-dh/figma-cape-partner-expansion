import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const isWatch = process.argv.includes('--watch');

// Build the main plugin code
const codeConfig = {
  entryPoints: ['src/code.ts'],
  bundle: true,
  outfile: 'dist/code.js',
  platform: 'neutral',
  target: 'es2020',
  format: 'iife',
  minify: !isWatch,
};

// Build the UI code
const uiConfig = {
  entryPoints: ['src/ui.tsx'],
  bundle: true,
  outfile: 'dist/ui.js',
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  minify: !isWatch,
  define: {
    'process.env.NODE_ENV': isWatch ? '"development"' : '"production"',
  },
};

// HTML template that includes the bundled UI JS
function buildHtml() {
  const uiJs = fs.readFileSync('dist/ui.js', 'utf-8');
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      color: #333;
      background: #fff;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>${uiJs}</script>
</body>
</html>`;

  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/ui.html', html);
  console.log('Built dist/ui.html');
}

async function build() {
  try {
    await esbuild.build(codeConfig);
    console.log('Built dist/code.js');

    await esbuild.build(uiConfig);
    console.log('Built dist/ui.js');

    buildHtml();

    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  const codeCtx = await esbuild.context(codeConfig);
  const uiCtx = await esbuild.context(uiConfig);

  await codeCtx.watch();
  await uiCtx.watch();

  console.log('Watching for changes...');

  // Initial build
  await build();

  // Watch for UI changes to rebuild HTML
  fs.watch('dist', (event, filename) => {
    if (filename === 'ui.js') {
      buildHtml();
    }
  });
}

if (isWatch) {
  watch();
} else {
  build();
}

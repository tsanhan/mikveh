// Generate native assets from existing repository artwork.
// Run: node scripts/generate_app_icons.cjs
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');

async function main() {
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, 'resources/icon-only.png');
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'mikveh-icons-'));
  const background = '#F3C3C3';
  try {
    const foreground = await sharp(source).resize(800, 800, { fit: 'contain' }).png().toBuffer();
    const canvas = color => sharp({ create: { width: 1024, height: 1024, channels: 4, background: color } });
    await canvas(background).composite([{ input: foreground, gravity: 'center' }]).png().toFile(path.join(staging, 'icon-only.png'));
    await canvas('#00000000').composite([{ input: foreground, gravity: 'center' }]).png().toFile(path.join(staging, 'icon-foreground.png'));
    await canvas(background).png().toFile(path.join(staging, 'icon-background.png'));
    const generatedAt = Date.now();
    execFileSync(process.execPath, [
      path.join(root, 'node_modules/@capacitor/assets/bin/capacitor-assets'),
      'generate', '--android', '--ios', '--assetPath', path.relative(root, staging), '--iconBackgroundColor', background,
    ], { cwd: root, stdio: 'inherit' });
    for (const file of [
      'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
      'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
    ]) {
      if ((await fs.stat(path.join(root, file))).mtimeMs < generatedAt - 100) {
        throw new Error(`Capacitor did not regenerate ${file}`);
      }
    }

    const res = path.join(root, 'android/app/src/main/res');
    const largeDir = path.join(res, 'drawable-nodpi');
    await fs.mkdir(largeDir, { recursive: true });
    await sharp(source).resize(256, 256).png().toFile(path.join(largeDir, 'ic_mikveh.png'));
    // Android small notification icons are white alpha masks. Reuse the
    // artwork's teardrop silhouette, rather than flattening the photo to a square.
    for (const [density, scale] of [['mdpi', 1], ['hdpi', 1.5], ['xhdpi', 2], ['xxhdpi', 3], ['xxxhdpi', 4]]) {
      const dir = path.join(res, `drawable-${density}`);
      await fs.mkdir(dir, { recursive: true });
      const inset = Math.round(2 * scale);
      const { data, info } = await sharp(source).ensureAlpha().resize(Math.round(20 * scale), Math.round(20 * scale))
        .extend({ top: inset, bottom: inset, left: inset, right: inset, background: '#00000000' })
        .raw().toBuffer({ resolveWithObject: true });
      for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
      await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png().toFile(path.join(dir, 'ic_stat_mikveh.png'));
    }
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

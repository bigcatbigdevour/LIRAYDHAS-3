# resources/

Drop the iOS asset source files here, then run:

```bash
npm run ios:assets
```

…to generate every required size into `ios/App/App/Assets.xcassets/`.

## Required files

| File           | Size          | Purpose                                  |
| -------------- | ------------- | ---------------------------------------- |
| `icon.png`     | 1024 × 1024   | App icon. Solid background, no transparency, no rounded corners (iOS adds them). |
| `splash.png`   | 2732 × 2732   | Launch splash. Logo centered on a `#0a0a0a` background, with safe area around the center 1200 × 1200. |
| `splash-dark.png` | 2732 × 2732 | Optional dark-mode splash (we already use dark — copy `splash.png` to this name). |

## Quick recipe

`/public/icon-512.svg` is the source of truth for the icon. From a Mac
with `librsvg` installed:

```bash
brew install librsvg
rsvg-convert -w 1024 -h 1024 -b "#0a0a0a" public/icon-512.svg \
  -o resources/icon.png

# Splash: same icon centered on a black 2732x2732 canvas
rsvg-convert -w 1200 -h 1200 -b "#0a0a0a" public/icon-512.svg \
  -o /tmp/icon-1200.png
# Then composite onto a 2732 black canvas with sips or ImageMagick:
magick -size 2732x2732 xc:'#0a0a0a' /tmp/icon-1200.png \
  -gravity center -composite resources/splash.png
cp resources/splash.png resources/splash-dark.png
```

If you don't want to mess with CLI tools: open `public/icon-512.svg`
in Figma / Sketch / Affinity, export at the sizes above.

The Capacitor assets tool then writes:
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (all 21 sizes)
- `ios/App/App/Assets.xcassets/Splash.imageset/` (1x, 2x, 3x)
- `ios/App/App/Assets.xcassets/SplashDark.imageset/`

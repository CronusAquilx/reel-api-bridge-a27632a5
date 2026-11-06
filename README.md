# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Console Mode

## Wallpaper assets and repository clones

The wallpaper catalogs, original-quality mappings, and `.asset.json` references in `src/assets/wallpapers` belong in Git. Do not exclude those JSON files. The video/image bytes live on Lovable's asset CDN rather than inside Git: the collection is about 67 GB across originals and variants, and individual originals may exceed GitHub's file limits.

Lovable deployments serve the immutable `/__l5e/assets-v1/…` asset references. A repository clone preserves those references without re-scraping the source wallpaper site; it is **not** an offline backup of the media. Do not delete the hosted assets while a clone or deployment uses them. Hosting outside Lovable needs an equivalent media host and URL mapping; a plain standalone server does not supply Lovable's asset endpoint automatically. Account-uploaded private wallpapers and account preferences are separate Cloud data, not repository assets.

### Screen viewing

The staff viewer provides a lightweight layout preview by default. The person being viewed can choose **Share live video**, approve a tab/window in their browser, revoke control, or stop viewing. Live video uses a direct WebRTC connection; restrictive networks may prevent it because no TURN relay is configured. Browser-protected/DRM playback can remain black, and remote synthetic inputs are not supported by every game. No video recording is stored.

Sony Console includes Games and Media home screens, real cloud and arcade games, install/uninstall and wishlist menus, an app library, profile editing, background selection, and device/layout setup. Installations are library shortcuts simulated locally per signed-in user; provider subscriptions and hardware requirements still apply.

### Adding a skin

A skin consists of scoped theme tokens in `src/styles.css`, a layout configuration in `src/lib/console/skins.ts`, and home/store/library/settings/profile components. Add its ID to preferences, register the components in `ConsoleScreen`, and expose it in layout selection only once those screens work. Reuse `useConsoleCtx`, `useConsoleInput`, catalog queries, and library actions; do not change classic/launcher or gameplay layouts. Focus sounds default off and all motion respects reduced-motion preferences. Xbox skins remain separate future work.

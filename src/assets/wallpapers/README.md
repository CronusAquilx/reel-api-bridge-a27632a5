# Portable wallpaper catalog

The wallpaper binaries are hosted on Lovable's immutable asset CDN. Every `.asset.json` pointer in this directory is application source and belongs in Git/GitHub. A clone keeps the same catalog and loads the same stable asset URLs; it does not need another download or import run.

Do not replace these pointers with the original MP4/JPG files. The complete catalog is about 67 GB, which is unsuitable for a Git repository and exceeds normal Git file limits. The pointer files are only a few megabytes combined.

The TypeScript catalog modules import each pointer directly, so missing or renamed pointers fail compilation instead of silently removing a wallpaper.

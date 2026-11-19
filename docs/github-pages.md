# Publish with GitHub Pages

The explorer is a static Vite site. GitHub Actions builds it and deploys the generated `dist` folder; the local development server is not needed after publishing.

## Create and publish a repository

This folder is a separate project from the AI4PE explorer. To publish it as its own site:

1. Create a new, empty repository on GitHub. Leave the options to add a README, license, and `.gitignore` unchecked, since this project already has files with those names (except a license). Choose the visibility appropriate for your account and review the files before making them public.
2. In PowerShell, open this project folder and replace `YOUR-USERNAME` and `YOUR-REPOSITORY` with your actual GitHub account and repository name:

   ```powershell
   cd D:\hobby-project\traction-inverter-explorer
   git init -b main
   git status
   git add -A
   git diff --cached --stat
   git diff --cached
   git commit -m "Prepare traction inverter explorer for GitHub Pages"
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

   The Git commands above are for the currently uninitialized project and a new, empty repository. If a Git repository or `origin` already exists, inspect `git status` and `git remote -v` and adapt the commands instead of creating another one. GitHub may prompt you to authenticate. The local `exports/` folder is ignored, but `public/traction-inverter-concept.png` will be uploaded and published with the site; review all staged files before committing.
3. On GitHub, open **Settings → Pages → Build and deployment**, and choose **GitHub Actions** as the source. If the workflow ran before Pages was enabled, open **Actions → Deploy GitHub Pages** and select **Run workflow** or re-run the failed job.
4. After the workflow succeeds, open the URL shown by GitHub Pages. For a project repository, the address normally has the form `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
5. In `src/App.jsx`, replace the `REPOSITORY_URL` placeholder with the actual repository URL so the GitHub icon points to it. If you want the README preview to link to the live model, wrap the preview image in a link to the Pages URL. Commit and push those changes; each later push to `main` deploys automatically.

For a public repository, GitHub Pages is available with GitHub Free. Check the repository visibility and GitHub plan before publishing. The files and the site will be accessible according to the repository's and Pages' visibility settings.

## Base path and local checks

The workflow uses the repository name as the Vite base path, so a project repository works at `/<repository>/`. A repository named `<owner>.github.io` builds at `/`. For a custom domain served at its root, set the repository Actions variable `PAGES_BASE_PATH` to `/`.

To check a project-style path locally, replace `YOUR-REPOSITORY` with the repository name:

```powershell
npm ci
npm test
npm run build -- --base=/YOUR-REPOSITORY/
npm run preview -- --base=/YOUR-REPOSITORY/
```

Open the preview URL printed by Vite, including the repository path. This is a local check, not a public deployment. The model runs in the browser and needs WebGL.

import { appShellFeature } from "./features/app-shell/index.js";
import { assetsFeature } from "./features/assets/index.js";
import { authFeature } from "./features/auth/index.js";
import { jobsFeature } from "./features/jobs/index.js";
import { projectsFeature } from "./features/projects/index.js";
import { realtimeFeature } from "./features/realtime/index.js";
import { sharedUiFeature } from "./features/shared-ui/index.js";

const featureCards = [
  appShellFeature,
  authFeature,
  projectsFeature,
  assetsFeature,
  jobsFeature,
  realtimeFeature,
  sharedUiFeature
];

const styles = `
  :root {
    color-scheme: light;
    --bg: #f4efe6;
    --surface: rgba(255, 251, 245, 0.86);
    --line: rgba(33, 22, 15, 0.12);
    --ink: #20130d;
    --muted: #6c594d;
    --accent: #c0522f;
    --accent-soft: rgba(192, 82, 47, 0.14);
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: "Georgia", "Times New Roman", serif;
    background:
      radial-gradient(circle at top left, rgba(192, 82, 47, 0.18), transparent 26%),
      linear-gradient(160deg, #f6f1e7 0%, #efe4d2 100%);
    color: var(--ink);
  }

  main {
    width: min(1120px, calc(100% - 32px));
    margin: 0 auto;
    padding: 48px 0 72px;
  }

  .hero {
    display: grid;
    gap: 16px;
    padding: 24px;
    border: 1px solid var(--line);
    border-radius: 24px;
    background: var(--surface);
    backdrop-filter: blur(12px);
    box-shadow: 0 20px 60px rgba(27, 16, 10, 0.08);
  }

  .eyebrow {
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-size: 12px;
    color: var(--muted);
  }

  h1 {
    margin: 0;
    font-size: clamp(42px, 8vw, 76px);
    line-height: 0.95;
  }

  .hero p {
    margin: 0;
    max-width: 720px;
    font-size: 18px;
    line-height: 1.6;
    color: var(--muted);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .chip {
    padding: 10px 14px;
    border-radius: 999px;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid rgba(192, 82, 47, 0.2);
    font-size: 14px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 16px;
    margin-top: 24px;
  }

  article {
    border: 1px solid var(--line);
    border-radius: 20px;
    padding: 20px;
    background: rgba(255, 252, 248, 0.9);
    min-height: 220px;
  }

  article h2 {
    margin: 0 0 12px;
    font-size: 26px;
  }

  article p {
    margin: 0 0 12px;
    line-height: 1.55;
    color: var(--muted);
  }

  article strong {
    display: block;
    margin-top: 16px;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink);
  }
`;

export function renderPage(): string {
  const cards = featureCards
    .map(
      (feature) => `
        <article>
          <h2>${feature.label}</h2>
          <p>${feature.responsibility}</p>
          <strong>Next Phase</strong>
          <p>${feature.nextPhase}</p>
        </article>
      `
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>TheIndiesPrototype Web Foundation</title>
      <style>${styles}</style>
    </head>
    <body>
      <main>
        <section class="hero">
          <span class="eyebrow">Phase 1 Foundation</span>
          <h1>TheIndiesPrototype</h1>
          <p>
            This placeholder web app already mirrors the future frontend modular monolith
            structure. Each card below maps directly to a feature area that will become a
            concrete Angular module in later phases.
          </p>
          <div class="chips">
            <span class="chip">Angular target</span>
            <span class="chip">Feature-based UI boundaries</span>
            <span class="chip">Typed API integration later</span>
          </div>
        </section>
        <section class="grid">${cards}</section>
      </main>
    </body>
  </html>`;
}

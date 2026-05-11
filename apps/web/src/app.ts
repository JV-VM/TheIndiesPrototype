import { renderBrowserScript } from "./browser-script.js";
import { appShellFeature } from "./features/app-shell/index.js";
import { assetsFeature } from "./features/assets/index.js";
import { authFeature } from "./features/auth/index.js";
import { jobsFeature } from "./features/jobs/index.js";
import { projectsFeature } from "./features/projects/index.js";
import { realtimeFeature } from "./features/realtime/index.js";
import { sharedUiFeature } from "./features/shared-ui/index.js";

interface WebAppConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
}

interface FeatureCard {
  label: string;
  responsibility: string;
  nextPhase: string;
}

const featureCards: FeatureCard[] = [
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
    --canvas: #f0e8da;
    --ink: #1f1711;
    --muted: #665447;
    --line: rgba(34, 21, 12, 0.14);
    --panel: rgba(255, 250, 243, 0.9);
    --panel-strong: rgba(255, 247, 236, 0.98);
    --panel-soft: rgba(255, 252, 247, 0.84);
    --accent: #c95e37;
    --accent-deep: #8f3414;
    --accent-soft: rgba(201, 94, 55, 0.12);
    --success: #1d7d52;
    --danger: #9f2c2c;
    --shadow: 0 18px 52px rgba(29, 18, 10, 0.10);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    font-family: "Georgia", "Times New Roman", serif;
    background:
      radial-gradient(circle at top left, rgba(201, 94, 55, 0.22), transparent 24%),
      radial-gradient(circle at bottom right, rgba(94, 60, 35, 0.12), transparent 28%),
      linear-gradient(180deg, #f5efe4 0%, #e6d8c1 100%);
    color: var(--ink);
  }

  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background-image:
      linear-gradient(rgba(34, 21, 12, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34, 21, 12, 0.03) 1px, transparent 1px);
    background-size: 24px 24px;
    mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.65), transparent 100%);
  }

  body[data-auth="true"] {
    background:
      radial-gradient(circle at top left, rgba(201, 94, 55, 0.16), transparent 24%),
      linear-gradient(180deg, #f2ebdf 0%, #e1d0b5 100%);
  }

  #app {
    width: min(1240px, calc(100% - 32px));
    margin: 0 auto;
    padding: 32px 0 64px;
  }

  .hero-shell {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 420px);
    gap: 24px;
    align-items: start;
  }

  .hero-panel,
  .auth-panel,
  .shell-sidebar,
  .shell-main,
  .status-strip,
  .content-card,
  .feature-card,
  .workspace-pane,
  .asset-row,
  .project-card {
    border: 1px solid var(--line);
    border-radius: 24px;
    background: var(--panel);
    backdrop-filter: blur(8px);
    box-shadow: var(--shadow);
  }

  .hero-panel {
    padding: 28px;
    display: grid;
    gap: 18px;
  }

  .eyebrow,
  .mini-label {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(201, 94, 55, 0.2);
    background: var(--accent-soft);
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--accent-deep);
  }

  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }

  .hero-panel h1 {
    font-size: clamp(42px, 7vw, 82px);
    line-height: 0.94;
    max-width: 700px;
  }

  .hero-panel > p,
  .auth-panel p,
  .status-strip p,
  .content-card p,
  .feature-card p,
  .shell-nav-note,
  .empty-state p,
  .workspace-pane p,
  .asset-row p,
  .project-card p {
    color: var(--muted);
    line-height: 1.65;
  }

  .hero-grid,
  .status-grid,
  .content-grid,
  .feature-grid {
    display: grid;
    gap: 12px;
  }

  .hero-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .status-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .content-grid {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .feature-grid {
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  }

  .hero-blade {
    padding: 16px;
    border-radius: 18px;
    background: rgba(255, 249, 240, 0.88);
    border: 1px solid var(--line);
  }

  .hero-blade strong,
  .status-strip strong,
  .content-card strong,
  .feature-card strong,
  .workspace-pane strong,
  .project-card strong,
  .asset-row strong {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .auth-panel {
    padding: 24px;
    display: grid;
    gap: 16px;
    background: var(--panel-strong);
  }

  .mode-switch {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .mode-button,
  .primary-button,
  .ghost-button,
  .shell-link,
  .project-card {
    appearance: none;
    border: 1px solid transparent;
    border-radius: 16px;
    cursor: pointer;
    font: inherit;
    transition:
      transform 160ms ease,
      background-color 160ms ease,
      border-color 160ms ease,
      color 160ms ease;
  }

  .mode-button,
  .ghost-button,
  .shell-link {
    background: rgba(255, 249, 242, 0.9);
    color: var(--ink);
    border-color: var(--line);
  }

  .project-card {
    width: 100%;
    text-align: left;
    background: rgba(255, 249, 242, 0.72);
    color: var(--ink);
    border-color: var(--line);
    padding: 18px;
  }

  .project-card[data-active="true"] {
    background: rgba(31, 23, 17, 0.94);
    border-color: rgba(31, 23, 17, 0.94);
    color: #fff9f2;
  }

  .project-card[data-active="true"] p,
  .project-card[data-active="true"] strong {
    color: inherit;
  }

  .mode-button {
    padding: 12px 14px;
  }

  .mode-button[data-active="true"] {
    background: var(--ink);
    color: #fff9f2;
    border-color: var(--ink);
  }

  .primary-button {
    padding: 13px 18px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
    color: white;
  }

  .ghost-button {
    padding: 11px 14px;
  }

  .primary-button:hover,
  .ghost-button:hover,
  .mode-button:hover,
  .shell-link:hover,
  .project-card:hover {
    transform: translateY(-1px);
  }

  .primary-button:disabled,
  .ghost-button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    transform: none;
  }

  form {
    display: grid;
    gap: 12px;
  }

  label {
    display: grid;
    gap: 8px;
    font-size: 14px;
    color: var(--muted);
  }

  input,
  textarea,
  select {
    width: 100%;
    padding: 13px 15px;
    border-radius: 16px;
    border: 1px solid rgba(34, 21, 12, 0.12);
    background: rgba(255, 253, 248, 0.96);
    color: var(--ink);
    font: inherit;
  }

  textarea {
    min-height: 116px;
    resize: vertical;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid rgba(201, 94, 55, 0.3);
    outline-offset: 2px;
  }

  .form-actions,
  .project-actions,
  .pagination,
  .inline-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  .field-grid,
  .workspace-grid {
    display: grid;
    gap: 14px;
  }

  .field-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .workspace-grid {
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  }

  .field-span-2 {
    grid-column: span 2;
  }

  .upload-dropzone {
    padding: 18px;
    border-radius: 20px;
    border: 1px dashed rgba(34, 21, 12, 0.2);
    background: rgba(255, 250, 243, 0.68);
    transition:
      border-color 160ms ease,
      background-color 160ms ease,
      transform 160ms ease;
  }

  .upload-dropzone[data-drag="true"] {
    border-color: var(--accent);
    background: rgba(201, 94, 55, 0.1);
    transform: translateY(-1px);
  }

  .upload-picker {
    display: inline-flex;
    width: fit-content;
    cursor: pointer;
    color: var(--accent-deep);
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .upload-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .upload-progress {
    display: grid;
    gap: 10px;
  }

  .upload-progress-bar {
    width: 100%;
    height: 10px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(34, 21, 12, 0.08);
  }

  .upload-progress-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
    transition: width 120ms linear;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .workspace-pane,
  .status-strip,
  .content-card,
  .feature-card,
  .asset-row {
    padding: 18px;
    min-width: 0;
  }

  .project-stack,
  .asset-list,
  .workspace-stack {
    display: grid;
    gap: 12px;
  }

  .project-card-head,
  .asset-row-head,
  .list-header,
  .shell-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
    flex-wrap: wrap;
  }

  .message {
    min-height: 24px;
    font-size: 14px;
  }

  .message[data-tone="neutral"] {
    color: var(--muted);
  }

  .message[data-tone="success"] {
    color: var(--success);
  }

  .message[data-tone="danger"] {
    color: var(--danger);
  }

  .muted-note {
    font-size: 12px;
    color: var(--muted);
  }

  .shell {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 22px;
  }

  .shell-sidebar {
    padding: 22px;
    display: grid;
    gap: 16px;
    align-content: start;
    min-width: 0;
  }

  .shell-main {
    padding: 22px;
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .shell > *,
  .workspace-grid > *,
  .field-grid > *,
  .project-card-head > *,
  .asset-row-head > *,
  .list-header > *,
  .shell-header > * {
    min-width: 0;
  }

  #shell-status-grid-slot,
  #shell-realtime-slot,
  #shell-active-section-slot,
  #shell-message-slot {
    overflow-anchor: none;
  }

  #projects-left-slot,
  #projects-right-slot,
  #jobs-left-slot,
  #jobs-right-slot {
    overflow-anchor: none;
  }

  #shell-message-slot {
    min-height: 24px;
  }

  .shell-nav {
    display: grid;
    gap: 10px;
  }

  .shell-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    text-align: left;
  }

  .shell-link[data-active="true"] {
    background: var(--ink);
    color: #fff9f2;
    border-color: var(--ink);
  }

  .shell-header h2 {
    font-size: clamp(28px, 4.5vw, 48px);
    line-height: 1.02;
  }

  .status-value {
    font-size: 26px;
    margin-top: 6px;
  }

  .dependency-chip,
  .summary-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    border-radius: 999px;
    background: rgba(255, 249, 242, 0.9);
    border: 1px solid var(--line);
    font-size: 12px;
    color: var(--ink);
  }

  .dependency-chip[data-status="healthy"],
  .summary-chip[data-status="completed"] {
    color: var(--success);
  }

  .dependency-chip[data-status="unhealthy"],
  .summary-chip[data-status="failed"] {
    color: var(--danger);
  }

  .summary-chip[data-status="processing"],
  .summary-chip[data-status="queued"] {
    color: var(--accent-deep);
  }

  .chip-cluster {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .session-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(255, 249, 242, 0.95);
    border: 1px solid var(--line);
    font-size: 13px;
    color: var(--muted);
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .code-pill {
    font-family: "Courier New", monospace;
    font-size: 12px;
    white-space: normal;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .muted-note,
  .message,
  .empty-state p,
  .workspace-pane p,
  .asset-row p,
  .project-card p {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .empty-state {
    padding: 18px;
    border-radius: 18px;
    border: 1px dashed rgba(34, 21, 12, 0.18);
    background: rgba(255, 250, 243, 0.72);
  }

  .section-divider {
    margin-top: 8px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }

  .workspace-subsection {
    padding: 18px;
    border-radius: 20px;
    border: 1px solid rgba(34, 21, 12, 0.1);
    background: var(--panel-soft);
  }

  .subsection-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: start;
    flex-wrap: wrap;
  }

  .subsection-head p {
    max-width: 52ch;
  }

  .workflow-list {
    display: grid;
    gap: 10px;
    margin-top: 8px;
  }

  .workflow-step {
    display: flex;
    gap: 10px;
    align-items: start;
  }

  .workflow-step .code-pill {
    min-width: 26px;
    text-align: center;
  }

  @media (max-width: 1080px) {
    .workspace-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 920px) {
    .hero-shell,
    .shell {
      grid-template-columns: 1fr;
    }

    #app {
      width: min(100%, calc(100% - 24px));
      padding-top: 20px;
    }

    .field-span-2 {
      grid-column: auto;
    }
  }
`;

export function renderPage(config: WebAppConfig): string {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>TheIndiesPrototype Processing Workspace</title>
      <style>${styles}</style>
    </head>
    <body>
      <div id="app"></div>
      <script type="module">${renderBrowserScript({
        apiBaseUrl: config.apiBaseUrl,
        wsBaseUrl: config.wsBaseUrl,
        featureCards
      })}</script>
    </body>
  </html>`;
}

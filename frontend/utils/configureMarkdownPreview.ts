import { config } from "md-editor-v3";
import "../assets/styles/markdown-highlight.scss";

export type MarkdownPreviewFeatures = {
  highlight: boolean;
  mermaid: boolean;
  katex: boolean;
  echarts: boolean;
};

let highlightInitialization: Promise<void> | null = null;
let mermaidInitialization: Promise<void> | null = null;
let katexInitialization: Promise<void> | null = null;
let echartsInitialization: Promise<void> | null = null;

const MERMAID_FENCE_LANGUAGES =
  "mermaid|flow|sequence|gantt|class|state|pie|relationship|journey";

const MERMAID_DIRECTIVES: Record<string, string> = {
  flow: "flowchart TD",
  sequence: "sequenceDiagram",
  gantt: "gantt",
  class: "classDiagram",
  state: "stateDiagram-v2",
  pie: "pie",
  relationship: "erDiagram",
  journey: "journey",
};

const MERMAID_DIRECTIVE_PATTERNS: Record<string, RegExp> = {
  flow: /^(?:flowchart|graph)\b/i,
  sequence: /^sequenceDiagram\b/i,
  gantt: /^gantt\b/i,
  class: /^classDiagram\b/i,
  state: /^stateDiagram(?:-v2)?\b/i,
  pie: /^pie\b/i,
  relationship: /^erDiagram\b/i,
  journey: /^journey\b/i,
};

export function normalizeMarkdownPreviewContent(content: string) {
  const aliasFence = new RegExp(
    `(^|\\n)([ \\t]*)(\`{3,}|~{3,})[ \\t]*(flow|sequence|gantt|class|state|pie|relationship|journey)[ \\t]*\\n([ \\t]*)([^\\n]*)`,
    "gi",
  );

  return content.replace(
    aliasFence,
    (match, lineStart, indentation, fence, language, bodyIndent, firstLine) => {
      const normalizedLanguage = String(language).toLowerCase();
      const directive = MERMAID_DIRECTIVES[normalizedLanguage];
      const alreadyTyped = MERMAID_DIRECTIVE_PATTERNS[normalizedLanguage].test(
        String(firstLine).trim(),
      );
      const directiveLine = alreadyTyped
        ? ""
        : `${bodyIndent}${directive}\n`;
      return `${lineStart}${indentation}${fence}mermaid\n${directiveLine}${bodyIndent}${firstLine}`;
    },
  );
}

export function markdownPreviewFeatures(
  content: string,
): MarkdownPreviewFeatures {
  return {
    highlight: /(^|\n)\s*(?:```|~~~)[^\n]*\n/.test(content),
    mermaid: new RegExp(
      `(^|\\n)\\s*(?:\`{3,}|~{3,})(?:${MERMAID_FENCE_LANGUAGES})\\b`,
      "i",
    ).test(content),
    katex: /(^|[^\\])\$\$?[\s\S]*?\$\$?/.test(content),
    echarts: /(^|\n)\s*(?:```|~~~)echarts\b/i.test(content),
  };
}

function configureHighlight() {
  if (highlightInitialization) return highlightInitialization;
  highlightInitialization = Promise.all([
    import("highlight.js/lib/core"),
    import("highlight.js/lib/languages/javascript"),
    import("highlight.js/lib/languages/typescript"),
    import("highlight.js/lib/languages/json"),
    import("highlight.js/lib/languages/css"),
    import("highlight.js/lib/languages/xml"),
    import("highlight.js/lib/languages/markdown"),
  ]).then(
    ([highlight, javascript, typescript, json, css, xml, markdownLanguage]) => {
      const instance = highlight.default;
      instance.registerLanguage("javascript", javascript.default);
      instance.registerLanguage("typescript", typescript.default);
      instance.registerLanguage("json", json.default);
      instance.registerLanguage("css", css.default);
      instance.registerLanguage("xml", xml.default);
      instance.registerLanguage("markdown", markdownLanguage.default);
      config({ editorExtensions: { highlight: { instance } } });
    },
  );
  return highlightInitialization;
}

function configureMermaid() {
  if (mermaidInitialization) return mermaidInitialization;
  mermaidInitialization = import("mermaid").then((mermaid) => {
    mermaid.default.initialize({
      startOnLoad: false,
      theme: 'default',
    });
    config({
      editorExtensions: {
        mermaid: { instance: mermaid.default, enableZoom: true },
      },
    });
  });
  return mermaidInitialization;
}

function configureKatex() {
  if (katexInitialization) return katexInitialization;
  katexInitialization = Promise.all([
    import("katex"),
    import("katex/dist/katex.min.css"),
  ]).then(([katex]) => {
    config({ editorExtensions: { katex: { instance: katex.default } } });
  });
  return katexInitialization;
}

function configureEcharts() {
  if (echartsInitialization) return echartsInitialization;
  echartsInitialization = import("./echartsLite").then((echarts) => {
    config({ editorExtensions: { echarts: { instance: echarts.default } } });
  });
  return echartsInitialization;
}

export async function configureMarkdownPreview(
  features: MarkdownPreviewFeatures,
) {
  const tasks: Promise<void>[] = [];
  if (features.highlight) tasks.push(configureHighlight());
  if (features.mermaid) tasks.push(configureMermaid());
  if (features.katex) tasks.push(configureKatex());
  if (features.echarts) tasks.push(configureEcharts());
  await Promise.all(tasks);
}

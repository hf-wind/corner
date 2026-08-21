import { config } from 'md-editor-v3'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'
import 'cropperjs/dist/cropper.css'

let initialization: Promise<void> | null = null

export function configureMarkdownEditor() {
  if (initialization) return initialization

  initialization = Promise.all([
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/javascript'),
    import('highlight.js/lib/languages/typescript'),
    import('highlight.js/lib/languages/json'),
    import('highlight.js/lib/languages/css'),
    import('highlight.js/lib/languages/xml'),
    import('highlight.js/lib/languages/markdown'),
    import('prettier/standalone'),
    import('prettier/plugins/markdown'),
    import('cropperjs'),
    import('screenfull'),
    import('mermaid'),
    import('katex'),
    import('./echartsLite'),
  ]).then(([
    highlight,
    javascript,
    typescript,
    json,
    css,
    xml,
    markdownLanguage,
    prettier,
    prettierMarkdown,
    cropper,
    screenfull,
    mermaid,
    katex,
    echarts,
  ]) => {
    const highlightInstance = highlight.default
    highlightInstance.registerLanguage('javascript', javascript.default)
    highlightInstance.registerLanguage('typescript', typescript.default)
    highlightInstance.registerLanguage('json', json.default)
    highlightInstance.registerLanguage('css', css.default)
    highlightInstance.registerLanguage('xml', xml.default)
    highlightInstance.registerLanguage('markdown', markdownLanguage.default)
    config({
      editorExtensions: {
        highlight: { instance: highlightInstance },
        prettier: {
          prettierInstance: prettier.default,
          parserMarkdownInstance: prettierMarkdown.default,
        },
        cropper: { instance: cropper.default },
        screenfull: { instance: screenfull.default },
        mermaid: { instance: mermaid.default },
        katex: { instance: katex.default },
        echarts: { instance: echarts.default },
      },
    })
  })

  return initialization
}

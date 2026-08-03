import { config } from 'md-editor-v3'
import 'highlight.js/styles/github.css'
import 'katex/dist/katex.min.css'
import 'cropperjs/dist/cropper.css'

let initialization: Promise<void> | null = null

export function configureMarkdownEditor() {
  if (initialization) return initialization

  initialization = Promise.all([
    import('highlight.js'),
    import('prettier/standalone'),
    import('prettier/plugins/markdown'),
    import('cropperjs'),
    import('screenfull'),
    import('mermaid'),
    import('katex'),
    import('echarts'),
  ]).then(([
    highlight,
    prettier,
    prettierMarkdown,
    cropper,
    screenfull,
    mermaid,
    katex,
    echarts,
  ]) => {
    config({
      editorExtensions: {
        highlight: { instance: highlight.default },
        prettier: {
          prettierInstance: prettier.default,
          parserMarkdownInstance: prettierMarkdown.default,
        },
        cropper: { instance: cropper.default },
        screenfull: { instance: screenfull.default },
        mermaid: { instance: mermaid.default },
        katex: { instance: katex.default },
        echarts: { instance: echarts },
      },
    })
  })

  return initialization
}

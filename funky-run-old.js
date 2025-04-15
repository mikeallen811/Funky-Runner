import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, basename } from 'path'
import { build } from 'esbuild'
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import alias from 'esbuild-plugin-alias'

const input = resolve(process.argv[2])
const name = basename(input, '.run-e')
const outDir = resolve('.funky-temp')
mkdirSync(outDir, { recursive: true })

// Read and extract <template> and <script> blocks
const content = readFileSync(input, 'utf8')
const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/)

const template = templateMatch?.[1]?.trim() ?? ''
const script = scriptMatch?.[1]?.trim() ?? ''

// Create a Vue component using Composition API style
const vueComponent = `
    document.body.style.border = "5px solid lime"

    import { createApp, ref } from 'vue'

    function debug(msg) {
        const el = document.createElement('pre')
        el.style.color = 'lime'
        el.textContent = "[DEBUG]: " + msg;
        document.body.appendChild(el)
    }

    debug("🧠 Running compiled app.js");

    const App = {
        setup: () => {
            ${script}
            return { pct }
        },
        mounted() {
            debug("🔥 Vue onMounted triggered")
        },
        template: \`${template}\`
    }

    document.addEventListener('DOMContentLoaded', () => {
        debug("Before mount:", document.getElementById("app"))
        const app = createApp(App)
        app.mount('#app')
    })
`

const entryFile = `${outDir}/${name}.js`
writeFileSync(entryFile, vueComponent)

console.log('================================================')
console.log("==                  TEMPLATE                  ==")
console.log('================================================')
console.log()
console.log(template)
console.log()
console.log('================================================')
console.log("==                   SCRIPT                   ==")
console.log('================================================')
console.log()
console.log(script)
console.log()

// Normalize full path for Windows compatibility
const vuePath = path.posix.join(
    path.resolve('node_modules/vue/dist/vue.esm-bundler.js').replace(/\\/g, '/')
)

// Bundle with esbuild
await build({
    entryPoints: [pathToFileURL(`${outDir}/main.js`).href],
    bundle: true,
    format: 'esm',
    outfile: `${outDir}/app.js`,
    platform: 'browser',
    jsxDev: true,
    define: {
        'process.env.NODE_ENV': '"development"',
        '__VUE_OPTIONS_API__': 'true',
        '__VUE_PROD_DEVTOOLS__': 'true',
        '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': 'false' 
    },
    plugins: [
        alias({
            vue: vuePath
        })
    ]
})

// Create the HTML shell
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-eval'; object-src 'none';">
    <title>Funky Runner</title>
    <style>
        html, body {
            color: #eee;
            background: #222;
            padding: 0;
            margin: 0;
        }
        #app {
            margin-top: 2em;
        }
        button {
            margin-top: 1em;
            padding: 0.5em 1em;
        }
    </style>
    <script>
        window.onerror = function(message, source, lineno, colno, error) {
            document.body.innerHTML="<pre style='color:yellow;'>ERROR: " + message + "</pre>";
        };
    </script>
</head>
<body>
    <h2>Funky Runner</h2>
    <p>Running: ${name}</p>
    <div id="app"></div>
    <script type="module" src="./app.js"></script>
</body>
</html>
`

writeFileSync(`${outDir}/index.html`, html)

// Launch Electron
spawn('npx electron electron-launcher.cjs', {
    stdio: 'inherit',
    shell: true
})

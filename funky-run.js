import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, basename } from 'path'
import { build } from 'esbuild'
import { spawn } from 'child_process'
import alias from 'esbuild-plugin-alias'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// get __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
function logHead(header, message) {
    console.log(`\n====== ${header} ======\n`)
    console.log(message)
    console.log();
}

const input = resolve(process.argv[2])
const name = basename(input, '.run-e')
const outDir = resolve('.funky-temp')

mkdirSync(outDir, { recursive: true })

const content = readFileSync(input, 'utf8')
const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/)

const template = templateMatch?.[1]?.trim() ?? ''
const script = scriptMatch?.[1]?.trim() ?? ''

//const scriptVars = Array.from(script.matchAll(/const\s+(\w+)/g)).map(m => m[1]).join(', ')
const scriptVars = Array.from(script.matchAll(/(?:const|function)\s+(\w+)/g)).map(m => m[1]).join(', ')


logHead("EXTRACTED VARS", scriptVars)

writeFileSync(`${outDir}/main.js`, `
    import { createApp, ref } from 'vue'

    const App = {
        setup() {
            ${script}
            return { ${scriptVars} }
        },
        template: ${JSON.stringify(template)}
    }

    createApp(App).mount('#app')
`)

logHead("TEMPLATE", template)
logHead("SCRIPT", script)

await build({
    entryPoints: [`${outDir}/main.js`],
    bundle: true,
    format: 'esm',
    outfile: `${outDir}/app.js`,
    platform: 'browser',
    define: {
        'process.env.NODE_ENV': '"development"',
        '__VUE_OPTIONS_API__': 'false',
        '__VUE_PROD_DEVTOOLS__': 'true'
    },
    alias: {
        vue: 'vue/dist/vue.esm-bundler.js'  // ⬅️ This one includes the compiler
    },
    plugins: [
        alias({
            vue: `${__dirname}/node_modules/vue/dist/vue.esm-bundler.js`
        })
    ]    
})

console.log('\n====== MAIN.JS OUTPUT ======\n')
console.log(readFileSync(`${outDir}/main.js`, 'utf8'))

writeFileSync(`${outDir}/index.html`, `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Funky Runner</title>
        <style>
            html, body {
                color: #eee;
                background: #222;
                padding: 2em;
                margin: 0;
            }
        </style>
    </head>
    <body>
        <div id="app">[Mounting Vue]</div>
        <script type="module" src="./app.js"></script>
    </body>
    </html>
`)

spawn('npx electron electron-launcher.cjs', {
    stdio: 'inherit',
    shell: true
})

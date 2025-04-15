import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, basename } from 'path'
import { build } from 'esbuild'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import alias from 'esbuild-plugin-alias'

// get __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const launcherPath = resolve(__dirname, 'electron-launcher.cjs')

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

const windowMatch = content.match(/<window>([\s\S]*?)<\/window>/)
const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/)
const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/)
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/)

const window = windowMatch?.[1]?.trim() ?? ''
const template = templateMatch?.[1]?.trim() ?? ''
const style = styleMatch?.[1]?.trim() ?? ''
const script = scriptMatch?.[1]?.trim() ?? ''

const scriptVars = Array.from(script.matchAll(/(?:const|function)\s+(\w+)/g)).map(m => m[1]).join(', ')

writeFileSync(`${outDir}/main.js`, `
    import { createApp, ref } from 'vue'
    import 'vuetify/styles'
    import { createVuetify } from 'vuetify'
    import * as components from 'vuetify/components'
    import * as directives from 'vuetify/directives'

    const App = {
        setup() {
            ${script}
            return { ${scriptVars} }
        },
        template: ${JSON.stringify(template)}
    }

    const vuetify = createVuetify({
        components,
        directives,
        theme: {
            defaultTheme: 'dark',
        }
    })

    createApp(App).use(vuetify).mount('#app')
`)

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
        vue: 'vue/dist/vue.esm-bundler.js'
    },
    plugins: [
        alias({
            vue: `${__dirname}/node_modules/vue/dist/vue.esm-bundler.js`
        })
    ]    
})

writeFileSync(`${outDir}/index.html`, `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Funky Runner</title>
        <link href="https://cdn.jsdelivr.net/npm/vuetify@3.5.13/dist/vuetify.min.css" rel="stylesheet" />
        <style>
            ${style}
        </style>
    </head>
    <body>
        <div id="app"></div>
        <script type="module" src="./app.js"></script>
    </body>
    </html>
`)

const configBase64 = Buffer.from(window).toString('base64');

spawn('npx', ['electron', launcherPath, configBase64], {
    stdio: 'inherit',
    shell: true
});

// spawn('npx electron electron-launcher.cjs', {
//     stdio: 'inherit',
//     shell: true,
// })

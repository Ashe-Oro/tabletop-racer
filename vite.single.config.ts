import { readFileSync, readdirSync } from 'node:fs'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const embeddedAssetsId = 'virtual:tabletop-racer-assets'
const assetRoot = new URL('./public/assets/', import.meta.url)

function pngDataUrl(path: string): string {
  return `data:image/png;base64,${readFileSync(new URL(path, assetRoot)).toString('base64')}`
}

export default defineConfig({
  publicDir: false,
  resolve: {
    alias: { './asset-source': embeddedAssetsId },
  },
  build: {
    outDir: 'dist-single',
    modulePreload: false,
  },
  plugins: [
    {
      name: 'embed-tabletop-racer-assets',
      resolveId(id) {
        if (id === embeddedAssetsId) return `\0${embeddedAssetsId}`
      },
      load(id) {
        if (id !== `\0${embeddedAssetsId}`) return

        const manifest = JSON.parse(readFileSync(new URL('manifest.json', assetRoot), 'utf8'))
        const slices = Object.fromEntries(readdirSync(new URL('slices/', assetRoot))
          .filter(name => name.endsWith('.png'))
          .sort()
          .map(name => [name.slice(0, -4), pngDataUrl(`slices/${name}`)]))
        const ground = Object.fromEntries(Object.values(manifest.ground ?? {})
          .map(name => [name, pngDataUrl(name as string)]))

        return `
          const slices = ${JSON.stringify(slices)}
          const ground = ${JSON.stringify(ground)}
          export async function loadManifest() { return ${JSON.stringify(manifest)} }
          export function sliceUrl(id) {
            if (!Object.hasOwn(slices, id)) throw new Error('Missing embedded sprite: ' + id)
            return slices[id]
          }
          export const tableTileUrl = ${JSON.stringify(pngDataUrl('table_wood_tile.png'))}
          export function groundUrl(name) {
            if (!Object.hasOwn(ground, name)) throw new Error('Missing embedded ground tile: ' + name)
            return ground[name]
          }
        `
      },
    },
    viteSingleFile({ outputFileName: 'tabletop-racer.html' }),
  ],
})

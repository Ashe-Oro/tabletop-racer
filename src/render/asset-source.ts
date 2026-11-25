const base = `${import.meta.env.BASE_URL}assets/`

export async function loadManifest(): Promise<unknown> {
  const result = await fetch(`${base}manifest.json`, { cache: 'no-cache' })
  if (!result.ok) throw new Error(`Asset manifest request returned ${result.status}`)
  return result.json()
}

export function sliceUrl(id: string): string {
  return `${base}slices/${id}.png`
}

export const tableTileUrl = `${base}table_wood_tile.png`

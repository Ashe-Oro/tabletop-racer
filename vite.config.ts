import { defineConfig } from 'vite'
import { versionDefine } from './vite.version.ts'

export default defineConfig({ define: versionDefine })

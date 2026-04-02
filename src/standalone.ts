/**
 * Standalone entry point for <script> tag usage.
 * Exposes `window.AsciiScene` global.
 *
 * Usage:
 *   <script src="https://unpkg.com/ascii-scene"></script>
 *   <script>
 *     AsciiScene.create('#bg', { model: '/model.glb', color: '#e6b828' })
 *   </script>
 */
import { createAsciiScene } from './ascii-scene'
import { createAsciiRenderer } from './ascii-renderer'

const AsciiScene = {
  create: createAsciiScene,
  createRenderer: createAsciiRenderer,
}

// Expose as global
;(window as any).AsciiScene = AsciiScene

export { AsciiScene }

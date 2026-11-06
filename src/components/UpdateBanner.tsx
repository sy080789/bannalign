import { useRegisterSW } from 'virtual:pwa-register/react'

/** iOS keeps installed web apps on old versions; this makes updates visible and one tap. */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Check for a new version whenever the app comes back to the foreground.
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && reg?.update())
    },
  })
  if (!needRefresh) return null
  return (
    <button className="update-banner" onClick={() => updateServiceWorker(true)}>
      A new version is ready. Tap to update.
    </button>
  )
}

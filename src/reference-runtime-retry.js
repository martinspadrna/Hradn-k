/* Hradník — retry reference shell after the async app render. */
(() => {
  let retried = false
  const boot = () => {
    if (retried) return
    const app = document.querySelector('#app')
    const nav = app?.querySelector('main.redesign-main > .nav, main > .nav, .nav')
    const header = app?.querySelector('header')
    if (!app || !nav || !header) return
    retried = true
    import(`/src/reference-force-shell.js?retry=${Date.now()}`)
  }
  const observer = new MutationObserver(boot)
  const start = () => {
    const app = document.querySelector('#app')
    if (!app) return
    observer.observe(app, { childList: true, subtree: true })
    boot()
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()

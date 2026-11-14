import { Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import HomePage from './pages/HomePage'
import TikTokPatcherPage from './pages/TikTokPatcherPage'
import VKIntoxPage from './pages/VKIntoxPage'
import VKIntoxDocsPage from './pages/VKIntoxDocsPage'
import RoselinePage from './pages/RoselinePage'
import BlogPage from './pages/BlogPage'
import RedirectModal from './components/RedirectModal'
import SnowOverlay from './components/SnowOverlay'

function App() {
  const location = useLocation()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [redirect, setRedirect] = useState<{ destination: string; url: string } | null>(null)
  const previousPathRef = useRef(location.pathname)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.dataset.noRedirect === 'true') return
      const href = anchor.getAttribute('href') || ''
      if (!/^https?:\/\//i.test(href)) return
      event.preventDefault()
      let destination = href
      try {
        destination = new URL(href).hostname.replace(/^www\./, '')
      } catch { /* keep the raw href */ }
      setRedirect({ destination, url: href })
    }

    document.addEventListener('click', intercept, true)
    return () => document.removeEventListener('click', intercept, true)
  }, [])

  useEffect(() => {
    const currentPath = location.pathname
    const previousPath = previousPathRef.current

    if (isFirstRender.current) {
      isFirstRender.current = false
      previousPathRef.current = currentPath
      return
    }

    const routeDepth: Record<string, number> = {
      '/': 0,
      '/tiktok-patcher': 1,
      '/vkintox': 1,
      '/vkintox/docs': 2,
      '/roseline': 1,
      '/blog': 1,
    }

    const currentDepth = routeDepth[currentPath] ?? 1
    const previousDepth = routeDepth[previousPath] ?? 0

    setDirection(currentDepth >= previousDepth ? 'forward' : 'backward')
    setIsTransitioning(true)

    const timer = setTimeout(() => {
      setIsTransitioning(false)
    }, 400)

    previousPathRef.current = currentPath
    return () => clearTimeout(timer)
  }, [location.pathname])

  return (
    <>
      <div key={location.pathname} className={`page-wrapper ${isTransitioning ? 'transitioning' : ''} ${direction}`}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tiktok-patcher" element={<TikTokPatcherPage />} />
          <Route path="/vkintox" element={<VKIntoxPage />} />
          <Route path="/vkintox/docs" element={<VKIntoxDocsPage />} />
          <Route path="/roseline" element={<RoselinePage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPage />} />
        </Routes>
      </div>

      <SnowOverlay />

      {redirect && (
        <RedirectModal
          isOpen
          onClose={() => setRedirect(null)}
          destination={redirect.destination}
          url={redirect.url}
        />
      )}
    </>
  )
}

export default App

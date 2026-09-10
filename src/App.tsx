import { Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import HomePage from './pages/HomePage'
import TikTokPatcherPage from './pages/TikTokPatcherPage'
import AboutMePage from './pages/AboutMePage'

function App() {
  const location = useLocation()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const previousPathRef = useRef(location.pathname)
  const isFirstRender = useRef(true)
  
  useEffect(() => {
    const currentPath = location.pathname
    const previousPath = previousPathRef.current
    
    // Skip transition on initial page load
    if (isFirstRender.current) {
      isFirstRender.current = false
      previousPathRef.current = currentPath
      return
    }
    
    // Determine direction based on route depth
    const routeDepth: Record<string, number> = {
      '/': 0,
      '/tiktok-patcher': 1,
      '/about-me': 1,
    }
    
    const currentDepth = routeDepth[currentPath] ?? 0
    const previousDepth = routeDepth[previousPath] ?? 0
    
    // Set direction
    setDirection(currentDepth >= previousDepth ? 'forward' : 'backward')
    
    // When location changes, start transition
    setIsTransitioning(true)
    
    // After transition completes (400ms), wait 2s then fade in light leaks
    const timer = setTimeout(() => {
      setIsTransitioning(false)
    }, 400)
    
    // Update previous path
    previousPathRef.current = currentPath
    
    return () => clearTimeout(timer)
  }, [location.pathname])
  
  return (
    <div key={location.pathname} className={`page-wrapper ${isTransitioning ? 'transitioning' : ''} ${direction}`}>
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tiktok-patcher" element={<TikTokPatcherPage />} />
        <Route path="/about-me" element={<AboutMePage />} />
      </Routes>
    </div>
  )
}

export default App

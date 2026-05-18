import { useState, useCallback } from 'react'

export type TransitionState = 'idle' | 'zooming-out' | 'zooming-in'

export function useLayerTransition() {
  const [transitionState, setTransitionState] = useState<TransitionState>('idle')

  const triggerTransition = useCallback((onSwap: () => void) => {
    // 1. Zoom out current layer
    setTransitionState('zooming-out')

    setTimeout(() => {
      // 2. Swap data to new layer
      onSwap()
      setTransitionState('zooming-in')

      // 3. One frame later: animate back to idle (scale-100 opacity-100)
      setTimeout(() => {
        setTransitionState('idle')
      }, 16)
    }, 300)
  }, [])

  const transitionClass = {
    idle: 'opacity-100 scale-100',
    'zooming-out': 'opacity-0 scale-110',
    'zooming-in': 'opacity-0 scale-95',
  }[transitionState]

  return { transitionState, transitionClass, triggerTransition }
}

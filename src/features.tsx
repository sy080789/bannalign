import type { ReactNode } from 'react'
import { Icon } from './components/Icon'

/** The app's areas. Adding one later = a folder under src/features + one line here. */
export interface Feature {
  path: string
  label: string
  icon: ReactNode
  ready: boolean
}

export const FEATURES: Feature[] = [
  { path: '/', label: 'Today', icon: <Icon name="sun" />, ready: true },
  { path: '/lists', label: 'Lists', icon: <Icon name="list" />, ready: true },
  { path: '/recipes', label: 'Recipes', icon: <Icon name="bowl" />, ready: true },
  { path: '/house', label: 'House', icon: <Icon name="house" />, ready: false },
  { path: '/plants', label: 'Plants', icon: <Icon name="leaf" />, ready: false },
]

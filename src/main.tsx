import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import './settings.css'
import './keyflow.css'
import './pixel-ui.css'
import './overview.css'
import './leaderboard.css'
import './scrollbar.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)

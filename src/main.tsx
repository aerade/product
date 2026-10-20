import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'
import './keyflow.css'
import './pixel-ui.css'
import './overview.css'
import './leaderboard.css'
import './practice.css'
import './scrollbar.css'
import './progress.css'

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)

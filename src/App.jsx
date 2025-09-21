import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import HangmanGame from './HangmanGame'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
<HangmanGame/>
    </>
  )
}

export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Module1 from './pages/Module1'
import Module2 from './pages/Module2';
import Module3 from './pages/Module3';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module/1" element={<Module1 />} />
        <Route path="/module/2" element={<Module2 />} />
        <Route path="/module/3" element={<Module3 />} />
        // At the top
import { useProgress } from '../hooks/useProgress'

// Inside your component
const { progress, markComplete } = useProgress(userId)

// Temporary test button — delete it after testing!
<button onClick={() => markComplete(1)}>
  Test markComplete(1)
</button>
      </Routes>
    </BrowserRouter>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Module1 from './pages/Module1'
import Module2 from './pages/Module2';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module/1" element={<Module1 />} />
        <Route path="/module/2" element={<Module2 />} />
      </Routes>
    </BrowserRouter>
  )
}

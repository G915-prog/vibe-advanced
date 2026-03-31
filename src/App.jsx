import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Module1 from './pages/Module1'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module/1" element={<Module1 />} />
      </Routes>
    </BrowserRouter>
  )
}

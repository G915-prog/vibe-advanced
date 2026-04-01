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
      </Routes>
    </BrowserRouter>
  )
}

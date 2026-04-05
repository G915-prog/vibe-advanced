import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Module1 from './pages/Module1'
import Module2 from './pages/Module2'
import Module3 from './pages/Module3'
import Module4 from './pages/Module4'
import Module5 from './pages/Module5'
import Module6 from './pages/Module6'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/module/1" element={<ProtectedRoute><Module1 /></ProtectedRoute>} />
          <Route path="/module/2" element={<ProtectedRoute><Module2 /></ProtectedRoute>} />
          <Route path="/module/3" element={<ProtectedRoute><Module3 /></ProtectedRoute>} />
          <Route path="/module/4" element={<ProtectedRoute><Module4 /></ProtectedRoute>} />
          <Route path="/module/5" element={<ProtectedRoute><Module5 /></ProtectedRoute>} />
          <Route path="/module/6" element={<ProtectedRoute><Module6 /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

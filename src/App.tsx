import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { CareerPage } from './pages/Career'
import { FinancesPage } from './pages/Finances'
import { HabitDetail } from './pages/HabitDetail'
import { LogPage } from './pages/Log'
import { NotesPage } from './pages/Notes'
import { Overview } from './pages/Overview'
import { ReadingPage } from './pages/Reading'
import { RelationshipsPage } from './pages/Relationships'
import { SettingsPage } from './pages/Settings'
import { WheelPage } from './pages/Wheel'
import { StoreProvider } from './store'

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/log" element={<LogPage />} />
          <Route path="/habit/:id" element={<HabitDetail />} />
          <Route path="/wheel" element={<WheelPage />} />
          <Route path="/reading" element={<ReadingPage />} />
          <Route path="/relationships" element={<RelationshipsPage />} />
          <Route path="/career" element={<CareerPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/finances" element={<FinancesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Overview />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  )
}

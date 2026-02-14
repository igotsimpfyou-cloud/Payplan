import BillPayPlanner from './BillPayPlanner.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import Toast from './components/ui/Toast.jsx'

export default function App() {
  return (
    <ToastProvider>
      <div className="min-h-screen pb-[env(safe-area-inset-bottom)]">
        <BillPayPlanner />
        <Toast />
      </div>
    </ToastProvider>
  )
}

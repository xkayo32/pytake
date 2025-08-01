import { Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">PyTake</h1>
        </div>
        <nav className="mt-6">
          <div className="px-6 space-y-2">
            <a href="/dashboard" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
              Dashboard
            </a>
            <a href="/conversations" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
              Conversas
            </a>
            <a href="/analytics" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
              Analytics
            </a>
            <a href="/settings" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
              Configurações
            </a>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
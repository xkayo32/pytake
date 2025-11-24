import { Link } from 'react-router-dom'
import { Button } from '@components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">PyTake</h1>
          <div className="space-x-4">
            <Link to="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link to="/register">
              <Button>Registrar</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold mb-4">Automação de Fluxos WhatsApp</h2>
        <p className="text-xl text-slate-600 mb-8">
          PyTake é a plataforma completa para automatizar seus fluxos de WhatsApp com IA.
        </p>
        <Link to="/register">
          <Button size="lg">Começar Agora</Button>
        </Link>
      </div>
    </div>
  )
}

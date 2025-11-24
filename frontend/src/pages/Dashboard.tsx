import { useAuth } from '@lib/auth/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-slate-600">Bem-vindo, {user?.name}!</p>
    </div>
  )
}

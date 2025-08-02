import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/slices/authSlice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Minimal Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 mb-4">
            <div className="w-5 h-5 bg-primary rounded-sm"></div>
          </div>
          <h1 className="text-2xl font-medium text-foreground mb-2">PyTake</h1>
          <p className="text-sm text-muted-foreground">Entre com sua conta</p>
        </div>

        {/* Clean Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11"
            />
          </div>
          
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full h-11" 
            disabled={isLoading}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            WhatsApp Business Integration Platform
          </p>
        </div>
      </div>
    </div>
  )
}
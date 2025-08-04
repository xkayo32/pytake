import { motion } from 'framer-motion'
import { ShieldOff, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function AccessDenied() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/10 rounded-full mb-4">
            <ShieldOff className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          className="space-y-4"
        >
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          <Button
            onClick={() => navigate('/app/dashboard')}
            className="w-full"
          >
            Ir para o Dashboard
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="mt-8 text-sm text-muted-foreground"
        >
          Se você acredita que deveria ter acesso a esta página, 
          entre em contato com o administrador.
        </motion.p>
      </motion.div>
    </div>
  )
}
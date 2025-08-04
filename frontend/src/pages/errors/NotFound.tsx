import { motion } from 'framer-motion'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFound() {
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-4">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-xl text-muted-foreground">
            Página não encontrada
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-muted-foreground mb-8"
        >
          A página que você está procurando não existe ou foi movida.
        </motion.p>

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
            onClick={() => navigate('/')}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Ir para o Início
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          className="mt-12 text-xs text-muted-foreground"
        >
          PyChat - Intelligent Business Messaging
        </motion.div>
      </motion.div>
    </div>
  )
}
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-card p-8 rounded-lg border border-border/50 shadow-lg"
      >
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="h-8 w-8 text-primary" />
          </motion.div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground">Carregando</h3>
            <p className="text-sm text-muted-foreground mt-1">Por favor, aguarde...</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
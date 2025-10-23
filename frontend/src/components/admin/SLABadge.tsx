'use client';

import { useMemo } from 'react';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SLABadgeProps {
  queuedAt: string | Date;
  slaMinutes?: number | null;
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface SLAStatus {
  percentage: number; // 0-100, quanto menor mais crítico
  minutesRemaining: number; // Pode ser negativo se violado
  status: 'safe' | 'warning' | 'critical' | 'violated' | 'no-sla';
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  text: string;
}

export function SLABadge({
  queuedAt,
  slaMinutes,
  className = '',
  showIcon = true,
  showText = true,
  size = 'md',
}: SLABadgeProps) {
  const slaStatus = useMemo((): SLAStatus => {
    // Se não há SLA definido
    if (!slaMinutes || slaMinutes <= 0) {
      return {
        percentage: 100,
        minutesRemaining: 0,
        status: 'no-sla',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        borderColor: 'border-gray-300 dark:border-gray-700',
        icon: Clock,
        text: 'Sem SLA',
      };
    }

    // Calcular tempo decorrido
    const queuedTime = new Date(queuedAt).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - queuedTime) / 1000 / 60);
    const minutesRemaining = slaMinutes - elapsedMinutes;
    const percentage = Math.max(0, (minutesRemaining / slaMinutes) * 100);

    // SLA violado (tempo esgotado)
    if (minutesRemaining <= 0) {
      const minutesOverdue = Math.abs(minutesRemaining);
      return {
        percentage: 0,
        minutesRemaining,
        status: 'violated',
        color: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-400 dark:border-red-600',
        icon: XCircle,
        text: minutesOverdue === 0 
          ? 'SLA violado agora'
          : minutesOverdue === 1
          ? 'SLA violado há 1min'
          : minutesOverdue < 60
          ? `SLA violado há ${minutesOverdue}min`
          : `SLA violado há ${Math.floor(minutesOverdue / 60)}h${minutesOverdue % 60 > 0 ? minutesOverdue % 60 + 'min' : ''}`,
      };
    }

    // Crítico: menos de 20% do tempo ou menos de 5 minutos
    if (percentage < 20 || minutesRemaining < 5) {
      return {
        percentage,
        minutesRemaining,
        status: 'critical',
        color: 'text-orange-700 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        borderColor: 'border-orange-400 dark:border-orange-600',
        icon: AlertTriangle,
        text: minutesRemaining === 1 
          ? '⚠️ 1min restante!' 
          : `⚠️ ${minutesRemaining}min restantes!`,
      };
    }

    // Atenção: entre 20% e 50% do tempo
    if (percentage < 50) {
      return {
        percentage,
        minutesRemaining,
        status: 'warning',
        color: 'text-yellow-700 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        borderColor: 'border-yellow-400 dark:border-yellow-600',
        icon: Clock,
        text: minutesRemaining < 60
          ? `${minutesRemaining}min restantes`
          : `${Math.floor(minutesRemaining / 60)}h ${minutesRemaining % 60}min`,
      };
    }

    // Seguro: mais de 50% do tempo
    return {
      percentage,
      minutesRemaining,
      status: 'safe',
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-400 dark:border-green-600',
      icon: CheckCircle,
      text: minutesRemaining < 60
        ? `${minutesRemaining}min`
        : `${Math.floor(minutesRemaining / 60)}h ${minutesRemaining % 60}min`,
    };
  }, [queuedAt, slaMinutes]);

  // Se não deve exibir nada (sem SLA e sem texto)
  if (slaStatus.status === 'no-sla' && !showText) {
    return null;
  }

  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1',
      icon: 'w-3 h-3',
      text: 'text-xs',
    },
    md: {
      container: 'px-2.5 py-1 text-sm gap-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm',
    },
    lg: {
      container: 'px-3 py-1.5 text-base gap-2',
      icon: 'w-5 h-5',
      text: 'text-base',
    },
  };

  const Icon = slaStatus.icon;
  const classes = sizeClasses[size];

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium border ${slaStatus.color} ${slaStatus.bgColor} ${slaStatus.borderColor} ${classes.container} ${className}`}
      title={`SLA: ${slaMinutes ? slaMinutes + ' minutos' : 'Não definido'} | Tempo na fila: ${Math.floor((Date.now() - new Date(queuedAt).getTime()) / 1000 / 60)} minutos`}
    >
      {showIcon && <Icon className={classes.icon} />}
      {showText && <span className={classes.text}>{slaStatus.text}</span>}
      
      {/* Animação pulsante para estados críticos */}
      {(slaStatus.status === 'critical' || slaStatus.status === 'violated') && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            slaStatus.status === 'violated' ? 'bg-red-500' : 'bg-orange-500'
          }`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${
            slaStatus.status === 'violated' ? 'bg-red-600' : 'bg-orange-600'
          }`}></span>
        </span>
      )}
    </div>
  );
}

// Componente auxiliar: Barra de progresso do SLA
interface SLAProgressBarProps {
  queuedAt: string | Date;
  slaMinutes?: number | null;
  className?: string;
}

export function SLAProgressBar({
  queuedAt,
  slaMinutes,
  className = '',
}: SLAProgressBarProps) {
  const progress = useMemo(() => {
    if (!slaMinutes || slaMinutes <= 0) return 100;

    const queuedTime = new Date(queuedAt).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - queuedTime) / 1000 / 60);
    const percentage = Math.max(0, Math.min(100, ((slaMinutes - elapsedMinutes) / slaMinutes) * 100));
    
    return percentage;
  }, [queuedAt, slaMinutes]);

  if (!slaMinutes) return null;

  const getColor = () => {
    if (progress === 0) return 'bg-red-500';
    if (progress < 20) return 'bg-orange-500';
    if (progress < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className={`h-full ${getColor()} transition-all duration-1000 ease-linear`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

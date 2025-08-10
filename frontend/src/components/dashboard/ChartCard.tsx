import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: DataPoint[];
  type: 'line' | 'bar' | 'doughnut' | 'area';
  height?: number;
  color?: string;
  loading?: boolean;
  className?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  data,
  type,
  height = 300,
  color = '#3b82f6',
  loading = false,
  className = ''
}) => {
  const { actualTheme } = useTheme();

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const maxValue = Math.max(...data.map(d => d.value));
    return data.map(d => ({
      ...d,
      normalizedValue: (d.value / maxValue) * 100
    }));
  }, [data]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const barVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: (i: number) => ({
      height: 'var(--bar-height)',
      opacity: 1,
      transition: { 
        duration: 0.8, 
        delay: i * 0.1,
        type: "spring",
        stiffness: 100
      }
    })
  };

  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 1.5, ease: "easeInOut" }
    }
  };

  const renderLineChart = () => {
    if (processedData.length < 2) return null;

    const padding = 40;
    const chartWidth = 400;
    const chartHeight = height - 80;
    
    const points = processedData.map((d, i) => {
      const x = padding + (i * (chartWidth - 2 * padding)) / (processedData.length - 1);
      const y = padding + (chartHeight - 2 * padding) * (1 - d.normalizedValue / 100);
      return `${x},${y}`;
    }).join(' ');

    const pathData = processedData.reduce((path, d, i) => {
      const x = padding + (i * (chartWidth - 2 * padding)) / (processedData.length - 1);
      const y = padding + (chartHeight - 2 * padding) * (1 - d.normalizedValue / 100);
      return i === 0 ? `M${x},${y}` : `${path} L${x},${y}`;
    }, '');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${chartWidth} ${height}`}>
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Grid Lines */}
        {[...Array(5)].map((_, i) => (
          <line
            key={i}
            x1={padding}
            y1={padding + (i * (chartHeight - 2 * padding)) / 4}
            x2={chartWidth - padding}
            y2={padding + (i * (chartHeight - 2 * padding)) / 4}
            stroke={actualTheme === 'dark' ? '#374151' : '#e5e7eb'}
            strokeWidth="1"
            opacity="0.5"
          />
        ))}

        {/* Area Fill */}
        <motion.path
          variants={lineVariants}
          initial="hidden"
          animate="visible"
          d={`${pathData} L${chartWidth - padding},${chartHeight - padding} L${padding},${chartHeight - padding} Z`}
          fill="url(#lineGradient)"
        />

        {/* Line */}
        <motion.path
          variants={lineVariants}
          initial="hidden"
          animate="visible"
          d={pathData}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data Points */}
        {processedData.map((d, i) => {
          const x = padding + (i * (chartWidth - 2 * padding)) / (processedData.length - 1);
          const y = padding + (chartHeight - 2 * padding) * (1 - d.normalizedValue / 100);
          
          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 + 0.5, duration: 0.3 }}
              whileHover={{ scale: 1.5 }}
            />
          );
        })}

        {/* Labels */}
        {processedData.map((d, i) => {
          const x = padding + (i * (chartWidth - 2 * padding)) / (processedData.length - 1);
          return (
            <text
              key={i}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill={actualTheme === 'dark' ? '#9ca3af' : '#6b7280'}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    );
  };

  const renderBarChart = () => {
    const barWidth = 40;
    const spacing = 20;
    const chartWidth = processedData.length * (barWidth + spacing);
    const chartHeight = height - 60;

    return (
      <div className="flex items-end justify-center space-x-4 px-4" style={{ height }}>
        {processedData.map((d, i) => (
          <div key={i} className="flex flex-col items-center">
            <motion.div
              custom={i}
              variants={barVariants}
              initial="hidden"
              animate="visible"
              className="relative rounded-t-lg"
              style={{
                width: barWidth,
                backgroundColor: d.color || color,
                '--bar-height': `${(d.normalizedValue / 100) * chartHeight}px`
              } as React.CSSProperties}
              whileHover={{ scale: 1.05 }}
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {d.value}
              </div>
            </motion.div>
            
            <div className="mt-2 text-xs text-center text-gray-600 dark:text-gray-400 max-w-16 truncate">
              {d.label}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDoughnutChart = () => {
    const centerX = 150;
    const centerY = 150;
    const radius = 80;
    const innerRadius = 50;
    
    const total = processedData.reduce((sum, d) => sum + d.value, 0);
    let currentAngle = -90;

    const createArcPath = (startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) => {
      const start = polarToCartesian(centerX, centerY, outerRadius, endAngle);
      const end = polarToCartesian(centerX, centerY, outerRadius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      
      const outerArc = `M ${start.x} ${start.y} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
      const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
      const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
      const innerArc = `L ${innerEnd.x} ${innerEnd.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`;
      
      return `${outerArc} ${innerArc} Z`;
    };

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    };

    return (
      <div className="flex items-center justify-center">
        <svg width={300} height={300}>
          {processedData.map((d, i) => {
            const angle = (d.value / total) * 360;
            const pathData = createArcPath(currentAngle, currentAngle + angle, radius, innerRadius);
            const textAngle = currentAngle + angle / 2;
            const textRadius = (radius + innerRadius) / 2;
            const textPos = polarToCartesian(centerX, centerY, textRadius, textAngle);
            
            currentAngle += angle;

            return (
              <g key={i}>
                <motion.path
                  d={pathData}
                  fill={d.color || `hsl(${i * 45}, 70%, 60%)`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  whileHover={{ scale: 1.05 }}
                />
                <text
                  x={textPos.x}
                  y={textPos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="12"
                  fontWeight="bold"
                  fill="white"
                >
                  {Math.round((d.value / total) * 100)}%
                </text>
              </g>
            );
          })}
          
          {/* Center Text */}
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="24"
            fontWeight="bold"
            fill={actualTheme === 'dark' ? '#f3f4f6' : '#1f2937'}
          >
            {total.toLocaleString()}
          </text>
        </svg>
      </div>
    );
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      );
    }

    switch (type) {
      case 'line':
      case 'area':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'doughnut':
        return renderDoughnutChart();
      default:
        return renderLineChart();
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className={`
        p-6 rounded-2xl border
        ${actualTheme === 'dark'
          ? 'bg-gray-800/50 border-gray-700 backdrop-blur-sm'
          : 'bg-white/80 border-gray-200 backdrop-blur-sm'
        }
        shadow-lg ${className}
      `}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        {renderChart()}
      </div>

      {/* Legend for Doughnut Chart */}
      {type === 'doughnut' && !loading && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {processedData.map((d, i) => (
            <div key={i} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: d.color || `hsl(${i * 45}, 70%, 60%)` }}
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ChartCard;
'use client';

import { useState, useEffect } from 'react';
import { ListTodo, Building2, ChevronDown } from 'lucide-react';
import { departmentsAPI, queuesAPI } from '@/lib/api';
import type { Department } from '@/types/department';
import type { Queue } from '@/types/queue';

interface QueueSelectorProps {
  selectedDepartmentId?: string | null;
  selectedQueueId?: string | null;
  onDepartmentChange: (departmentId: string | null) => void;
  onQueueChange: (queueId: string | null) => void;
  showAllOption?: boolean;
  className?: string;
}

export function QueueSelector({
  selectedDepartmentId,
  selectedQueueId,
  onDepartmentChange,
  onQueueChange,
  showAllOption = true,
  className = '',
}: QueueSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [filteredQueues, setFilteredQueues] = useState<Queue[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingQueues, setIsLoadingQueues] = useState(false);

  useEffect(() => {
    fetchDepartments();
    fetchQueues();
  }, []);

  useEffect(() => {
    // Filter queues by selected department
    if (selectedDepartmentId) {
      setFilteredQueues(queues.filter(q => q.department_id === selectedDepartmentId));
    } else {
      setFilteredQueues(queues);
    }
  }, [selectedDepartmentId, queues]);

  const fetchDepartments = async () => {
    try {
      setIsLoadingDepartments(true);
      const response = await departmentsAPI.list({ is_active: true });
      setDepartments(response.data);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  const fetchQueues = async () => {
    try {
      setIsLoadingQueues(true);
      const response = await queuesAPI.list({ is_active: true, limit: 100 });
      setQueues(response.data);
    } catch (error) {
      console.error('Erro ao carregar filas:', error);
    } finally {
      setIsLoadingQueues(false);
    }
  };

  const handleDepartmentChange = (value: string) => {
    const newDepartmentId = value === 'all' ? null : value;
    onDepartmentChange(newDepartmentId);
    
    // Reset queue selection when department changes
    if (newDepartmentId !== selectedDepartmentId) {
      onQueueChange(null);
    }
  };

  const handleQueueChange = (value: string) => {
    const newQueueId = value === 'all' ? null : value;
    onQueueChange(newQueueId);
  };

  const selectedDepartment = departments.find(d => d.id === selectedDepartmentId);
  const selectedQueue = queues.find(q => q.id === selectedQueueId);

  const getIconEmoji = (icon?: string) => {
    const iconMap: Record<string, string> = {
      users: '👥',
      headset: '🎧',
      shopping: '🛍️',
      tools: '🔧',
      money: '💰',
      chart: '📊',
      shield: '🛡️',
      star: '⭐',
      zap: '⚡',
      clock: '⏰',
      fire: '🔥',
      trophy: '🏆',
      rocket: '🚀',
    };
    return iconMap[icon || 'users'] || '📋';
  };

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      {/* Department Selector */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Departamento
        </label>
        <div className="relative">
          <select
            value={selectedDepartmentId || 'all'}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            disabled={isLoadingDepartments}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showAllOption && (
              <option value="all">Todos os departamentos</option>
            )}
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {getIconEmoji(dept.icon)} {dept.name}
              </option>
            ))}
          </select>
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        
        {/* Selected Department Badge */}
        {selectedDepartment && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: selectedDepartment.color + '20',
              color: selectedDepartment.color,
            }}
          >
            <span>{getIconEmoji(selectedDepartment.icon)}</span>
            <span>{selectedDepartment.name}</span>
          </div>
        )}
      </div>

      {/* Queue Selector */}
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Fila
        </label>
        <div className="relative">
          <select
            value={selectedQueueId || 'all'}
            onChange={(e) => handleQueueChange(e.target.value)}
            disabled={isLoadingQueues || filteredQueues.length === 0}
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showAllOption && (
              <option value="all">
                {selectedDepartmentId ? 'Todas as filas' : 'Selecione um departamento'}
              </option>
            )}
            {filteredQueues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {getIconEmoji(queue.icon)} {queue.name} {queue.priority >= 75 ? '⚡' : ''}
              </option>
            ))}
          </select>
          <ListTodo className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Selected Queue Badge */}
        {selectedQueue && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: selectedQueue.color + '20',
              color: selectedQueue.color,
            }}
          >
            <span>{getIconEmoji(selectedQueue.icon)}</span>
            <span>{selectedQueue.name}</span>
            {selectedQueue.priority >= 75 && <span>⚡</span>}
          </div>
        )}
      </div>

      {/* Queue Count */}
      {(selectedDepartmentId || selectedQueueId) && (
        <div className="flex items-end">
          <div className="px-3 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-center min-w-[80px]">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">Na fila</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {selectedQueue?.queued_conversations || 
               (selectedDepartment?.queued_conversations || 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

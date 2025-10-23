'use client';

import React from 'react';
import { Filter } from 'lucide-react';
import { Department } from '@/types/department';

interface AnalyticsFiltersProps {
  departments: Department[];
  selectedDepartmentId: string | null;
  onDepartmentChange: (id: string | null) => void;
  showOnlyActive: boolean;
  onShowOnlyActiveChange: (value: boolean) => void;
}

export default function AnalyticsFilters({
  departments,
  selectedDepartmentId,
  onDepartmentChange,
  showOnlyActive,
  onShowOnlyActiveChange,
}: AnalyticsFiltersProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Filtros:</span>
      </div>

      {/* Department filter */}
      <div className="flex items-center gap-2">
        <label htmlFor="department-filter" className="text-sm text-gray-600">
          Departamento:
        </label>
        <select
          id="department-filter"
          value={selectedDepartmentId || ''}
          onChange={(e) => onDepartmentChange(e.target.value || null)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos os departamentos</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>

      {/* Active only toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="active-only"
          checked={showOnlyActive}
          onChange={(e) => onShowOnlyActiveChange(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="active-only" className="text-sm text-gray-600 cursor-pointer">
          Apenas filas ativas
        </label>
      </div>
    </div>
  );
}

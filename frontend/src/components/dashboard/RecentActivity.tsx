import React from 'react';
import { 
  MessageSquare, 
  UserPlus, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Phone
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Activity {
  id: string;
  type: 'message' | 'contact_added' | 'conversation_resolved' | 'conversation_pending' | 'call' | 'alert';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  contact?: string;
}

interface RecentActivityProps {
  activities?: Activity[];
  loading?: boolean;
  limit?: number;
}


const getActivityIcon = (type: Activity['type']) => {
  const iconClass = "h-4 w-4";
  
  switch (type) {
    case 'message':
      return <MessageSquare className={`${iconClass} text-blue-600`} />;
    case 'contact_added':
      return <UserPlus className={`${iconClass} text-green-600`} />;
    case 'conversation_resolved':
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    case 'conversation_pending':
      return <Clock className={`${iconClass} text-yellow-600`} />;
    case 'call':
      return <Phone className={`${iconClass} text-purple-600`} />;
    case 'alert':
      return <AlertCircle className={`${iconClass} text-red-600`} />;
    default:
      return <MessageSquare className={`${iconClass} text-gray-600`} />;
  }
};

const getActivityColor = (type: Activity['type']) => {
  switch (type) {
    case 'message':
      return 'border-l-blue-500 bg-blue-50';
    case 'contact_added':
      return 'border-l-green-500 bg-green-50';
    case 'conversation_resolved':
      return 'border-l-green-500 bg-green-50';
    case 'conversation_pending':
      return 'border-l-yellow-500 bg-yellow-50';
    case 'call':
      return 'border-l-purple-500 bg-purple-50';
    case 'alert':
      return 'border-l-red-500 bg-red-50';
    default:
      return 'border-l-gray-500 bg-gray-50';
  }
};

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  loading = false,
  limit = 10,
}) => {
  const activityData = activities || [];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Atividade Recente
        </h3>
        <p className="text-sm text-gray-600">
          {activityData.length > 0 ? `Últimas ${activityData.length} atividades do sistema` : 'Nenhuma atividade recente'}
        </p>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activityData.length > 0 ? (
          activityData.map((activity) => (
            <div
              key={activity.id}
              className={`border-l-4 pl-4 py-3 ${getActivityColor(activity.type)} rounded-r-lg`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                    {activity.contact && (
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.contact}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                  {formatDistanceToNow(activity.timestamp, { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">Nenhuma atividade recente</p>
            <p className="text-xs text-gray-400 mt-1">As atividades aparecerão aqui conforme acontecem</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Ver todas as atividades →
        </button>
      </div>
    </div>
  );
};

export default RecentActivity;
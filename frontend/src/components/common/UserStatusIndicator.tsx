'use client';

interface UserStatusIndicatorProps {
  isOnline: boolean;
  className?: string;
  showText?: boolean;
}

export default function UserStatusIndicator({
  isOnline,
  className = '',
  showText = false,
}: UserStatusIndicatorProps) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-green-500' : 'bg-gray-400'
        }`}
        title={isOnline ? 'Online' : 'Offline'}
      />
      {showText && (
        <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
}

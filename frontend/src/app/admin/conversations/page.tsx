'use client';

import AdminConversationsDashboard from '@/components/admin/conversations/AdminConversationsDashboard';

export default function AdminInboxPage() {
  return (
    <div className="h-full flex flex-col -mt-8 -mx-6">
      <AdminConversationsDashboard />
    </div>
  );
}

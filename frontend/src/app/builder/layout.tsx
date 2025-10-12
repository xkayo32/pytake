/**
 * Fullscreen Layout for Chatbot Builder
 * No sidebar, no header - pure builder experience
 */

export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {children}
    </div>
  );
}

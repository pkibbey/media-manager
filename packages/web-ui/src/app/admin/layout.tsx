'use client';
import { Sidebar } from '../../components/sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Sidebar />

        {/* Main Content Area */}
        <div className="md:col-span-3">{children}</div>
      </div>
    </div>
  );
}

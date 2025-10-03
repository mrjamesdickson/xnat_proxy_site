import { Link } from 'react-router-dom';
import {
  Users,
  Settings,
  FileImage,
  Activity,
  Search,
  Mail,
  Zap,
  Server,
  Database,
  Shield
} from 'lucide-react';

const adminSections = [
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage user accounts, roles, and permissions',
    color: 'bg-blue-500',
  },
  {
    title: 'Groups',
    href: '/admin/groups',
    icon: Users,
    description: 'Configure user groups and access control',
    color: 'bg-purple-500',
  },
  {
    title: 'Data Types',
    href: '/admin/data-types',
    icon: FileImage,
    description: 'Manage data type definitions and schemas',
    color: 'bg-green-500',
  },
  {
    title: 'Plugin Settings',
    href: '/admin/plugins',
    icon: Settings,
    description: 'Configure and manage XNAT plugins',
    color: 'bg-orange-500',
  },
  {
    title: 'Event Service',
    href: '/admin/event-service',
    icon: Activity,
    description: 'Monitor and configure event handlers',
    color: 'bg-red-500',
  },
  {
    title: 'XNAT Task Settings',
    href: '/admin/tasks',
    icon: Server,
    description: 'Manage scheduled tasks and automation',
    color: 'bg-indigo-500',
  },
  {
    title: 'Stored Searches',
    href: '/admin/stored-searches',
    icon: Search,
    description: 'Manage saved search queries',
    color: 'bg-teal-500',
  },
  {
    title: 'Automation',
    href: '/admin/automation',
    icon: Zap,
    description: 'Configure automation scripts and workflows',
    color: 'bg-yellow-500',
  },
  {
    title: 'Send Email',
    href: '/admin/email',
    icon: Mail,
    description: 'Send notifications to users and administrators',
    color: 'bg-pink-500',
  },
];

export function SiteAdministration() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 dark:border-slate-700">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Site Administration</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage XNAT system settings, users, data types, and plugins
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              to={section.href}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <div className="flex items-start space-x-4">
                <div className={`rounded-lg ${section.color} p-3 text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {section.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start space-x-4">
          <div className="rounded-lg bg-gray-500 p-3 text-white">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">System Tools</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Quick access to common administrative actions
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                onClick={() => window.location.reload()}
              >
                Reload Display Settings
              </button>
              <button
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                onClick={() => alert('Security settings reload functionality would be implemented here')}
              >
                Reload Security Settings
              </button>
              <button
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                onClick={() => alert('DB cache clear functionality would be implemented here')}
              >
                Clear DB Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

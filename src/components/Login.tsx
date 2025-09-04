import { useState } from 'react';
import type { FormEvent } from 'react';
import { useXnat } from '../contexts/XnatContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export function Login() {
  const { login, isLoading } = useXnat();
  const [formData, setFormData] = useState({
    baseURL: import.meta.env.VITE_DEFAULT_XNAT_URL || 'http://demo02.xnatworks.io',
    username: 'admin',
    password: 'admin',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.baseURL.trim() || !formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.baseURL.trim(), formData.username.trim(), formData.password.trim());
    } catch (err: any) {
      console.error('Login failed:', err);
      
      // Use the enhanced error messages from the API client
      if (err.userMessage) {
        setError(err.userMessage);
      } else if (err.response?.status === 401) {
        setError('Invalid username or password');
      } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
        setError('Cannot connect to XNAT server. Please check the URL and your network connection.');
      } else {
        setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
      }
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <LogIn className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to XNAT
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your XNAT credentials to access the platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="baseURL" className="block text-sm font-medium leading-6 text-gray-900">
                XNAT Server URL
              </label>
              <div className="mt-2">
                <input
                  id="baseURL"
                  name="baseURL"
                  type="url"
                  placeholder="https://your-xnat-server.com"
                  required
                  value={formData.baseURL}
                  onChange={(e) => handleInputChange('baseURL', e.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900">
                Username
              </label>
              <div className="mt-2">
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                Password
              </label>
              <div className="mt-2 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {error}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={clsx(
                  'flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600'
                )}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  Need help?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              {import.meta.env.DEV && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium mb-1">Development Mode</p>
                  <p className="text-xs text-blue-600">
                    Using XNAT demo server: {import.meta.env.VITE_DEFAULT_XNAT_URL}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Demo credentials pre-filled: admin / admin
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    For external servers, ensure CORS is configured to allow requests from http://localhost:5173
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Contact your XNAT administrator if you need access or have trouble signing in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
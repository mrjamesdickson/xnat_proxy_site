import { useState } from 'react';
import type { FormEvent } from 'react';
import { useXnat } from '../contexts/XnatContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

type ApiError = {
  userMessage?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  code?: string;
  message?: string;
};

const isApiError = (value: unknown): value is ApiError => typeof value === 'object' && value !== null;

export function Login() {
  const { login, isLoading } = useXnat();

  // In production (deployed at /morpheus/), use current server origin
  // In dev mode, use env variable or default demo server
  const isProduction = !import.meta.env.DEV;
  const defaultBaseURL = isProduction
    ? window.location.origin
    : (import.meta.env.VITE_DEFAULT_XNAT_URL || 'http://demo02.xnatworks.io');

  const [formData, setFormData] = useState({
    baseURL: defaultBaseURL,
    username: 'admin',
    password: 'admin',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const normalizedBaseUrl = formData.baseURL.replace(/\/+$/, '');
  const registerUrl = `${normalizedBaseUrl}/app/template/Register.vm`;
  const forgotUrl = `${normalizedBaseUrl}/app/template/ForgotLogin.vm`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = {
      baseURL: formData.baseURL.trim(),
      username: formData.username.trim(),
      password: formData.password.trim(),
    };

    if (!trimmed.baseURL || !trimmed.username || !trimmed.password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      await login(trimmed.baseURL, trimmed.username, trimmed.password);
    } catch (err) {
      console.error('Login failed:', err);

      if (isApiError(err)) {
        if (err.userMessage) {
          setError(err.userMessage);
          return;
        }
        if (err.response?.status === 401) {
          setError('Invalid username or password');
          return;
        }
        if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network Error')) {
          setError('Cannot connect to XNAT server. Please check the URL and your network connection.');
          return;
        }
        setError(err.response?.data?.message || err.message || 'Login failed. Please try again.');
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">Sign in to XNAT</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Use your XNAT server credentials (default admin / admin for demo).
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isProduction && (
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
                    autoFocus
                    value={formData.baseURL}
                    onChange={(event) => handleInputChange('baseURL', event.target.value)}
                    disabled={isLoading}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
                  />
                </div>
              </div>
            )}

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
                  autoFocus={isProduction}
                  value={formData.username}
                  onChange={(event) => handleInputChange('username', event.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
                Password
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(event) => handleInputChange('password', event.target.value)}
                  disabled={isLoading}
                  className="block w-full rounded-md border-0 py-1.5 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword((prev) => !prev)}
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
                  <div className="ml-3 text-sm text-red-800">{error}</div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={clsx(
                'flex w-full justify-center rounded-md px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 focus-visible:outline-blue-600'
              )}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-blue-600">
              <a href={registerUrl} target="_blank" rel="noreferrer" className="hover:text-blue-500">
                Register
              </a>
              <a href={forgotUrl} target="_blank" rel="noreferrer" className="hover:text-blue-500">
                Forgot login or password?
              </a>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            Need access? Contact your XNAT administrator or adjust the server URL above.
          </div>
        </div>
      </div>
    </div>
  );
}

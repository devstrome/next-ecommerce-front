'use client'
import { useState } from 'react';
import { useRouter } from "next/navigation";
import { useAdmin } from '../context/AdminContext';

function AdminLoginForm() {
  const [formData, setFormData] = useState({
    emailOrUserName: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const { login, loading, error } = useAdmin();
  const router = useRouter();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.emailOrUserName || !formData.password) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      await login({
        emailOrUserName: formData.emailOrUserName,
        password: formData.password
      });
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setFormError(error.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Admin Sign In</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your credentials to access the dashboard
          </p>
        </div>

        {(error || formError) && (
          <div className="p-4 text-sm text-red-700 bg-red-100 rounded-lg">
            {error || formError}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="emailOrUserName" className="block text-sm font-medium text-gray-700">
                Email or Username
              </label>
              <input
                id="emailOrUserName"
                name="emailOrUserName"
                type="text"
                autoComplete="username"
                required
                value={formData.emailOrUserName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-maybelline-pink focus:border-maybelline-pink"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-maybelline-pink focus:border-maybelline-pink"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-maybelline-pink focus:ring-maybelline-pink border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <a href="#" className="text-sm text-maybelline-pink hover:text-maybelline-pink">
              Forgot password?
            </a>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-maybelline-pink hover:bg-maybelline-magenta focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-maybelline-pink ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLoginForm;
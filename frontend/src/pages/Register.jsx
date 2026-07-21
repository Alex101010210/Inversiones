import { useState } from 'react';
import { useAuthStore } from '../store';
import { authApi } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.register(form);
      setAuth(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <TrendingUp className="w-7 h-7 text-brand-600" />
          <span className="font-bold text-xl text-brand-900">Investment ERP</span>
        </div>

        <h2 className="text-2xl font-bold mb-1">Create your account</h2>
        <p className="text-gray-500 text-sm mb-6">Start tracking your investments</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" type="text" placeholder="John Doe"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min. 8 characters"
              value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} minLength={8} required />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

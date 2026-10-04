import { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Code2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = ({ isAdmin = false }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await api.post('/api/auth/login', { email, password });
            login(data);
            if (data.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col justify-center min-h-screen py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-transparent">
            {/* Ambient subtle light layers */}
            <div className="absolute top-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent opacity-40" />
            <div className="absolute top-10 left-[10%] w-[30%] h-[30%] rounded-full bg-[#ef4444]/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-10 right-[10%] w-[40%] h-[40%] rounded-full bg-[#3b82f6]/10 blur-[150px] pointer-events-none" />

            <Link to="/" className="fixed top-6 left-6 z-50 flex items-center gap-2 px-5 py-2.5 bg-white/40 backdrop-blur-xl border border-white/60 rounded-full text-slate-500 hover:text-[#3b82f6] hover:bg-white/70 transition-all font-bold uppercase tracking-widest text-[10px] shadow-sm hover:shadow-md">
                &larr; Return Hub
            </Link>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="sm:mx-auto sm:w-full sm:max-w-md z-10 relative"
            >
                <div className="flex justify-center text-[#3b82f6]">
                    <div className="relative liquid-drop p-6 bg-white/60 border border-white/80">
                        <Code2 size={48} className="relative z-10 opacity-90" strokeWidth={2.5} />
                    </div>
                </div>
                <h2 className="mt-10 text-center text-4xl font-extrabold text-slate-800 tracking-tight">
                    {isAdmin ? 'Admin Auth Portal' : 'Workspace Login'}
                </h2>
                {isAdmin ? (
                    <p className="mt-3 text-center text-sm text-slate-500 font-medium">
                        Secure access. Need configuration? <Link to="/admin/register" className="font-bold text-[#3b82f6] hover:text-[#2563eb] hover:underline underline-offset-4 transition-all">Provision Identity</Link>
                    </p>
                ) : (
                    <p className="mt-3 text-center text-sm text-slate-500 font-medium">
                        Access control module or <Link to="/register" className="font-bold text-[#3b82f6] hover:text-[#2563eb] hover:underline underline-offset-4 transition-all">Establish Identity</Link>
                    </p>
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10"
            >
                <div className="card px-4 py-8 sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-sm text-red-400 flex items-center"
                            >
                                <p>{error}</p>
                            </motion.div>
                        )}

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-500">Email Address</label>
                            <input
                                id="email" type="email" required className="input-field"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="developer@example.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-slate-500">Password</label>
                            <div className="relative">
                                <input
                                    id="password" type={showPassword ? 'text' : 'password'} required className="input-field pr-12"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#3b82f6] transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="btn-primary w-full flex justify-center items-center py-3 text-sm"
                        >
                            {loading ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Authenticating...
                                </span>
                            ) : (
                                <span className="flex items-center">
                                    Sign In <ArrowRight size={16} className="ml-2" />
                                </span>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

Login.propTypes = {
    isAdmin: PropTypes.bool,
};

export default Login;

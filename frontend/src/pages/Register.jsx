import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Eye, EyeOff, Code2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const Register = ({ isAdmin = false }) => {
    const [teamName, setTeamName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [college, setCollege] = useState('');
    const [skills, setSkills] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);

        try {
            const { data } = await api.post('/api/auth/register', {
                team_name: teamName,
                email,
                password,
                college: isAdmin ? '' : college,
                skills: isAdmin ? [] : skillsArray,
                role: isAdmin ? 'admin' : 'team'
            });
            login(data);
            navigate(isAdmin ? '/admin' : '/dashboard');
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
            <div className="absolute top-10 right-[10%] w-[30%] h-[30%] rounded-full bg-[#ef4444]/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-10 left-[10%] w-[40%] h-[40%] rounded-full bg-[#3b82f6]/10 blur-[150px] pointer-events-none" />

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
                    {isAdmin ? 'Deploy Root Access' : 'Initialize Workspace'}
                </h2>
                {isAdmin ? (
                    <p className="mt-3 text-center text-sm text-slate-500 font-medium">
                        Administration Module. Returning admin? <Link to="/admin/login" className="font-bold text-[#3b82f6] hover:text-[#2563eb] hover:underline underline-offset-4 transition-all">Verify Identity</Link>
                    </p>
                ) : (
                    <p className="mt-3 text-center text-sm text-slate-500 font-medium">
                        Standard deployment process. Or <Link to="/login" className="font-bold text-[#3b82f6] hover:text-[#2563eb] hover:underline underline-offset-4 transition-all">Verify Existing Token</Link>
                    </p>
                )}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, type: "spring", stiffness: 100 }}
                className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10"
            >
                <div className="card px-4 py-8 sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-sm text-red-400"
                            >
                                <p>{error}</p>
                            </motion.div>
                        )}

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="teamName" className="block text-sm font-medium text-slate-500 mb-1">{isAdmin ? 'Admin Name' : 'Team Name'}</label>
                                <input id="teamName" type="text" name="team_name" required className="input-field" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={isAdmin ? "Superuser Name" : "Awsome Coders"} />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="email" className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                                <input id="email" type="email" name="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-500 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    id="password" type={showPassword ? "text" : "password"} required className="input-field"
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400 hover:text-[#3b82f6]">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {!isAdmin && (
                            <>
                                <div className="space-y-1">
                                    <label htmlFor="college" className="block text-sm font-medium text-slate-500 mb-1">Institution / College</label>
                                    <input id="college" type="text" name="college" className="input-field" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="University of Technology" />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="skills" className="block text-sm font-medium text-slate-500 mb-1">Skills <span className="text-slate-400 text-xs font-normal">(comma separated)</span></label>
                                    <input id="skills" type="text" name="skills" className="input-field" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Python, AWS" />
                                </div>
                            </>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center py-3 text-sm mt-8">
                            {loading ? 'Setting up environment...' : <span className="flex items-center">{isAdmin ? 'Setup Admin Profile' : 'Create Team Profile'} <ArrowRight size={16} className="ml-2" /></span>}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

Register.propTypes = {
    isAdmin: PropTypes.bool
};

export default Register;

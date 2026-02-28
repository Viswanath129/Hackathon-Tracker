import { useState, useEffect, useContext, useMemo } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Users, LayoutDashboard, Target, CheckCircle2, Code2, LogOut, BarChart3, TrendingUp, Clock, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import Loader from '../components/Loader';
import Leaderboard from '../components/Leaderboard';

const AdminDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [metrics, setMetrics] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const [metricsRes, activitiesRes] = await Promise.all([
                    api.get('/api/admin/analytics', config),
                    api.get('/api/admin/activities', config)
                ]);
                setMetrics(metricsRes.data);
                setActivities(activitiesRes.data);
            } catch (err) {
                console.error("error fetching admin data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        const intervalId = setInterval(fetchData, 5000); // 5 sec realtime loop
        return () => clearInterval(intervalId);
    }, [user.token]);

    const statCards = [
        { label: 'Total Teams', value: metrics?.overview?.totalTeams || 0, icon: <Users size={22} className="text-white" />, bg: 'from-[#3b82f6] to-[#6366f1]', shadow: 'shadow-[#3b82f6]/30', linkTo: '/admin/teams', state: { filter: 'All' } },
        { label: 'Hackathons', value: metrics?.overview?.totalHackathons || 0, icon: <LayoutDashboard size={22} className="text-white" />, bg: 'from-[#8b5cf6] to-[#d946ef]', shadow: 'shadow-[#8b5cf6]/30', linkTo: '/admin/teams', state: { filter: 'All' } },
        { label: 'Active Projects', value: metrics?.overview?.activeProjects || 0, icon: <Target size={22} className="text-white" />, bg: 'from-[#f59e0b] to-[#ef4444]', shadow: 'shadow-[#f59e0b]/30', linkTo: '/admin/teams', state: { filter: 'Development' } },
        { label: 'Completed', value: metrics?.overview?.completedProjects || 0, icon: <CheckCircle2 size={22} className="text-white" />, bg: 'from-[#10b981] to-[#06b6d4]', shadow: 'shadow-[#10b981]/30', linkTo: '/admin/teams', state: { filter: 'Completed' } },
    ];

    const pieData = useMemo(() => {
        if (!metrics?.projectStatusDistribution) return [];
        return metrics.projectStatusDistribution.map(item => ({ name: item._id, value: item.count }));
    }, [metrics]);

    const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6'];

    const barData = useMemo(() => {
        if (!metrics?.teamAverageProgress) return [];
        return metrics.teamAverageProgress.map(item => ({ name: item.team_name, progress: item.avg_progress }));
    }, [metrics]);

    const participationData = useMemo(() => {
        if (!metrics?.hackathonParticipation) return [];
        return metrics.hackathonParticipation.map(item => ({ name: item.name, value: item.value }));
    }, [metrics]);

    const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Loader />
            <p className="text-slate-400 text-sm font-medium mt-4 tracking-wider">Loading analytics...</p>
        </div>
    );

    return (
        <div className="min-h-screen pb-16 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60">
            {/* Decorative ambient blobs */}
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06b6d4]" />
            <div className="absolute top-32 right-[5%] w-80 h-80 rounded-full bg-[#8b5cf6]/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-32 left-[5%] w-80 h-80 rounded-full bg-[#3b82f6]/10 blur-[100px] pointer-events-none" />

            {/* Navbar */}
            <nav className="border-b border-white/70 bg-white/60 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] p-2 rounded-xl shadow-lg shadow-[#3b82f6]/30">
                                <Code2 className="text-white" size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-lg font-black tracking-tighter text-slate-800 uppercase">
                                Avanthi Innovation Hub <span className="bg-gradient-to-r from-[#f59e0b] to-[#ef4444] bg-clip-text text-transparent">Admin</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-8 text-sm font-bold h-full">
                            <Link to="/admin" className="text-[#3b82f6] border-b-2 border-[#3b82f6] h-full flex items-center px-1">Overview</Link>
                            <Link to="/admin/teams" className="text-slate-400 hover:text-slate-700 transition-colors h-full flex items-center px-1">Directory</Link>
                            <button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors py-2">
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 relative z-10">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-end border-b border-slate-200/80 pb-6">
                    <div>
                        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06b6d4] tracking-tight">Analytics Dashboard</h2>
                        <p className="text-sm font-medium text-slate-400 mt-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                            Live metrics across all team clusters
                        </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white/60 backdrop-blur px-4 py-2 rounded-xl border border-white/80 shadow-sm text-sm text-slate-500 font-medium">
                        <TrendingUp size={16} className="text-[#3b82f6]" />
                        Real-time
                    </div>
                </motion.div>

                {/* Stat Cards */}
                <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {statCards.map((stat, i) => (
                        <motion.div variants={itemVariants} key={i}>
                            <Link to={stat.linkTo} state={stat.state} className={`block rounded-2xl p-6 bg-gradient-to-br ${stat.bg} shadow-xl ${stat.shadow} text-white hover:scale-105 transition-transform duration-300`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur">{stat.icon}</div>
                                    <div className="h-2.5 w-2.5 rounded-full bg-white/80 shadow-lg animate-pulse" />
                                </div>
                                <p className="text-4xl font-black tracking-tight">{stat.value}</p>
                                <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">{stat.label}</p>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#6366f1] to-[#3b82f6]"></span> Project Status Distribution
                        </h3>
                        <div className="h-72 w-full">
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                                            {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Legend verticalAlign="bottom" align="center" />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <div className="flex items-center justify-center h-full text-slate-300">No data available.</div>}
                        </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#d946ef]"></span> Hackathon Participation
                        </h3>
                        <div className="h-72 w-full">
                            {participationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={participationData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                                        <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: '#94a3b8' }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="url(#barGrad1)" radius={[6, 6, 0, 0]} name="Projects" />
                                        <defs>
                                            <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b5cf6" />
                                                <stop offset="100%" stopColor="#d946ef" />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="flex items-center justify-center h-full text-slate-300">No data.</div>}
                        </div>
                    </motion.div>
                </div>

                {/* Average Progress */}
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-2xl p-6 shadow-sm mb-8">
                    <h3 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={16} className="text-[#10b981]" /> Team Average Build Progress (%)
                    </h3>
                    <div className="h-80 w-full">
                        {barData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
                                    <defs>
                                        <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} angle={-45} textAnchor="end" />
                                    <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="progress" fill="url(#barGrad2)" radius={[6, 6, 0, 0]} name="Avg Progress %" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full text-slate-300">No progress data.</div>}
                    </div>
                </motion.div>

                {/* Middle Section: Leaderboard & Activity Logs */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* LEADERBOARD (2/3 width) */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-sm h-full">
                        <Leaderboard user={user} />
                    </motion.div>

                    {/* RECENT ACTIVITY LOGS (1/3 width) */}
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock size={18} className="text-[#3b82f6]" /> System Activity
                            </h3>
                            <span className="text-[10px] font-black text-[#3b82f6] bg-[#3b82f6]/10 px-2 py-1 rounded-lg uppercase tracking-widest">Global Feed</span>
                        </div>

                        <div className="space-y-6 flex-1 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {activities.length === 0 ? (
                                <div className="text-center py-20 text-slate-300 italic text-xs font-bold uppercase tracking-widest">No activity records found.</div>
                            ) : (
                                activities.map((act, i) => (
                                    <div key={i} className="flex gap-4 group relative">
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/20 transition-all shadow-sm">
                                                {act.icon === 'LogIn' ? <TrendingUp size={18} /> :
                                                    act.icon === 'UserPlus' ? <Users size={18} /> :
                                                        act.icon === 'Code2' ? <Code2 size={18} /> : <Database size={18} />}
                                            </div>
                                            {i !== activities.length - 1 && <div className="w-0.5 h-full bg-slate-100 mt-2" />}
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(act.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</p>
                                            <p className="text-sm font-bold text-slate-700 leading-tight">{act.detail}</p>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[9px] font-black text-[#3b82f6] bg-[#3b82f6]/5 px-1.5 py-0.5 rounded border border-[#3b82f6]/10 uppercase">{act.team_name}</span>
                                                <span className="text-[9px] font-bold text-slate-400">VIA {act.action.split('_')[0]}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

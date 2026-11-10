import { useState, useEffect, useContext, useCallback } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { Search, Filter, ChevronRight, Code2, LogOut, Trash2, Download, Globe } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Loader from '../components/Loader';

const AdminTeamsList = () => {
    const { user, logout } = useContext(AuthContext);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState(location.state?.filter || 'All');

    const fetchTeams = useCallback(async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get(`/api/admin/teams?search=${searchTerm}&status=${filterStatus}`, config);
            setTeams(data);
        } catch (error) {
            console.error("error fetching teams", error);
        } finally {
            setLoading(false);
        }
    }, [user.token, searchTerm, filterStatus]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleDelete = async (id) => {
        if (!window.confirm('IRREVERSIBLE: Delete this team entity?')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.delete(`/api/admin/teams/${id}`, config);
            fetchTeams();
        } catch (error) {
            console.error("error deleting team", error);
        }
    };

    const getInitials = (name) => name?.charAt(0).toUpperCase() || '?';

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(teams, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "global_team_directory.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="min-h-screen pb-16 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60">
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06b6d4]" />

            {/* Ambient Decorative Elements */}
            <div className="absolute top-40 left-[-5%] w-96 h-96 rounded-full bg-blue-400/5 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-40 right-[-5%] w-96 h-96 rounded-full bg-indigo-400/5 blur-[100px] pointer-events-none" />

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
                            <Link to="/admin" className="text-slate-400 hover:text-slate-700 transition-colors h-full flex items-center px-1">Overview</Link>
                            <Link to="/admin/teams" className="text-[#3b82f6] border-b-2 border-[#3b82f6] h-full flex items-center px-1">Directory</Link>
                            <button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors py-2">
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 relative z-10">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/80">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-[#3b82f6]">
                                <Globe size={24} />
                            </div>
                            Global Team Directory
                        </h2>
                        <p className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest pl-1">Monitor and manage all innovation clusters</p>
                    </div>

                    <button onClick={handleDownload} className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-md">
                        <Download size={16} className="text-[#3b82f6]" /> Export Directory
                    </button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="md:col-span-2 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#3b82f6] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Identify team or search by email..."
                            className="input-field pl-12 bg-white/60 border-white/80 focus:bg-white focus:ring-4 focus:ring-blue-100 placeholder:text-slate-300 py-3 rounded-2xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <select
                            className="input-field pl-12 bg-white/60 border-white/80 focus:bg-white focus:ring-4 focus:ring-blue-100 appearance-none py-3 rounded-2xl font-bold text-slate-600"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="All">All Projects Status</option>
                            <option value="Idea">💡 Idea / Planning</option>
                            <option value="Development">🔧 Development</option>
                            <option value="Testing">🧪 Testing & QA</option>
                            <option value="Completed">✅ Completed</option>
                        </select>
                    </div>
                    <div className="bg-white/40 backdrop-blur rounded-2xl border border-white/80 flex items-center justify-center text-xs font-bold text-slate-400 uppercase tracking-widest uppercase">
                        {teams.length} Records Found
                    </div>
                </div>

                {/* Table */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl shadow-xl overflow-hidden shadow-blue-900/5">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Developer Entity</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Institutional Tag</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tech Stack</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Managed Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading && teams.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-20">
                                            <div className="flex flex-col items-center justify-center">
                                                <Loader />
                                                <p className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-widest">Synchronizing Directory...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : teams.length === 0 ? (
                                    <tr><td colSpan="4" className="px-8 py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic text-xs">No matching records detected in IAM database.</td></tr>
                                ) : (
                                    teams.map((team) => (
                                        <tr key={team._id} className="group hover:bg-blue-50/30 transition-all duration-300">
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-[#3b82f6] shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all font-black text-lg">
                                                        {getInitials(team.team_name)}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-extrabold text-slate-800 group-hover:text-[#3b82f6] transition-colors">{team.team_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-bold tracking-tight">{team.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/50 uppercase tracking-tight">
                                                    {team.college || 'Internal Cluster'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                    {team.skills?.slice(0, 2).map((skill, i) => (
                                                        <span key={i} className="text-[9px] font-black text-[#8b5cf6] bg-[#8b5cf6]/5 px-2 py-0.5 rounded-md border border-[#8b5cf6]/10 uppercase tracking-tighter">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {team.skills?.length > 2 && <span className="text-[9px] font-bold text-slate-400 tracking-tighter">+{team.skills.length - 2} more</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        to={`/admin/teams/${team._id}`}
                                                        className="p-2.5 text-slate-400 hover:text-[#3b82f6] hover:bg-blue-50 rounded-xl transition-all"
                                                        title="Supervise Node"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(team._id)}
                                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Terminate Instance"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default AdminTeamsList;

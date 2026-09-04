import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import api from '../api';
import { Trophy, Star, Clock, Shield, Award, TrendingUp, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const Leaderboard = ({ user }) => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${user.token}` } };
                const { data } = await api.get('/api/team/leaderboard', config);
                setTeams(data);
            } catch (error) {
                console.error('Leaderboard error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, [user.token]);

    const renderStars = (rating) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                        key={s}
                        size={14}
                        className={s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"}
                    />
                ))}
            </div>
        );
    };

    if (loading) return <div className="p-10 text-center text-slate-400 italic">Calculating rankings...</div>;

    const filteredTeams = teams.filter(project => {
        const teamName = project.team_id?.team_name || 'Expunged ID';
        const projectTitle = project.project_title || '';
        return teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               projectTitle.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Trophy className="text-[#3b82f6]" size={28} /> RANKINGS
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Live Global Standing</p>
                </div>
                <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#3b82f6]" />
                    <span className="text-xs font-black text-[#3b82f6] uppercase tracking-tighter">Real-time Metrics</span>
                </div>
            </div>

            <div className="relative mb-4 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#3b82f6] transition-colors" size={18} />
                <input
                    type="text"
                    placeholder="Search by team or project name..."
                    className="w-full pl-12 pr-4 py-3 bg-white/60 border border-white/80 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 rounded-2xl text-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredTeams.map((project, index) => (
                    <motion.div
                        key={project._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`card p-5 flex items-center justify-between border-l-4 transition-all hover:translate-x-1 ${index === 0 ? 'border-l-amber-400 bg-gradient-to-r from-amber-50/30 to-white' :
                            index === 1 ? 'border-l-slate-400 bg-gradient-to-r from-slate-50/30 to-white' :
                                index === 2 ? 'border-l-orange-400 bg-gradient-to-r from-orange-50/30 to-white' :
                                    'border-l-blue-400'
                            }`}
                    >
                        <div className="flex items-center gap-5">
                            <div className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-lg shadow-sm border ${index === 0 ? 'bg-amber-100 text-amber-600 border-amber-200' :
                                index === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                    index === 2 ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                }`}>
                                #{index + 1}
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                                    {project.team_id?.team_name || 'Expunged ID'}
                                    {index === 0 && <Award size={14} className="text-amber-500" />}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Shield size={10} /> {project.team_id?.college || 'Generic Entity'}
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                                    <span className="text-[10px] font-black text-slate-500">{project.project_title}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            {project.isRated ? (
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest pl-1 mb-1">Expert Rating</div>
                                    {renderStars(project.rating)}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
                                    <Clock size={12} className="text-slate-400 animate-pulse" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Under Progress</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}

                {filteredTeams.length === 0 && (
                    <div className="p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <Trophy className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No rankings match your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;

Leaderboard.propTypes = {
    user: PropTypes.shape({
        token: PropTypes.string.isRequired
    }).isRequired
};

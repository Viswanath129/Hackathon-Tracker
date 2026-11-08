import { useState, useEffect, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContextObj';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Code2, Download, FileText, Calendar, Database, Server, Clock, Star, MessageSquare, CheckCircle2, ShieldCheck, Mail, Building, Trash2, Flag, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../components/Loader';

const AdminTeamDetail = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const [team, setTeam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [gradingId, setGradingId] = useState(null);
    const [gradeData, setGradeData] = useState({ rating: 0, feedback: '' });
    const [savingGrade, setSavingGrade] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [ratingProjectId, setRatingProjectId] = useState(null);
    const [projectRating, setProjectRating] = useState(0);

    const fetchTeam = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get(`/api/admin/teams/${id}`, config);
            setTeam(data);
        } catch (error) {
            console.error("error fetching team", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
        const intervalId = setInterval(fetchTeam, 5000);
        return () => clearInterval(intervalId);
    }, [id]); // eslint-disable-line

    const handleGradeSubmit = async (reportId, projectId) => {
        setSavingGrade(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(`/api/admin/reports/${reportId}/grade`, { ...gradeData, project_id: projectId }, config);
            setSuccessMsg('Grade and feedback applied successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
            setGradingId(null);
            fetchTeam();
        } catch (error) {
            console.error("error grading report", error);
        } finally {
            setSavingGrade(false);
        }
    };

    const handleProjectRating = async (projectId, hackathonId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(`/api/admin/projects/${projectId}/rate`, { rating: projectRating, hackathon_id: hackathonId }, config);
            setSuccessMsg('Project rating updated successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
            setRatingProjectId(null);
            fetchTeam();
        } catch (error) {
            console.error("error rating project", error);
        }
    };

    const handleDeleteArtifact = async (reportId, projectId) => {
        if (!window.confirm('Are you sure you want to delete this artifact? This action cannot be undone.')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.delete(`/api/admin/reports/${reportId}?project_id=${projectId}`, config);
            setSuccessMsg('Artifact removed from system.');
            setTimeout(() => setSuccessMsg(''), 3000);
            fetchTeam();
        } catch (error) {
            console.error("error deleting artifact", error);
        }
    };

    const handleDownload = async (reportId, projectId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get(`/api/admin/reports/${reportId}/download?project_id=${projectId}`, config);
            window.open(data.downloadUrl, '_blank');
        } catch (error) {
            console.error("error during secure download", error);
            alert("Failed to generate secure download link.");
        }
    };

    const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <Loader />
            <p className="text-slate-400 text-sm font-medium mt-4 tracking-wider uppercase italic">Accessing IAM Records...</p>
        </div>
    );

    if (!team) return <div className="p-8 text-center text-red-500 font-bold bg-red-50 min-h-screen flex items-center justify-center">Identity not found in Global Directory.</div>;

    const initials = team.team_name?.charAt(0).toUpperCase() || '?';

    return (
        <div className="min-h-screen pb-20 relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60">
            {/* Background Layer */}
            <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06b6d4]" />
            <div className="absolute top-40 right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-40 left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-400/5 blur-[120px] pointer-events-none" />

            <nav className="border-b border-white/70 bg-white/60 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] p-2 rounded-xl">
                                <Code2 className="text-white" size={20} strokeWidth={2.5} />
                            </div>
                            <span className="text-lg font-black tracking-tighter text-slate-800 uppercase">
                                Avanthi Innovation Hub <span className="bg-gradient-to-r from-[#f59e0b] to-[#ef4444] bg-clip-text text-transparent">Admin</span>
                            </span>
                        </div>
                        <Link to="/admin/teams" className="text-xs font-bold text-slate-500 hover:text-[#3b82f6] transition-colors flex items-center group uppercase tracking-widest">
                            <ArrowLeft size={16} className="mr-2 transform group-hover:-translate-x-1 transition-transform" /> Back to Directory
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Sidebar: Team Profile */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="card p-8 border-t-4 border-t-[#3b82f6] bg-white text-slate-800 shadow-xl shadow-blue-900/5">
                            <div className="flex flex-col items-center mb-8 border-b border-slate-100 pb-8 text-center">
                                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-[#3b82f6] shadow-md font-black text-4xl mb-4">
                                    {initials}
                                </div>
                                <h3 className="text-2xl font-extrabold tracking-tight text-slate-800">{team.team_name}</h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                                    <ShieldCheck size={12} className="text-[#3b82f6]" /> Developer Entity
                                </p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-hover hover:border-blue-200">
                                    <Mail className="mt-1 text-slate-400" size={16} />
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Communication Channel</h4>
                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{team.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-hover hover:border-blue-200">
                                    <Building className="mt-1 text-slate-400" size={16} />
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution / Cluster</h4>
                                        <p className="text-sm font-bold text-slate-700 mt-0.5">{team.college || 'Internal Organization'}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Technical Portfolio</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {team.skills?.map((skill, index) => (
                                            <span key={index} className="px-3 py-1 rounded-xl bg-blue-50 border border-blue-100 text-[10px] font-black text-[#3b82f6] uppercase tracking-tighter">
                                                {skill}
                                            </span>
                                        ))}
                                        {!team.skills?.length && <span className="text-xs text-slate-400 italic">No skills defined.</span>}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center gap-3 text-xs font-medium text-slate-400">
                                    <Clock size={14} className="text-slate-300" />
                                    Registered: {new Date(team.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </motion.div>

                        {/* Team-Specific Activity Logs */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="card p-6 bg-white/60 backdrop-blur-xl border border-white/80">
                            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-3">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} className="text-[#3b82f6]" /> Entity Logs
                                </h4>
                                <span className="text-[9px] font-black text-[#3b82f6] bg-[#3b82f6]/10 px-1.5 py-0.5 rounded uppercase">Real-time</span>
                            </div>

                            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1 group shadow-[inset_0_-10px_20px_-10px_rgba(0,0,0,0.05)] custom-scrollbar">
                                {!team.activities || team.activities.length === 0 ? (
                                    <div className="text-center py-10 text-slate-300 italic text-[10px] font-bold uppercase tracking-widest">No history recorded.</div>
                                ) : (
                                    team.activities.map((act, i) => (
                                        <div key={i} className="relative pl-6 pb-4 border-l border-slate-100 last:pb-0">
                                            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#3b82f6] shadow-sm" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">
                                                {new Date(act.timestamp).toLocaleDateString()} • {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs font-bold text-slate-700 leading-snug">{act.detail}</p>
                                            <div className="mt-1">
                                                <span className="text-[9px] font-black text-[#3b82f6] uppercase tracking-widest opacity-70">[{act.action}]</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Content: Projects & Submissions */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex justify-between items-center bg-white/40 backdrop-blur rounded-2xl p-4 border border-white/80">
                            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <Server className="text-[#3b82f6]" size={22} /> Infrastructure Supervision
                            </h2>
                            <div className="flex items-center gap-2 bg-[#3b82f6]/10 px-3 py-1.5 rounded-xl border border-[#3b82f6]/20">
                                <CheckCircle2 size={16} className="text-[#3b82f6]" />
                                <span className="text-[10px] font-black text-[#3b82f6] uppercase tracking-widest">{team.projects?.length || 0} Projects Detected</span>
                            </div>
                        </div>

                        {team.hackathons?.length === 0 ? (
                            <div className="card p-16 text-center bg-white/40 border-dashed border-2 border-slate-200 text-slate-400 rounded-3xl">
                                <Database size={48} className="mx-auto mb-4 opacity-10" />
                                <p className="font-bold uppercase tracking-widest text-sm italic opacity-50">No infrastructure projects found for this entity.</p>
                            </div>
                        ) : (
                            team.hackathons.map(hackathon => {
                                const hProjects = team.projects?.filter(p => p.hackathon_id === hackathon._id) || [];

                                return (
                                    <motion.div variants={itemVariants} key={hackathon._id} className="card overflow-hidden bg-white border border-slate-100 shadow-xl shadow-blue-900/5 rounded-3xl">
                                        {/* Hackathon Cluster Header */}
                                        <div className="bg-gradient-to-r from-slate-50 to-white p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{hackathon.hackathon_name}</h4>
                                                </div>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest ml-5">Cluster UID: hack-{hackathon._id.substring(0, 8)}</p>
                                            </div>
                                            <div className="text-[10px] font-black text-slate-500 flex items-center bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-[#3b82f6]" />
                                                    {new Date(hackathon.start_date).toLocaleDateString()}
                                                </div>
                                                <div className="h-3 w-[1px] bg-slate-200" />
                                                <div className="flex items-center gap-1.5">
                                                    {new Date(hackathon.end_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-8 space-y-8">
                                            {hProjects.length === 0 ? (
                                                <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active services provisioned in this cluster.</p>
                                                </div>
                                            ) : (
                                                hProjects.map(project => {
                                                    const pReports = project.reports || [];
                                                    return (
                                                        <div key={project._id} className="bg-white rounded-3xl p-6 border border-slate-100 hover:border-blue-200 transition-all group hover:shadow-lg hover:shadow-blue-900/5">
                                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                                                <div>
                                                                    <h5 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-[#3b82f6] transition-colors">{project.project_title}</h5>
                                                                    <p className="text-sm font-medium text-slate-400 mt-1 leading-relaxed">{project.description}</p>
                                                                </div>
                                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm
                                                                    ${project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                        project.status === 'Testing' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                            'bg-blue-50 text-[#3b82f6] border-blue-100'}`}>
                                                                    {project.status}
                                                                </span>
                                                            </div>

                                                            {/* Project Rating UI for Admins */}
                                                            <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <Award size={18} className="text-amber-500" />
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Global Ranking Influence</p>
                                                                        <div className="flex items-center gap-1 mt-1">
                                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                                <button
                                                                                    key={star}
                                                                                    onClick={() => { setRatingProjectId(project._id); setProjectRating(star); }}
                                                                                    className="transition-transform hover:scale-125 focus:outline-none"
                                                                                >
                                                                                    <Star
                                                                                        size={18}
                                                                                        className={`${(ratingProjectId === project._id ? projectRating : project.rating) >= star ? "text-amber-400 fill-amber-400" : "text-slate-300"} transition-colors`}
                                                                                    />
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleProjectRating(project._id, hackathon._id)}
                                                                    className="btn-cyan py-1.5 px-4 text-[9px] font-black uppercase tracking-widest"
                                                                >
                                                                    Submit Rating
                                                                </button>
                                                                {project.isRated && ratingProjectId !== project._id && (
                                                                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                                        Rated: {project.rating}/5
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Artifacts (Supervision Section) */}
                                                            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                                                                <h6 className="text-[10px] font-black text-[#3b82f6] uppercase tracking-[0.2em] flex items-center gap-2">
                                                                    <Database size={14} /> Submitted Artifacts ({pReports.length})
                                                                </h6>

                                                                {pReports.length === 0 ? (
                                                                    <p className="text-xs font-medium text-slate-300 italic">Waiting for artifact deployment from team...</p>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 gap-4">
                                                                        {pReports.map(report => (
                                                                            <div key={report._id} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                                                                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                                                                                            <FileText size={20} className="text-slate-400" />
                                                                                        </div>
                                                                                        <div className="flex-1 overflow-hidden">
                                                                                            <p className="text-xs font-black text-slate-700 tracking-tight truncate">{report.original_name || `V1_PAYLOAD_${report._id.substring(0, 6).toUpperCase()}`}</p>
                                                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Uploaded: {new Date(report.createdAt).toLocaleString()}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <button
                                                                                            onClick={() => handleDownload(report._id, project._id)}
                                                                                            className="btn-cyan py-2 px-6 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
                                                                                        >
                                                                                            <Download size={14} /> Download Payload
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleDeleteArtifact(report._id, project._id)}
                                                                                            className="p-2.5 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
                                                                                            title="Purge Artifact"
                                                                                        >
                                                                                            <Trash2 size={16} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>

                                                                                {/* GRADING & FEEDBACK SECTION */}
                                                                                <div className="bg-white/60 p-5 rounded-2xl border border-indigo-50">
                                                                                    <div className="flex justify-between items-center mb-4">
                                                                                        <h6 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                                                                            <Star size={12} fill={report.rating > 0 ? "currentColor" : "none"} />
                                                                                            Artifact Supervision & Rating
                                                                                        </h6>
                                                                                        {report.rating > 0 && <CheckCircle2 size={16} className="text-emerald-500" />}
                                                                                    </div>

                                                                                    {gradingId === report._id ? (
                                                                                        <div className="space-y-4">
                                                                                            <div className="flex items-center gap-4">
                                                                                                <div className="w-24">
                                                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Rating (1-10)</label>
                                                                                                    <input
                                                                                                        type="number" min="0" max="10"
                                                                                                        className="input-field py-2 text-center font-bold text-lg"
                                                                                                        value={gradeData.rating}
                                                                                                        onChange={(e) => setGradeData({ ...gradeData, rating: e.target.value })}
                                                                                                    />
                                                                                                </div>
                                                                                                <div className="flex-1">
                                                                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Supervisor Feedback</label>
                                                                                                    <textarea
                                                                                                        className="input-field py-2 text-xs h-10 resize-none"
                                                                                                        value={gradeData.feedback}
                                                                                                        onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                                                                                                        placeholder="Enter internal review notes..."
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex justify-end gap-2">
                                                                                                <button onClick={() => setGradingId(null)} className="btn-secondary text-[10px] py-1.5 px-4 font-bold uppercase">Discard</button>
                                                                                                <button onClick={() => handleGradeSubmit(report._id, project._id)} disabled={savingGrade} className="btn-cyan text-[10px] py-1.5 px-6 font-bold uppercase shadow-md shadow-blue-200">
                                                                                                    {savingGrade ? 'Applying...' : 'Apply Grade'}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                                                                            <div className="flex-1">
                                                                                                {report.rating > 0 ? (
                                                                                                    <div className="flex gap-4 items-start">
                                                                                                        <div className="bg-indigo-50 text-indigo-700 font-black text-xl w-14 h-14 flex items-center justify-center rounded-2xl border border-indigo-100">
                                                                                                            {report.rating}/10
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                                                                                                <MessageSquare size={10} /> Feedback
                                                                                                            </p>
                                                                                                            <p className="text-xs font-bold text-slate-600 line-clamp-2">{report.feedback || "Verified by System Admin"}</p>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                ) : (
                                                                                                    <p className="text-xs font-bold text-slate-300 italic">This artifact has not been graded yet.</p>
                                                                                                )}
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={() => { setGradingId(report._id); setGradeData({ rating: report.rating || 0, feedback: report.feedback || '' }); }}
                                                                                                className="text-[10px] font-black text-[#3b82f6] bg-[#3b82f6]/5 hover:bg-[#3b82f6]/10 px-6 py-2.5 rounded-xl border border-[#3b82f6]/20 uppercase tracking-widest transition-all"
                                                                                            >
                                                                                                {report.rating > 0 ? 'Modify Grade' : 'Assign Record Grade'}
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </motion.div>
                                )
                            })
                        )}
                    </div>

                    {/* Reported Issues Section */}
                    {team.issues && team.issues.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                            <div className="flex items-center gap-3 px-4">
                                <div className="p-2 bg-red-100 rounded-xl text-red-500">
                                    <Flag size={20} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-800">Critical Alerts & Issues</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support requests from developer node</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {team.issues.map(issue => (
                                    <div key={issue._id} className="card p-6 bg-white border border-red-50 hover:border-red-100 transition-all shadow-lg shadow-red-900/5 rounded-3xl group">
                                        <div className="flex flex-col md:flex-row justify-between gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${issue.status === 'Open' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                                        {issue.status}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(issue.createdAt).toLocaleString()}</span>
                                                </div>
                                                <h4 className="text-lg font-black text-slate-800 tracking-tight group-hover:text-red-500 transition-colors uppercase">{issue.title}</h4>
                                                <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">{issue.description}</p>
                                            </div>
                                            {issue.image_url && (
                                                <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                                                    <img
                                                        src={issue.image_url}
                                                        alt="Issue Proof"
                                                        className="w-full h-full object-cover cursor-zoom-in hover:scale-110 transition-transform duration-500"
                                                        onClick={() => window.open(issue.image_url, '_blank')}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {successMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-8 py-4 rounded-3xl shadow-2xl shadow-emerald-500/40 flex items-center gap-3 font-black uppercase tracking-widest text-xs"
                    >
                        <ShieldCheck size={20} />
                        {successMsg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminTeamDetail;

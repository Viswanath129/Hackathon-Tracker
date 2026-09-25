import { useState, useEffect, useContext, useCallback } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContextObj';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, CheckCircle2, Code2, Edit3, Save, X, Upload, Layers, Clock, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../components/Loader';

const ProjectDetails = () => {
    const { hackathonId } = useParams();
    const { user } = useContext(AuthContext);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddProject, setShowAddProject] = useState(false);
    const [newProject, setNewProject] = useState({ project_title: '', description: '' });

    const [activeProject, setActiveProject] = useState(null);
    const [isEditingProject, setIsEditingProject] = useState(false);
    const [editProjectData, setEditProjectData] = useState({ project_title: '', description: '' });

    const [reports, setReports] = useState([]);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const fetchReports = useCallback(async (projectId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const res = await api.get(`/api/team/projects/${projectId}/reports`, config);
            setReports(res.data);
        } catch (error) { console.error('Error fetching reports', error); }
    }, [user.token]);

    const fetchHistory = useCallback(async (projectId) => {
        setHistoryLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const res = await api.get(`/api/team/projects/${projectId}/history`, config);
            setHistory(res.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
        } catch (error) { console.error('Error fetching history', error); }
        finally { setHistoryLoading(false); }
    }, [user.token]);

    const fetchProjects = useCallback(async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const res = await api.get(`/api/team/projects/${hackathonId}`, config);
            setProjects(res.data);
            if (res.data.length > 0) {
                const current = activeProject ? res.data.find(p => p._id === activeProject._id) : res.data[0];
                const final = current || res.data[0];
                setActiveProject(final);
                fetchReports(final._id);
                fetchHistory(final._id);
            }
        } catch (error) {
            console.error('Error fetching projects', error);
        } finally {
            setLoading(false);
        }
    }, [user.token, hackathonId]); // eslint-disable-line

    useEffect(() => { fetchProjects(); }, []); // eslint-disable-line

    const handleAddProject = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.post('/api/team/projects', { ...newProject, hackathon_id: hackathonId }, config);
            setShowAddProject(false);
            setNewProject({ project_title: '', description: '' });
            fetchProjects();
        } catch (error) { console.error('Error adding project', error); }
    };

    const handleUpdateProject = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(`/api/team/projects/${activeProject._id}/status`, { ...editProjectData, hackathon_id: hackathonId }, config);
            setIsEditingProject(false);
            fetchProjects();
        } catch (error) { console.error('Error updating project', error); }
    };

    const handleStatusChange = async (projectId, status) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.put(`/api/team/projects/${projectId}/status`, { status, hackathon_id: hackathonId }, config);
            fetchProjects();
            fetchHistory(projectId);
        } catch (error) { console.error('Error updating status', error); }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file || !activeProject) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('pdf', file);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
            await api.post(`/api/team/projects/${activeProject._id}/report`, formData, config);
            setFile(null);
            setUploadSuccess(true);
            setTimeout(() => setUploadSuccess(false), 3000);
            fetchReports(activeProject._id);
        } catch (error) {
            console.error('Error uploading file', error);
            setUploadError(error.response?.data?.message || 'Upload failed. Critical System Error.');
            setTimeout(() => setUploadError(''), 4000);
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (reportId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const { data } = await api.get(`/api/team/reports/${reportId}/download?project_id=${activeProject._id}`, config);
            window.open(data.downloadUrl, '_blank');
        } catch (error) {
            console.error("error during secure download", error);
        }
    };

    const statusConfig = {
        'Completed': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
        'Testing': { color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
        'Development': { color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
        'Idea': { color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-transparent">
            <Loader />
            <p className="text-slate-400 text-sm font-medium mt-4 tracking-wider">Loading projects...</p>
        </div>
    );

    return (
        <div className="min-h-screen pb-16 relative overflow-hidden bg-transparent">
            {/* Ambient layers */}
            <div className="absolute top-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent opacity-40" />
            <div className="absolute top-32 left-[5%] w-[25%] h-[25%] rounded-full bg-[#3b82f6]/8 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-20 right-[5%] w-[30%] h-[30%] rounded-full bg-[#8b5cf6]/8 blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="border-b border-white/60 bg-white/50 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/dashboard" className="flex items-center text-slate-500 hover:text-[#3b82f6] transition-colors group text-sm font-bold uppercase tracking-widest">
                            <ArrowLeft size={18} className="mr-2 transform group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] p-1.5 rounded-lg shadow-md">
                                <Layers className="text-white" size={18} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-extrabold text-slate-700 tracking-widest uppercase">Project Workspace</span>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#06b6d4] tracking-tight">Project Deployments</h2>
                        <p className="text-slate-400 text-sm mt-1 font-medium">{projects.length} active project{projects.length !== 1 ? 's' : ''} in this hackathon</p>
                    </div>
                    <button
                        onClick={() => setShowAddProject(!showAddProject)}
                        className="btn-cyan flex items-center text-sm font-bold shadow-md"
                    >
                        <Plus size={16} className="mr-2" /> New Project
                    </button>
                </div>

                {/* Add Project Form */}
                <AnimatePresence>
                    {showAddProject && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="card p-6 mb-8 border-t-4 border-t-[#3b82f6]">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Initialize New Project</h3>
                            <form onSubmit={handleAddProject} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Project Title</label>
                                    <input type="text" required className="input-field" value={newProject.project_title} onChange={(e) => setNewProject({ ...newProject, project_title: e.target.value })} placeholder="e.g. Smart Auth Module v1.0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                                    <textarea rows="3" className="input-field resize-none" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} placeholder="What are you building?"></textarea>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAddProject(false)} className="btn-secondary text-sm px-5">Cancel</button>
                                    <button type="submit" className="btn-cyan text-sm px-5">Create Project</button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-2">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 pl-1">Projects</h3>
                        {projects.length === 0 ? (
                            <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs font-medium">No projects yet.<br />Create your first one.</div>
                        ) : (
                            projects.map(p => {
                                const sc = statusConfig[p.status] || statusConfig['Idea'];
                                return (
                                    <div
                                        key={p._id}
                                        onClick={() => { setActiveProject(p); fetchReports(p._id); fetchHistory(p._id); setIsEditingProject(false); }}
                                        className={`card p-4 cursor-pointer transition-all border-l-4 ${activeProject?._id === p._id ? 'border-l-[#3b82f6] bg-white/80 shadow-md' : 'border-l-transparent hover:border-l-[#3b82f6]/40 hover:bg-white/60'}`}
                                    >
                                        <h4 className={`text-sm font-bold truncate ${activeProject?._id === p._id ? 'text-slate-800' : 'text-slate-500'}`}>{p.project_title}</h4>
                                        <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${sc.color}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                                            {p.status}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {activeProject ? (
                            <div className="space-y-6">
                                {/* Project Card */}
                                <motion.div key={activeProject._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-8 border-t-4 border-t-transparent" style={{ borderImageSlice: 1, borderImageSource: 'linear-gradient(to right, #3b82f6, #8b5cf6)' }}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6">
                                        <div className="flex-1">
                                            {isEditingProject ? (
                                                <div className="space-y-3 pr-4">
                                                    <input type="text" className="input-field font-bold text-lg" value={editProjectData.project_title} onChange={(e) => setEditProjectData({ ...editProjectData, project_title: e.target.value })} />
                                                    <textarea className="input-field text-sm" value={editProjectData.description} onChange={(e) => setEditProjectData({ ...editProjectData, description: e.target.value })} rows="3" />
                                                    <div className="flex gap-2">
                                                        <button onClick={handleUpdateProject} className="btn-cyan py-1.5 px-4 text-xs flex items-center"><Save size={13} className="mr-1" /> Save</button>
                                                        <button onClick={() => setIsEditingProject(false)} className="btn-secondary py-1.5 px-4 text-xs flex items-center"><X size={13} className="mr-1" /> Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-3 group mb-3">
                                                        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{activeProject.project_title}</h3>
                                                        <button onClick={() => { setIsEditingProject(true); setEditProjectData({ project_title: activeProject.project_title, description: activeProject.description }); }} className="p-1.5 text-slate-300 hover:text-[#3b82f6] transition-colors rounded-lg">
                                                            <Edit3 size={16} />
                                                        </button>
                                                    </div>
                                                    <p className="text-slate-500 text-sm leading-relaxed">{activeProject.description || <span className="italic">No description provided.</span>}</p>
                                                </>
                                            )}
                                        </div>

                                        <div className="min-w-[190px]">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Project Status</label>
                                            <select
                                                className="w-full bg-white/60 backdrop-blur-md border border-white/80 text-slate-700 text-xs font-bold rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#3b82f6]/30 shadow-sm"
                                                value={activeProject.status}
                                                onChange={(e) => handleStatusChange(activeProject._id, e.target.value)}
                                            >
                                                <option value="Idea">💡 Idea / Planning</option>
                                                <option value="Development">🔧 Development</option>
                                                <option value="Testing">🧪 Testing & QA</option>
                                                <option value="Completed">✅ Completed</option>
                                            </select>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Reports Card */}
                                <div className="card p-8">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center">
                                        <div className="p-1.5 bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 rounded-lg mr-3 border border-[#3b82f6]/20">
                                            <FileText className="text-[#3b82f6]" size={16} />
                                        </div>
                                        Build Artifacts (Any File Type)
                                    </h4>

                                    <form onSubmit={handleFileUpload} className="mb-8">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1 relative">
                                                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                                <div className={`bg-white/40 border-2 border-dashed rounded-2xl p-4 flex items-center justify-center text-sm font-medium transition-all ${file ? 'border-[#3b82f6] text-[#3b82f6]' : 'border-slate-200 text-slate-400 hover:border-[#3b82f6]/50'}`}>
                                                    <Upload size={16} className="mr-2 opacity-60" />
                                                    {file ? file.name : 'Click or drag a file here'}
                                                </div>
                                            </div>
                                            <button
                                                disabled={!file || uploading}
                                                className="btn-cyan px-6 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                                                        Uploading...
                                                    </>
                                                ) : 'Upload'}
                                            </button>
                                        </div>
                                        <AnimatePresence>
                                            {uploadSuccess && (
                                                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-emerald-600 text-xs font-bold flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Uploaded successfully!
                                                </motion.p>
                                            )}
                                        </AnimatePresence>
                                    </form>

                                    <div className="space-y-3">
                                        {reports.length === 0 ? (
                                            <div className="text-center py-10 text-slate-300 text-sm font-medium italic">No reports uploaded for this project yet.</div>
                                        ) : (
                                            reports.map((r) => (
                                                <div key={r._id} className="flex items-center justify-between p-4 bg-white/30 border border-white/60 rounded-2xl hover:bg-white/50 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-gradient-to-br from-[#3b82f6]/10 to-[#8b5cf6]/10 rounded-xl border border-[#3b82f6]/20">
                                                            <FileText size={18} className="text-[#3b82f6]" />
                                                        </div>
                                                        <div className="flex-1 overflow-hidden">
                                                            <p className="text-sm font-bold text-slate-700 truncate">{r.original_name || `Artifact_${r._id.substring(r._id.length - 6).toUpperCase()}`}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(r.createdAt).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleDownload(r._id)} className="text-xs font-bold text-[#3b82f6] hover:text-[#2563eb] hover:underline underline-offset-4 uppercase tracking-widest">
                                                        Download
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Project Evolution (DynamoDB Logs) */}
                                <div className="card p-8 bg-slate-900/5 backdrop-blur-xl border border-white/40 overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <TrendingUp size={120} className="text-[#3b82f6]" strokeWidth={3} />
                                    </div>
                                    <div className="flex items-center justify-between mb-8 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-[#3b82f6]/10 rounded-xl border border-[#3b82f6]/20 text-[#3b82f6]">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-slate-800 tracking-tight">Evolution Chronology</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Automated AWS Progress Logging</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4 relative z-10">
                                        {historyLoading ? (
                                            <div className="flex justify-center p-8"><Loader /></div>
                                        ) : history.length === 0 ? (
                                            <div className="p-10 border border-dashed border-slate-200 rounded-3xl text-center">
                                                <Clock size={32} className="mx-auto text-slate-200 mb-3" />
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] italic">No evolution records detected in cloud database.</p>
                                            </div>
                                        ) : (
                                            history.map((h, i) => (
                                                <div key={i} className="flex gap-4 group">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)] z-10" />
                                                        {i !== history.length - 1 && <div className="w-0.5 flex-1 bg-gradient-to-b from-[#3b82f6] to-transparent opacity-20 my-1" />}
                                                    </div>
                                                    <div className="flex-1 pb-6">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-[10px] font-black text-[#8b5cf6] uppercase tracking-widest">{new Date(h.timestamp).toLocaleString()}</p>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-[#3b82f6] border border-[#3b82f6]/10 shadow-sm">{h.delta_percentage}%</span>
                                                        </div>
                                                        <div className="bg-white/40 p-3 rounded-2xl border border-white/60 group-hover:bg-white/60 transition-colors">
                                                            <p className="text-sm font-semibold text-slate-700">{h.update_text}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-96 flex flex-col items-center justify-center card border-dashed border-2 border-slate-200">
                                <div className="p-6 bg-gradient-to-br from-[#3b82f6]/10 to-[#8b5cf6]/10 rounded-3xl border border-[#3b82f6]/20 mb-4">
                                    <Code2 size={40} className="text-[#3b82f6] opacity-60" />
                                </div>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm mt-2">Select a project to get started</p>
                                <p className="text-slate-300 text-xs mt-1">or create a new one above</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {uploadSuccess && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-[#10b981] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 font-bold uppercase tracking-widest text-xs">
                        <CheckCircle2 size={20} />
                        Artifact Uploaded Successfully
                    </motion.div>
                )}
                {uploadError && (
                    <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-[#f43f5e] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 font-bold uppercase tracking-widest text-xs">
                        <X size={20} />
                        {uploadError}
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default ProjectDetails;

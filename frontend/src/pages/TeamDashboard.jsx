import { useState, useEffect, useContext, useCallback } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { User, Code2, Plus, Calendar, AlertCircle, LogOut, Settings, Trash2, Edit3, CheckCircle2, Clock, Flag, Image as ImageIcon, TrendingUp, Users, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Loader from '../components/Loader';
import Leaderboard from '../components/Leaderboard';

const TeamDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [hackathons, setHackathons] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddForm, setShowAddForm] = useState(false);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [editHackathonId, setEditHackathonId] = useState(null);

    const [newHackathon, setNewHackathon] = useState({
        hackathon_name: '', start_date: '', end_date: ''
    });

    const [editProfileData, setEditProfileData] = useState({
        team_name: '', college: '', skills: ''
    });

    const [newMember, setNewMember] = useState({ name: '', email: '', rollno: '', role: 'Member' });
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberSaving, setMemberSaving] = useState(false);
    const [memberError, setMemberError] = useState('');
    const [memberSuccess, setMemberSuccess] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState(false);
    const [profileError, setProfileError] = useState('');

    const [showIssueForm, setShowIssueForm] = useState(false);
    const [issueData, setIssueData] = useState({ title: '', description: '', project_id: '' });
    const [issueImage, setIssueImage] = useState(null);
    const [issueSaving, setIssueSaving] = useState(false);
    const [issueSuccess, setIssueSuccess] = useState(false);
    const [activities, setActivities] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [profileRes, hackathonRes, activitiesRes] = await Promise.all([
                api.get('/api/team/profile', config),
                api.get('/api/team/hackathons', config),
                api.get('/api/team/activity', config)
            ]);
            setProfile(profileRes.data);
            setHackathons(hackathonRes.data);
            setActivities(activitiesRes.data);
            setEditProfileData({
                team_name: profileRes.data.team_name,
                college: profileRes.data.college || '',
                skills: profileRes.data.skills?.join(', ') || ''
            });
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    }, [user.token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddHackathon = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            if (editHackathonId) {
                await api.put(`/api/team/hackathons/${editHackathonId}`, newHackathon, config);
            } else {
                await api.post('/api/team/hackathons', newHackathon, config);
            }
            setShowAddForm(false);
            setEditHackathonId(null);
            setNewHackathon({ hackathon_name: '', start_date: '', end_date: '' });
            fetchData();
        } catch (error) { console.error('Failed to handle hackathon', error); }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        setMemberSaving(true);
        setMemberError('');
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const updatedMembers = [...(profile.members || []), { ...newMember }];
            const res = await api.put('/api/team/profile', { members: updatedMembers }, config);
            if (res.status === 200) {
                setNewMember({ name: '', email: '', rollno: '', role: 'Member' });
                setShowAddMember(false);
                setMemberSuccess(true);
                setTimeout(() => setMemberSuccess(false), 3000);
                fetchData();
            }
        } catch (error) {
            console.error('Failed to add member', error);
            setMemberError(error.response?.data?.message || 'Failed to save. Please try again.');
        } finally {
            setMemberSaving(false);
        }
    };

    const handleRemoveMember = async (memberEmail) => {
        if (!window.confirm('Remove this teammate?')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const updatedMembers = profile.members.filter(m => m.email !== memberEmail);
            await api.put('/api/team/profile', { members: updatedMembers }, config);
            fetchData();
        } catch (error) { console.error('Failed to remove member', error); }
    };

    const handleDeleteHackathon = async (id) => {
        if (!window.confirm('Are you sure? This will delete all projects and reports under this hackathon.')) return;
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await api.delete(`/api/team/hackathons/${id}`, config);
            fetchData();
        } catch (error) { console.error('Failed to delete', error); }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileError('');
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const payload = {
                ...editProfileData,
                skills: editProfileData.skills.split(',').map(s => s.trim()).filter(s => s !== '')
            };
            await api.put('/api/team/profile', payload, config);
            setShowProfileEdit(false);
            setProfileSuccess(true);
            setTimeout(() => setProfileSuccess(false), 3000);
            fetchData();
        } catch (error) {
            console.error('Failed to update profile', error);
            setProfileError(error.response?.data?.message || 'Failed to save changes. Please try again.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleIssueSubmit = async (e) => {
        e.preventDefault();
        setIssueSaving(true);
        const formData = new FormData();
        formData.append('title', issueData.title);
        formData.append('description', issueData.description);
        if (issueData.project_id) formData.append('project_id', issueData.project_id);
        if (issueImage) formData.append('image', issueImage);

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'multipart/form-data' } };
            await api.post('/api/team/issues', formData, config);
            setIssueSuccess(true);
            setIssueData({ title: '', description: '', project_id: '' });
            setIssueImage(null);
            setShowIssueForm(false);
            setTimeout(() => setIssueSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to report issue', error);
        } finally {
            setIssueSaving(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-transparent">
            <Loader />
            <p className="text-slate-400 text-sm font-medium mt-4 tracking-wider">Loading workspace...</p>
        </div>
    );

    return (
        <div className="min-h-screen pb-12 relative overflow-hidden bg-transparent">
            {/* Navbar */}
            <nav className="border-b border-white/60 bg-white/40 backdrop-blur-2xl sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <div className="bg-[#8b5cf6] p-1.5 rounded-lg mr-2 shadow-[0_4px_10px_rgba(139,92,246,0.3)]">
                                <Code2 className="text-white" size={20} strokeWidth={3} />
                            </div>
                            <span className="text-xl font-extrabold text-slate-800 tracking-widest font-sans drop-shadow-sm">
                                AVANTHI<span className="text-[#8b5cf6] ml-1 opacity-90">HUB</span>
                            </span>
                        </div>
                        <div className="flex items-center space-x-6">
                            <button onClick={logout} className="text-sm font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center tracking-wide bg-white/50 px-3 py-1.5 rounded-xl border border-white/60 shadow-sm hover:bg-white/70">
                                <LogOut size={16} className="mr-1.5" /> Disconnect
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Profile Sidebar */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
                        <div className="card p-6 border-t-[4px] border-t-[#3b82f6]">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className="bg-white/50 backdrop-blur-md p-3 rounded-2xl border border-white/80 text-[#3b82f6] shadow-sm">
                                        <User size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 tracking-wide">{profile?.team_name}</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5">
                                            {profile?.loginEmail && profile.loginEmail !== profile.email ? 'Member Session' : 'Team Lead'}
                                        </p>
                                        <p className="text-sm text-slate-500 font-medium">{profile?.loginEmail || profile?.email}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowProfileEdit(!showProfileEdit)} className="p-2 text-slate-500 hover:text-[#3b82f6] bg-white/40 rounded-xl border border-white/80 transition-colors shadow-sm">
                                    <Settings size={18} />
                                </button>
                            </div>

                            <AnimatePresence>
                                {showProfileEdit ? (
                                    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleProfileUpdate} className="space-y-4 mb-6 border-b border-slate-700 pb-6">
                                        <div>
                                            <label htmlFor="team_name" className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Team Name</label>
                                            <input id="team_name" type="text" className="input-field py-2" value={editProfileData.team_name} onChange={(e) => setEditProfileData({ ...editProfileData, team_name: e.target.value })} />
                                        </div>
                                        <div>
                                            <label htmlFor="college" className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">College</label>
                                            <input id="college" type="text" className="input-field py-2" value={editProfileData.college} onChange={(e) => setEditProfileData({ ...editProfileData, college: e.target.value })} />
                                        </div>
                                        <div>
                                            <label htmlFor="skills" className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Skills (comma separated)</label>
                                            <input id="skills" type="text" className="input-field py-2" value={editProfileData.skills} onChange={(e) => setEditProfileData({ ...editProfileData, skills: e.target.value })} />
                                        </div>
                                        {profileError && <p className="text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">{profileError}</p>}
                                        <div className="flex gap-2">
                                            <button type="submit" disabled={profileSaving} className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-2">
                                                {profileSaving ? (
                                                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                                                ) : 'Save'}
                                            </button>
                                            <button type="button" onClick={() => setShowProfileEdit(false)} className="btn-secondary flex-1 py-2 text-xs">Cancel</button>
                                        </div>
                                        <AnimatePresence>
                                            {profileSuccess && (
                                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                                    <CheckCircle2 size={12} /> Profile Updated Successfully
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.form>
                                ) : (
                                    <div className="space-y-5">
                                        <div>
                                            <h4 className="text-xs font-bold text-[#3b82f6] uppercase tracking-wider mb-1">Institution</h4>
                                            <p className="font-semibold text-slate-700">{profile?.college || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-2">Technical Stack</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {profile?.skills?.map((skill, index) => (
                                                    <span key={index} className="px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-[inset_0_2px_4px_-1px_rgba(255,255,255,0.8),0_4px_6px_-2px_rgba(0,0,0,0.02)] text-xs font-bold text-slate-700">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {(!profile?.skills || profile.skills.length === 0) && <span className="text-sm text-slate-400 font-medium italic">No configurations.</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </AnimatePresence>

                            {/* Team Members */}
                            <div className="mt-8 pt-6 border-t border-white/60">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                        <User size={16} className="mr-2 text-[#3b82f6]" /> Team Members
                                    </h4>
                                    <button onClick={() => setShowAddMember(!showAddMember)} className="text-[#3b82f6] hover:text-[#2563eb] text-xs font-bold flex items-center">
                                        <Plus size={14} className="mr-1" /> Add
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showAddMember && (
                                        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleAddMember} className="mb-4 bg-white/40 p-3 rounded-2xl border border-white/80 shadow-sm">
                                            <input type="text" required placeholder="Member Name" className="w-full text-sm px-3 py-2 bg-white/60 rounded-xl mb-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 border border-white/80" value={newMember.name} onChange={e => setNewMember({ ...newMember, name: e.target.value })} />
                                            <input type="email" required placeholder="Email Address" className="w-full text-sm px-3 py-2 bg-white/60 rounded-xl mb-2 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 border border-white/80" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })} />
                                            <select
                                                required
                                                className="w-full text-sm px-3 py-2 bg-white/60 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 border border-white/80"
                                                value={newMember.role}
                                                onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                                            >
                                                <option value="Member">Member</option>
                                                <option value="Lead">Lead</option>
                                            </select>
                                            {memberError && <p className="text-[10px] font-bold text-red-500 mb-2">{memberError}</p>}
                                            <div className="flex gap-2">
                                                <button type="submit" disabled={memberSaving} className="flex-1 py-1.5 bg-gradient-to-r from-[#3b82f6] to-[#06b6d4] text-white rounded-xl text-xs font-bold border border-white/40 shadow-sm hover:opacity-90">
                                                    {memberSaving ? 'Saving...' : 'Save'}
                                                </button>
                                                <button type="button" onClick={() => setShowAddMember(false)} className="flex-1 py-1.5 bg-white/60 text-slate-700 rounded-xl text-xs font-bold border border-white/80">Cancel</button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>

                                {memberSuccess && (
                                    <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mb-3 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                        <CheckCircle2 size={12} /> Member Added
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {profile?.members?.length > 0 ? profile.members.map((member, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-white/30 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-700">{member.name}</p>
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${member.role === 'Lead' ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                        {member.role || 'Member'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-medium lowercase italic pr-1">{member.email} {member.rollno && ` | ${member.rollno}`}</p>
                                            </div>
                                            <button onClick={() => handleRemoveMember(member.email)} className="text-slate-400 hover:text-red-400 p-1 flex-shrink-0">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )) : (
                                        <p className="text-xs text-slate-400 font-medium italic">No active members yet.</p>
                                    )}
                                </div>
                            </div>

                            {/* Report Issue Section */}
                            <div className="mt-8 pt-6 border-t border-white/60">
                                <button
                                    onClick={() => setShowIssueForm(!showIssueForm)}
                                    className="w-full flex items-center justify-between p-4 bg-red-50/50 hover:bg-red-50 rounded-2xl border border-red-100 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-100 rounded-xl text-red-500 group-hover:scale-110 transition-transform">
                                            <Flag size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-red-600">Report an Issue</p>
                                            <p className="text-[10px] text-red-400 font-medium">Flag bugs or blockers</p>
                                        </div>
                                    </div>
                                    <Plus size={16} className={`text-red-400 transition-transform ${showIssueForm ? 'rotate-45' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showIssueForm && (
                                        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleIssueSubmit} className="mt-4 space-y-3 bg-white/40 p-4 rounded-2xl border border-white/80 overflow-hidden">
                                            <input required type="text" placeholder="Issue Title" className="w-full text-sm px-3 py-2 bg-white/60 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 border border-white/80" value={issueData.title} onChange={e => setIssueData({ ...issueData, title: e.target.value })} />
                                            <textarea required placeholder="Describe the blocker..." className="w-full text-sm px-3 py-2 bg-white/60 rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 border border-white/80 h-20 resize-none" value={issueData.description} onChange={e => setIssueData({ ...issueData, description: e.target.value })} />

                                            <div className="flex gap-2">
                                                <div className="flex-1 relative">
                                                    <input type="file" accept="image/*" onChange={e => setIssueImage(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                    <div className="w-full py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-[10px] font-bold text-slate-400 flex items-center justify-center gap-2">
                                                        <ImageIcon size={14} /> {issueImage ? issueImage.name : 'Attach Proof'}
                                                    </div>
                                                </div>
                                                <button type="submit" disabled={issueSaving} className="px-6 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50">
                                                    {issueSaving ? 'Submitting...' : 'Submit'}
                                                </button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                                <AnimatePresence>
                                    {issueSuccess && (
                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                                            <CheckCircle2 size={12} /> Issue logged. Admin will review soon.
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>

                    {/* Main Content Area */}
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center card p-5 border-t-[4px] border-t-[#3b82f6]">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Active Instances</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">Total Hackathons: {hackathons.length}</p>
                            </div>
                            <button
                                onClick={() => { setEditHackathonId(null); setNewHackathon({ hackathon_name: '', start_date: '', end_date: '' }); setShowAddForm(!showAddForm); }}
                                className="btn-cyan flex items-center text-sm shadow-sm"
                            >
                                <Plus size={16} className="mr-1" /> Launch New Tag
                            </button>
                        </div>

                        {/* Add/Edit Hackathon Form */}
                        <AnimatePresence>
                            {showAddForm && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="card p-6 overflow-hidden">
                                    <h3 className="text-lg font-bold text-[#2dd4bf] mb-4 border-b border-white/40 pb-3">
                                        {editHackathonId ? 'Modify Instance Configuration' : 'Configure New Hackathon Instance'}
                                    </h3>
                                    <form onSubmit={handleAddHackathon} className="space-y-4">
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div className="space-y-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Instance Name</label>
                                                <input type="text" required className="input-field" value={newHackathon.hackathon_name} onChange={(e) => setNewHackathon({ ...newHackathon, hackathon_name: e.target.value })} placeholder="e.g. Smart India 2026" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Start Date</label>
                                                <input type="date" required className="input-field" value={newHackathon.start_date.split('T')[0]} onChange={(e) => setNewHackathon({ ...newHackathon, start_date: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">End Date</label>
                                                <input type="date" required className="input-field" value={newHackathon.end_date.split('T')[0]} onChange={(e) => setNewHackathon({ ...newHackathon, end_date: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-white/30">
                                            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary text-sm px-6">Cancel</button>
                                            <button type="submit" className="btn-cyan text-sm px-6">{editHackathonId ? 'Apply Patch' : 'Deploy Instance'}</button>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Hackathons List */}
                        {hackathons.length === 0 ? (
                            <motion.div variants={itemVariants} className="card p-12 text-center border-dashed border border-slate-300 bg-white/30">
                                <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                                <h3 className="text-lg font-bold text-slate-600">No active instances</h3>
                                <p className="mt-2 text-slate-500 text-sm font-medium">Initialize your first hackathon deployment to start tracking projects.</p>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {hackathons.map((h) => (
                                    <motion.div variants={itemVariants} key={h._id} className="group relative">
                                        <div className="card p-5 block group-hover:-translate-y-1 transform transition-all duration-300 border-l-[4px] border-l-white/60 hover:border-l-[#3b82f6]">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10">
                                                <Link to={`/dashboard/hackathon/${h._id}`} className="flex-1">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="h-3 w-3 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)] border border-white/50" />
                                                        <h4 className="text-lg font-bold text-slate-800 group-hover:text-[#3b82f6] transition-colors uppercase tracking-wide">
                                                            {h.hackathon_name}
                                                        </h4>
                                                    </div>
                                                    <div className="mt-2 flex items-center text-[10px] sm:text-xs text-slate-500 font-bold ml-6">
                                                        <Calendar size={12} className="mr-1.5 text-[#8b5cf6]" />
                                                        {new Date(h.start_date).toLocaleDateString()} <span className="mx-2 opacity-50">→</span> {new Date(h.end_date).toLocaleDateString()}
                                                    </div>
                                                </Link>

                                                <div className="flex items-center space-x-2 mt-4 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => { setShowAddForm(true); setEditHackathonId(h._id); setNewHackathon({ hackathon_name: h.hackathon_name, start_date: h.start_date, end_date: h.end_date }); }}
                                                        className="p-2.5 bg-white/50 hover:bg-white/70 text-slate-500 hover:text-[#8b5cf6] rounded-xl border border-white/60 transition-colors shadow-sm"
                                                        title="Edit Configuration"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteHackathon(h._id)}
                                                        className="p-2.5 bg-white/50 hover:bg-red-50 text-slate-500 hover:text-red-500 rounded-xl border border-white/60 hover:border-red-200 transition-colors shadow-sm"
                                                        title="Terminate Instance"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}

                        {/* Leaderboard Section */}
                        <motion.div variants={itemVariants} className="mt-12 backdrop-blur-3xl bg-white/40 rounded-3xl p-8 border border-white/80 shadow-2xl shadow-blue-900/5">
                            <div className="mb-0">
                                <Leaderboard user={user} />
                            </div>
                        </motion.div>

                        {/* ACTIVITY LOGS SECTION */}
                        <motion.div variants={itemVariants} className="card p-8 bg-white/60 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-8 border-b border-white/40 pb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Database size={18} className="text-[#3b82f6]" /> Team Activities
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">Operation History Log</p>
                                </div>
                                <span className="p-2 bg-blue-100 rounded-xl text-[#3b82f6] border border-blue-200 shadow-sm animate-pulse">
                                    <Clock size={16} />
                                </span>
                            </div>

                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {activities.length === 0 ? (
                                    <div className="text-center py-10">
                                        <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2 opacity-50" />
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest italic">Listening for system events...</p>
                                    </div>
                                ) : (
                                    activities.map((act, i) => (
                                        <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/40 hover:bg-white/60 transition-all border border-white/80 group">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-white flex items-center justify-center text-[#3b82f6] shadow-sm border border-white/80 group-hover:scale-105 transition-transform">
                                                {act.icon === 'LogIn' ? <TrendingUp size={18} /> :
                                                    act.icon === 'UserPlus' ? <Users size={18} /> :
                                                        act.icon === 'Code2' ? <Code2 size={18} /> :
                                                            act.icon === 'Calendar' ? <Calendar size={18} /> :
                                                                act.icon === 'Artifacts' ? <Database size={18} /> : <Database size={18} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-sm font-bold text-slate-700">{act.detail}</p>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-white/60 px-2 py-0.5 rounded-lg">
                                                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-[#3b82f6] border-b border-[#3b82f6]/20">{act.action}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold">• {new Date(act.timestamp).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default TeamDashboard;

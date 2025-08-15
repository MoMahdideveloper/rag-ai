import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Team } from '../types';

const TeamSettings: React.FC = () => {
    const { token } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const userTeams = await api.get('/api/teams', token);
                setTeams(userTeams);
                if (userTeams.length > 0) {
                    setSelectedTeam(userTeams[0]);
                }
            } catch (error) {
                console.error("Failed to fetch teams", error);
            }
        };
        fetchTeams();
    }, [token]);

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName) return;
        try {
            const newTeam = await api.post('/api/teams', { name: newTeamName }, token);
            setTeams(prev => [...prev, newTeam]);
            setNewTeamName('');
        } catch (error) {
            console.error("Failed to create team", error);
        }
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail || !selectedTeam) return;
        try {
            await api.post(`/api/teams/${selectedTeam.id}/invite`, { email: inviteEmail }, token);
            alert('User invited successfully!');
            setInviteEmail('');
        } catch (error) {
            console.error("Failed to invite user", error);
            alert('Failed to invite user.');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold">Team Management</h2>
                <p className="text-slate-500">Create teams and invite members to collaborate.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Create a New Team</h3>
                <form onSubmit={handleCreateTeam} className="flex gap-4">
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="New Team Name"
                        className="flex-grow p-2 border rounded-md"
                    />
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Create Team</button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Your Teams</h3>
                <select onChange={(e) => setSelectedTeam(teams.find(t => t.id == parseInt(e.target.value)) || null)} className="p-2 border rounded-md w-full mb-4">
                    {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                </select>

                {selectedTeam && (
                    <div>
                        <h4 className="font-semibold">Invite to {selectedTeam.name}</h4>
                        <form onSubmit={handleInviteUser} className="flex gap-4 mt-2">
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="User's email to invite"
                                className="flex-grow p-2 border rounded-md"
                            />
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Invite User</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamSettings;

import { useState, useEffect } from 'react';
import { User, Shield, AlertTriangle, Check, X, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { API_URL } from '@/config';

interface UserData {
    id: string;
    username: string;
    email: string;
    role: string;
    is_verified: boolean;
    created_at: string;
}

export default function UserManagement() {
    const { token } = useAuthStore();
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleUpdate = async (userId: string, newRole: string) => {
        if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

        try {
            const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (res.ok) {
                alert('Role updated successfully');
                fetchUsers();
            } else {
                alert('Failed to update role');
            }
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    if (isLoading) return <div className="text-white/40 font-mono text-sm">Loading users...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">User Management</h2>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                            <th className="p-4">User</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Joined</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-4 font-bold">{user.username}</td>
                                <td className="p-4 text-white/60">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-mono uppercase ${user.role === 'admin' ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/50' :
                                            user.role === 'banned' ? 'bg-red-500/20 text-red-500 border border-red-500/50' :
                                                'bg-white/10 text-white/60'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {user.is_verified ? (
                                        <span className="flex items-center gap-2 text-neon-green text-[10px] font-mono uppercase"><Check size={12} /> Verified</span>
                                    ) : (
                                        <span className="flex items-center gap-2 text-white/20 text-[10px] font-mono uppercase"><Clock size={12} /> Pending</span>
                                    )}
                                </td>
                                <td className="p-4 text-[10px] font-mono text-white/40">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 flex gap-2">
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => handleRoleUpdate(user.id, 'admin')}
                                            className="px-3 py-1 bg-neon-purple/10 hover:bg-neon-purple/20 border border-neon-purple/30 rounded text-[10px] font-mono text-neon-purple uppercase transition-all"
                                        >
                                            Promote
                                        </button>
                                    )}
                                    {user.role !== 'user' && (
                                        <button
                                            onClick={() => handleRoleUpdate(user.id, 'user')}
                                            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] font-mono text-white/60 uppercase transition-all"
                                        >
                                            Demote
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

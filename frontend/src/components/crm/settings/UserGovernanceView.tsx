import { useCallback, useEffect, useState } from 'react';
import {
  Users, Shield, Key, Network, UserPlus, CheckCircle2, Plus, Save, Lock, Unlock,
} from 'lucide-react';
import {
  activateGovernanceUser,
  createGovernanceRole,
  createGovernanceUser,
  deactivateGovernanceUser,
  fetchGovernanceOverview,
  fetchGovernancePermissions,
  fetchGovernanceRoles,
  fetchGovernanceUsers,
  fetchRolePermissionMatrix,
  fetchUserRoleAssignments,
  lockGovernanceUser,
  saveRolePermissionMatrix,
  saveUserRoleAssignments,
  updateGovernancePermission,
  type GovernanceOverview,
  type GovernancePermission,
  type GovernanceRole,
  type GovernanceUser,
} from '../../../lib/settingsUserGovernanceServices';
import { AcademicLoading, AcademicPageHeader, AcademicPageShell, am } from '../AcademicManagement/AcademicManagementUi';

type TabKey = 'users' | 'roles' | 'permissions' | 'mapping' | 'assignment';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'users', label: 'User Management', icon: <Users size={14} /> },
  { key: 'roles', label: 'Role Management', icon: <Shield size={14} /> },
  { key: 'permissions', label: 'Permissions & Access', icon: <Key size={14} /> },
  { key: 'mapping', label: 'Role Permissions Mapping', icon: <Network size={14} /> },
  { key: 'assignment', label: 'User Role Assignment', icon: <UserPlus size={14} /> },
];

export function UserGovernanceView({ initialTab = 'users' }: { initialTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [overview, setOverview] = useState<GovernanceOverview | null>(null);
  const [users, setUsers] = useState<GovernanceUser[]>([]);
  const [roles, setRoles] = useState<GovernanceRole[]>([]);
  const [permissions, setPermissions] = useState<GovernancePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [newUser, setNewUser] = useState({ email: '', displayName: '', userType: 'STAFF', phone: '' });
  const [newRole, setNewRole] = useState({ roleLabel: '', description: '', level: 1 });
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [roleMatrix, setRoleMatrix] = useState<GovernancePermission[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userRoles, setUserRoles] = useState<Array<GovernanceRole & { assigned: boolean }>>([]);
  const [assignmentScope, setAssignmentScope] = useState('INSTITUTION');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, u, r, p] = await Promise.all([
        fetchGovernanceOverview(),
        fetchGovernanceUsers(),
        fetchGovernanceRoles(),
        fetchGovernancePermissions(),
      ]);
      setOverview(ov);
      setUsers(u.users);
      setRoles(r.roles);
      setPermissions(p.permissions);
      if (!selectedRoleId && r.roles[0]) setSelectedRoleId(r.roles[0].id);
      if (!selectedUserId && u.users[0]) setSelectedUserId(u.users[0].id);
    } finally {
      setLoading(false);
    }
  }, [selectedRoleId, selectedUserId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!selectedRoleId || tab !== 'mapping') return;
    void fetchRolePermissionMatrix(selectedRoleId).then((res) => setRoleMatrix(res.permissions));
  }, [selectedRoleId, tab]);

  useEffect(() => {
    if (!selectedUserId || tab !== 'assignment') return;
    void fetchUserRoleAssignments(selectedUserId).then((res) => setUserRoles(res.roles));
  }, [selectedUserId, tab]);

  const handleCreateUser = async () => {
    const res = await createGovernanceUser(newUser);
    setMessage(`${res.message} Temp password: ${res.tempPassword}`);
    setNewUser({ email: '', displayName: '', userType: 'STAFF', phone: '' });
    void load();
  };

  const handleCreateRole = async () => {
    const res = await createGovernanceRole(newRole);
    setMessage(res.message);
    setNewRole({ roleLabel: '', description: '', level: 1 });
    void load();
  };

  const handleSaveMatrix = async () => {
    const ids = roleMatrix.filter((p) => p.granted).map((p) => p.id);
    const res = await saveRolePermissionMatrix(selectedRoleId, ids);
    setMessage((res as { message?: string }).message || 'Role permissions saved');
    void load();
  };

  const handleSaveAssignments = async () => {
    const ids = userRoles.filter((r) => r.assigned).map((r) => r.id);
    const res = await saveUserRoleAssignments(selectedUserId, ids, assignmentScope);
    setMessage((res as { message?: string }).message || 'User roles assigned');
    void load();
  };

  const togglePermission = async (perm: GovernancePermission, field: keyof GovernancePermission) => {
    if (tab === 'permissions') {
      const updated = { ...perm, [field]: !perm[field] };
      await updateGovernancePermission(perm.id, { [field]: updated[field] as boolean });
      void load();
    }
  };

  const toggleMatrixGrant = (permId: string) => {
    setRoleMatrix((rows) => rows.map((p) => (p.id === permId ? { ...p, granted: !p.granted } : p)));
  };

  const toggleUserRole = (roleId: string) => {
    setUserRoles((rows) => rows.map((r) => (r.id === roleId ? { ...r, assigned: !r.assigned } : r)));
  };

  if (loading && !overview) return <AcademicLoading label="Loading user governance…" />;

  return (
    <AcademicPageShell>
      <AcademicPageHeader
        breadcrumb="Settings Management › User Governance & Access Control"
        title="User Governance & Access Control"
        subtitle="Provision users, define roles, map permissions, and assign access across Staff, Students, and Parents"
      />

      <div className={am.content}>
        {message && (
          <div className="mb-4 px-4 py-2 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-200 flex items-center gap-2">
            <CheckCircle2 size={16} />{message}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2 mb-4">
          {[
            { label: 'Users', value: overview?.stats.users ?? 0 },
            { label: 'Active', value: overview?.stats.activeUsers ?? 0 },
            { label: 'Locked', value: overview?.stats.lockedUsers ?? 0 },
            { label: 'Pending', value: overview?.stats.pendingUsers ?? 0 },
            { label: 'Roles', value: overview?.stats.roles ?? 0 },
            { label: 'Permissions', value: overview?.stats.permissions ?? 0 },
            { label: 'Assignments', value: overview?.stats.assignments ?? 0 },
            { label: 'Mappings', value: overview?.stats.rolePermissionCount ?? 0 },
          ].map((s) => (
            <div key={s.label} className={`${am.card} p-2 text-center`}>
              <p className="text-[10px] text-slate-500 font-semibold">{s.label}</p>
              <p className="text-base font-bold text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border ${
                tab === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <div className="space-y-4">
            <div className={`${am.card} grid grid-cols-1 md:grid-cols-4 gap-2`}>
              <input className={am.input} placeholder="Email" value={newUser.email} onChange={(e) => setNewUser((f) => ({ ...f, email: e.target.value }))} />
              <input className={am.input} placeholder="Display name" value={newUser.displayName} onChange={(e) => setNewUser((f) => ({ ...f, displayName: e.target.value }))} />
              <select className={am.input} value={newUser.userType} onChange={(e) => setNewUser((f) => ({ ...f, userType: e.target.value }))}>
                <option value="STAFF">Staff</option>
                <option value="STUDENT">Student</option>
                <option value="PARENT">Parent</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button type="button" onClick={() => void handleCreateUser()} className={am.btnPrimary}><Plus size={12} /> Add User</button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50">{['Name', 'Email', 'Type', 'Status', 'Roles', 'Actions'].map((h) => <th key={h} className="text-left px-3 py-2 font-bold text-slate-600">{h}</th>)}</tr></thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">{u.displayName}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.userType}</td>
                      <td className="px-3 py-2">{u.accountStatus}</td>
                      <td className="px-3 py-2">{u.roleAssignments.map((a) => a.role.roleLabel).join(', ') || '—'}</td>
                      <td className="px-3 py-2 flex gap-1">
                        {u.accountStatus !== 'LOCKED' && (
                          <button type="button" className={am.btnSecondary} onClick={() => void lockGovernanceUser(u.id).then(() => load())}><Lock size={10} /></button>
                        )}
                        {u.accountStatus === 'LOCKED' && (
                          <button type="button" className={am.btnSecondary} onClick={() => void activateGovernanceUser(u.id).then(() => load())}><Unlock size={10} /></button>
                        )}
                        {u.accountStatus === 'ACTIVE' && (
                          <button type="button" className={am.btnSecondary} onClick={() => void deactivateGovernanceUser(u.id).then(() => load())}>Deactivate</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'roles' && (
          <div className="space-y-4">
            <div className={`${am.card} grid grid-cols-1 md:grid-cols-4 gap-2`}>
              <input className={am.input} placeholder="Role label" value={newRole.roleLabel} onChange={(e) => setNewRole((f) => ({ ...f, roleLabel: e.target.value }))} />
              <input className={am.input} placeholder="Description" value={newRole.description} onChange={(e) => setNewRole((f) => ({ ...f, description: e.target.value }))} />
              <input className={am.input} type="number" placeholder="Level" value={newRole.level} onChange={(e) => setNewRole((f) => ({ ...f, level: Number(e.target.value) }))} />
              <button type="button" onClick={() => void handleCreateRole()} className={am.btnPrimary}><Plus size={12} /> Create Role</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {roles.map((r) => (
                <div key={r.id} className={`${am.card} p-3`}>
                  <p className="font-bold text-sm text-slate-800">{r.roleLabel} <span className="text-slate-400 font-normal">({r.roleCode})</span></p>
                  <p className="text-xs text-slate-500 mt-1">{r.description || 'No description'}</p>
                  <p className="text-[10px] text-slate-400 mt-2">Level {r.level} · {r._count.permissions} permissions · {r._count.userAssignments} users{r.isSystem ? ' · System' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'permissions' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  {['Feature', 'Label', 'C', 'R', 'U', 'D', 'X', 'API Route'].map((h) => <th key={h} className="text-left px-3 py-2 font-bold text-slate-600">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{p.featureArea}</td>
                    <td className="px-3 py-2">{p.label}</td>
                    {(['canCreate', 'canRead', 'canUpdate', 'canDelete', 'canExport'] as const).map((field) => (
                      <td key={field} className="px-3 py-2">
                        <input type="checkbox" checked={p[field]} onChange={() => void togglePermission(p, field)} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-slate-500">{p.apiRoute}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'mapping' && (
          <div className="space-y-3">
            <select className={am.input} style={{ maxWidth: 280 }} value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.roleLabel}</option>)}
            </select>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead><tr className="bg-slate-50"><th className="px-3 py-2 text-left">Grant</th><th className="px-3 py-2 text-left">Permission</th><th className="px-3 py-2 text-left">Feature</th></tr></thead>
                <tbody>
                  {roleMatrix.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-3 py-2"><input type="checkbox" checked={!!p.granted} onChange={() => toggleMatrixGrant(p.id)} /></td>
                      <td className="px-3 py-2">{p.label}</td>
                      <td className="px-3 py-2">{p.featureArea}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => void handleSaveMatrix()} className={am.btnPrimary}><Save size={12} /> Save Mapping & Invalidate Sessions</button>
          </div>
        )}

        {tab === 'assignment' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <select className={am.input} style={{ maxWidth: 280 }} value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.displayName} ({u.email})</option>)}
              </select>
              <select className={am.input} style={{ maxWidth: 180 }} value={assignmentScope} onChange={(e) => setAssignmentScope(e.target.value)}>
                <option value="INSTITUTION">Institution</option>
                <option value="DEPARTMENT">Department</option>
                <option value="CLASS">Class</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {userRoles.map((r) => (
                <label key={r.id} className={`${am.card} p-3 flex items-center gap-2 cursor-pointer`}>
                  <input type="checkbox" checked={r.assigned} onChange={() => toggleUserRole(r.id)} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.roleLabel}</p>
                    <p className="text-[10px] text-slate-500">{r.roleCode} · Level {r.level}</p>
                  </div>
                </label>
              ))}
            </div>
            <button type="button" onClick={() => void handleSaveAssignments()} className={am.btnPrimary}><Save size={12} /> Save Assignment & Reload Auth Context</button>
          </div>
        )}
      </div>
    </AcademicPageShell>
  );
}

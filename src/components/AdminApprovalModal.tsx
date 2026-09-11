import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Phone,
  Mail,
  Search,
  RefreshCw,
  Clock,
  DollarSign,
  UserCheck,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { safeParseResponse, getLocalUsersDb, saveLocalUsersDb, playRegistrationChime } from '../utils/authClient';

interface AdminApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminEmail: string;
}

export const AdminApprovalModal: React.FC<AdminApprovalModalProps> = ({
  isOpen,
  onClose,
  adminEmail,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [customerEmailToApprove, setCustomerEmailToApprove] = useState('');
  const [isApprovingEmail, setIsApprovingEmail] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevPendingCountRef = React.useRef<number | null>(null);

  const fetchUsers = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const localUsers = getLocalUsersDb();

      const res = await fetch(`/api/admin/users?adminEmail=${encodeURIComponent(adminEmail)}`);
      const parsed = await safeParseResponse(res);
      let merged: UserAccount[] = [];

      if (parsed.ok && Array.isArray(parsed.data?.users)) {
        const serverUsers: UserAccount[] = parsed.data.users;
        const map = new Map<string, UserAccount>();
        localUsers.forEach((u) => map.set(u.email.toLowerCase(), u));
        serverUsers.forEach((u) => map.set(u.email.toLowerCase(), u));
        merged = Array.from(map.values());
      } else {
        merged = [...localUsers];
      }

      // Sort: Pending users first, then newest registration first
      merged.sort((a, b) => {
        if (a.status === 'PENDING_APPROVAL' && b.status !== 'PENDING_APPROVAL') return -1;
        if (a.status !== 'PENDING_APPROVAL' && b.status === 'PENDING_APPROVAL') return 1;
        return (b.registeredAt || 0) - (a.registeredAt || 0);
      });

      const pendingNow = merged.filter((u) => u.status === 'PENDING_APPROVAL').length;
      if (
        prevPendingCountRef.current !== null &&
        pendingNow > prevPendingCountRef.current &&
        soundEnabled
      ) {
        playRegistrationChime();
      }
      prevPendingCountRef.current = pendingNow;

      setUsers(merged);
      saveLocalUsersDb(merged);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Silent notice: using local users state for admin:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      prevPendingCountRef.current = null;
      return;
    }

    fetchUsers(true);

    // 1-second real-time auto polling so TwoStarTrader sees new sign-ups immediately
    const interval = setInterval(() => {
      fetchUsers(false);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, adminEmail, soundEnabled]);

  const handleApproveByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTarget = customerEmailToApprove.trim().toLowerCase();
    if (!cleanTarget) return;

    setIsApprovingEmail(true);
    setActionMessage(null);

    // 1. Update local DB immediately
    const localUsers = getLocalUsersDb();
    let userIndex = localUsers.findIndex((u) => u.email.toLowerCase() === cleanTarget);
    if (userIndex !== -1) {
      localUsers[userIndex].status = 'APPROVED';
      localUsers[userIndex].approvedAt = Date.now();
    } else {
      localUsers.push({
        id: `usr-pre-${Date.now()}`,
        name: cleanTarget.split('@')[0],
        email: cleanTarget,
        phone: '',
        role: 'USER',
        status: 'APPROVED',
        paymentProofNotes: 'Pre-approved by TwoStarTrader',
        registeredAt: Date.now(),
        approvedAt: Date.now(),
      });
    }
    saveLocalUsersDb(localUsers);
    setUsers([...localUsers]);

    // 2. Sync to server
    try {
      const res = await fetch('/api/admin/approve-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail,
          customerEmail: cleanTarget,
        }),
      });
      const parsed = await safeParseResponse(res);
      if (parsed.ok) {
        setActionMessage(parsed.data?.message || `Access granted for ${customerEmailToApprove}!`);
      } else {
        setActionMessage(`Approved locally for ${customerEmailToApprove}!`);
      }
      setCustomerEmailToApprove('');
      fetchUsers();
    } catch {
      setActionMessage(`Approved locally for ${customerEmailToApprove}!`);
      setCustomerEmailToApprove('');
    } finally {
      setIsApprovingEmail(false);
    }
  };

  const handleApprove = async (userId: string, userName: string) => {
    // Update locally
    const localUsers = getLocalUsersDb();
    const target = localUsers.find((u) => u.id === userId);
    if (target) {
      target.status = 'APPROVED';
      target.approvedAt = Date.now();
      saveLocalUsersDb(localUsers);
      setUsers([...localUsers]);
    }
    setActionMessage(`Approved access for ${userName} ($15 confirmed)!`);

    // Sync to server
    try {
      await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, userId }),
      });
      fetchUsers();
    } catch (err) {
      console.warn('Server sync notice:', err);
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    // Update locally
    const localUsers = getLocalUsersDb();
    const target = localUsers.find((u) => u.id === userId);
    if (target) {
      target.status = 'PENDING_APPROVAL';
      saveLocalUsersDb(localUsers);
      setUsers([...localUsers]);
    }
    setActionMessage(`Access revoked for ${userName}.`);

    // Sync to server
    try {
      await fetch('/api/admin/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, userId }),
      });
      fetchUsers();
    } catch (err) {
      console.warn('Server sync notice:', err);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove user "${userName}"?`)) return;

    // Update locally
    const localUsers = getLocalUsersDb().filter((u) => u.id !== userId);
    saveLocalUsersDb(localUsers);
    setUsers(localUsers);
    setActionMessage(`User ${userName} deleted.`);

    // Sync to server
    try {
      await fetch('/api/admin/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminEmail, userId }),
      });
      fetchUsers();
    } catch (err) {
      console.warn('Server sync notice:', err);
    }
  };

  if (!isOpen) return null;

  const pendingCount = users.filter((u) => u.status === 'PENDING_APPROVAL').length;

  const filteredUsers = users.filter((u) => {
    if (filter === 'PENDING' && u.status !== 'PENDING_APPROVAL') return false;
    if (filter === 'APPROVED' && u.status !== 'APPROVED') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q))
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">TwoStarTrader Manual Approval Console</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                  $15 Gatekeeper
                </span>
              </div>
              <p className="text-xs text-slate-400">Manage, verify, and approve traders for the XAU/USD Scalper</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-Time Live Sync Status Bar */}
        <div className="bg-slate-950 px-6 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold text-[11px] tracking-wide">
              REAL-TIME AUTO-SYNC: ACTIVE (1s)
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-400 text-[11px] hidden sm:inline">
              Syncing sign-ups every second
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 hover:bg-sky-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300'
              }`}
              title={soundEnabled ? 'Chime sound plays when someone creates an account' : 'Sound alerts muted'}
            >
              {soundEnabled ? <Volume2 className="w-3 h-3 text-sky-400" /> : <VolumeX className="w-3 h-3" />}
              <span>{soundEnabled ? 'Chime On' : 'Muted'}</span>
            </button>

            <span className="text-slate-400 text-[11px] font-mono">
              Pending: <strong className="text-amber-400 font-bold">{pendingCount}</strong>
            </span>
          </div>
        </div>

        {/* Action notification banner */}
        {actionMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs text-emerald-800 font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </span>
            <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Order Website to Approve by Customer Email Box */}
        <div className="bg-gradient-to-r from-amber-50 via-sky-50 to-amber-50 border-b border-amber-200/80 p-4 sm:p-5">
          <form onSubmit={handleApproveByEmail} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500 text-slate-950 shadow-2xs">
                  <UserCheck className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
                    Order Website to Approve Customer by Email
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Enter the customer's email address below who paid $15. Clicking this immediately gives them permission to use the indicator.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow-2xs">
                $15 Access Command
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={customerEmailToApprove}
                  onChange={(e) => setCustomerEmailToApprove(e.target.value)}
                  placeholder="Enter customer email address (e.g. trader@gmail.com)"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-amber-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={isApprovingEmail || !customerEmailToApprove.trim()}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>{isApprovingEmail ? 'Approving...' : 'Approve & Give Permission'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Controls: Search, Tabs, Refresh */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filter === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Verification</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-900 text-amber-100 font-bold">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                filter === 'APPROVED'
                  ? 'bg-emerald-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Members</span>
            </button>

            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === 'ALL'
                  ? 'bg-slate-800 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Users ({users.length})
            </button>
          </div>

          {/* Search Bar & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, phone..."
                className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-hidden"
              />
            </div>

            <button
              onClick={() => fetchUsers(true)}
              disabled={loading}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
              title="Refresh users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold">No users found in this category.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                New sign-ups awaiting $15 payment verification will appear here.
              </p>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isApproved = u.status === 'APPROVED';
              const isPending = u.status === 'PENDING_APPROVAL';
              const secondsAgo = Math.max(0, Math.floor((Date.now() - (u.registeredAt || 0)) / 1000));
              const isJustCreated = isPending && secondsAgo < 90;
              const isRecent = isPending && secondsAgo < 600;

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isJustCreated
                      ? 'bg-amber-100/70 border-amber-400 ring-2 ring-amber-400/40 shadow-sm'
                      : isPending
                      ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Left: User Details */}
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                      {u.role === 'ADMIN' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-900 text-amber-400">
                          ADMIN
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : isPending
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {isApproved ? '✓ APPROVED ($15)' : isPending ? '⏳ AWAITING $15' : 'REJECTED'}
                      </span>

                      {/* Real-Time Just Registered Pulse Badge */}
                      {isJustCreated && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse shadow-xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          <span>🔥 JUST CREATED ({secondsAgo}s ago)</span>
                        </span>
                      )}
                      {isRecent && !isJustCreated && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/70 text-amber-900 border border-amber-300">
                          ⚡ {Math.floor(secondsAgo / 60)}m ago
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1 text-slate-700">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{u.email}</span>
                      </span>

                      {u.phone && (
                        <span className="flex items-center gap-1 text-slate-700">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <a
                            href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline text-emerald-700 font-bold"
                          >
                            {u.phone}
                          </a>
                        </span>
                      )}

                      <span className="text-slate-400">
                        {secondsAgo < 60
                          ? `Registered ${secondsAgo}s ago`
                          : secondsAgo < 3600
                          ? `Registered ${Math.floor(secondsAgo / 60)}m ago`
                          : `Reg: ${new Date(u.registeredAt).toLocaleDateString()}`}
                      </span>
                    </div>

                    {u.paymentProofNotes && (
                      <div className="mt-1 p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                        <strong>Payment Note:</strong> {u.paymentProofNotes}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Direct WhatsApp Contact Button for Quick Chat */}
                    {u.phone && (
                      <a
                        href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hello ${u.name}! This is TwoStarTrader. I see your account sign-up for the XAU/USD Gold Scalper.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        title="Chat on WhatsApp"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {/* Approve Button */}
                    {!isApproved && (
                      <button
                        onClick={() => handleApprove(u.id, u.name)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Access ($15)</span>
                      </button>
                    )}

                    {/* Revoke Button */}
                    {isApproved && u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleReject(u.id, u.name)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="Revoke access"
                      >
                        Revoke
                      </button>
                    )}

                    {/* Delete User */}
                    {u.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Owner: <strong>TwoStarTrader</strong> (khrafiullah2@gmail.com)
          </span>
          <span>Contacts: 03110116709 • 03188154587</span>
        </div>
      </div>
    </div>
  );
};

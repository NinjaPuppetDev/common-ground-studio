import { useState, useRef, useEffect } from 'react';
import {
  LogIn,
  LogOut,
  User as UserIcon,
  Shield,
  KeyRound,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthHeaderButton() {
  const {
    user,
    isAdmin,
    quota,
    guestSearchesUsed,
    maxGuestSearches,
    openAuthModal,
    signOut,
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If user is not logged in: show clean Sign In button
  if (!user) {
    const remainingGuests = Math.max(0, maxGuestSearches - guestSearchesUsed);

    return (
      <div className="flex items-center gap-2">
        <button
          id="header-sign-in-btn"
          type="button"
          onClick={() => openAuthModal('login')}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-emerald-400 text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
          {remainingGuests > 0 ? (
            <span className="hidden sm:inline-block ml-1 px-1.5 py-0.2 rounded text-[10px] bg-white/20 dark:bg-slate-950/20 font-mono">
              {remainingGuests} free left
            </span>
          ) : (
            <span className="hidden sm:inline-block ml-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-400/30 text-amber-200 dark:text-slate-900 font-mono font-bold">
              Limit reached
            </span>
          )}
        </button>
      </div>
    );
  }

  // User is logged in: Display avatar, email, quota badge, dropdown
  const emailDisplay = user.email || 'Authenticated User';
  const initial = (emailDisplay[0] || 'U').toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="user-profile-header-btn"
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 text-xs transition-all cursor-pointer"
      >
        {/* User avatar initial */}
        <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shadow-sm font-mono">
          {initial}
        </div>

        {/* User info snippet */}
        <div className="hidden sm:flex flex-col text-left">
          <span className="font-semibold text-slate-900 dark:text-slate-100 max-w-[130px] truncate leading-tight">
            {emailDisplay.split('@')[0]}
          </span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
            {isAdmin ? 'UNLIMITED (ADMIN)' : `${quota.remaining ?? 10} searches left`}
          </span>
        </div>

        {/* Admin Badge */}
        {isAdmin && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-[9px] font-mono font-bold text-emerald-800 dark:text-emerald-300 hidden md:inline-block">
            ADMIN
          </span>
        )}

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {/* Profile Dropdown */}
      {dropdownOpen && (
        <div
          id="user-profile-dropdown"
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-fade-in text-xs"
        >
          {/* Header Info */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
              <UserIcon className="w-3 h-3" />
              <span>LOGGED IN AS</span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
              {emailDisplay}
            </p>

            {/* Quota / Admin status card */}
            <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">Rate Limit:</span>
                {isAdmin ? (
                  <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Exempt (Unlimited)
                  </span>
                ) : (
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                    {quota.remaining ?? 10} / {quota.limit ?? 10} per hr
                  </span>
                )}
              </div>
              {isAdmin && (
                <p className="text-[10px] text-slate-500 italic">
                  Verified developer address with continuous execution privilege.
                </p>
              )}
            </div>
          </div>

          {/* Action Links */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                openAuthModal('update_password');
              }}
              className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Change Password</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                signOut();
              }}
              className="w-full px-4 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

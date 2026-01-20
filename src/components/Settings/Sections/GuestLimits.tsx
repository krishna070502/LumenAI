'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2, Users, MessageSquare, Search } from 'lucide-react';
import { toast } from 'sonner';

const GuestLimits = () => {
    const [guestChatLimit, setGuestChatLimit] = useState<number>(10);
    const [guestResearchLimit, setGuestResearchLimit] = useState<number>(5);
    const [guestLimitPeriod, setGuestLimitPeriod] = useState<'session' | 'daily'>('daily');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchLimits = async () => {
            try {
                const res = await fetch('/api/admin/guest-limits');
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                setGuestChatLimit(data.guestChatLimit ?? 10);
                setGuestResearchLimit(data.guestResearchLimit ?? 5);
                setGuestLimitPeriod(data.guestLimitPeriod ?? 'daily');
            } catch (error) {
                console.error('Error fetching guest limits:', error);
                toast.error('Failed to load guest limits');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLimits();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/guest-limits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guestChatLimit,
                    guestResearchLimit,
                    guestLimitPeriod,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save');
            }

            toast.success('Guest limits saved successfully');
        } catch (error: any) {
            console.error('Error saving guest limits:', error);
            toast.error(error.message || 'Failed to save guest limits');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-4 border-b border-light-200 dark:border-dark-200">
                <Users className="w-5 h-5 text-orange-500" />
                <div>
                    <h3 className="text-sm font-medium text-black dark:text-white">
                        Guest User Limits
                    </h3>
                    <p className="text-xs text-black/60 dark:text-white/60">
                        Configure message limits for non-logged-in users
                    </p>
                </div>
            </div>

            {/* Chat Mode Limit */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                    <label className="text-sm font-medium text-black dark:text-white">
                        Chat Mode Limit
                    </label>
                </div>
                <p className="text-xs text-black/60 dark:text-white/60 ml-6">
                    Maximum messages per guest in Chat mode
                </p>
                <input
                    type="number"
                    min="0"
                    max="1000"
                    value={guestChatLimit}
                    onChange={(e) => setGuestChatLimit(parseInt(e.target.value) || 0)}
                    className="ml-6 w-24 px-3 py-2 bg-light-secondary dark:bg-dark-secondary rounded-lg text-sm text-black dark:text-white border border-light-200 dark:border-dark-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Research Mode Limit */}
            <div className="space-y-2">
                <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-green-500" />
                    <label className="text-sm font-medium text-black dark:text-white">
                        Research Mode Limit
                    </label>
                </div>
                <p className="text-xs text-black/60 dark:text-white/60 ml-6">
                    Maximum messages per guest in Research mode (uses more resources)
                </p>
                <input
                    type="number"
                    min="0"
                    max="1000"
                    value={guestResearchLimit}
                    onChange={(e) => setGuestResearchLimit(parseInt(e.target.value) || 0)}
                    className="ml-6 w-24 px-3 py-2 bg-light-secondary dark:bg-dark-secondary rounded-lg text-sm text-black dark:text-white border border-light-200 dark:border-dark-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
            </div>

            {/* Limit Period */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-black dark:text-white">
                    Limit Reset Period
                </label>
                <p className="text-xs text-black/60 dark:text-white/60">
                    How often the guest message counter resets
                </p>
                <div className="flex space-x-4">
                    <button
                        onClick={() => setGuestLimitPeriod('session')}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${guestLimitPeriod === 'session'
                                ? 'bg-purple-500 text-white'
                                : 'bg-light-secondary dark:bg-dark-secondary text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200'
                            }`}
                    >
                        Per Session
                    </button>
                    <button
                        onClick={() => setGuestLimitPeriod('daily')}
                        className={`px-4 py-2 text-sm rounded-lg transition-colors ${guestLimitPeriod === 'daily'
                                ? 'bg-purple-500 text-white'
                                : 'bg-light-secondary dark:bg-dark-secondary text-black/70 dark:text-white/70 hover:bg-light-200 dark:hover:bg-dark-200'
                            }`}
                    >
                        Daily
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                    <strong>Note:</strong> Setting a limit to 0 will completely disable that mode for guest users.
                    Guest usage is tracked via browser cookies/localStorage.
                </p>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
                {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Save className="w-4 h-4" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
        </div>
    );
};

export default GuestLimits;

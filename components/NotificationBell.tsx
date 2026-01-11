import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, X, Check, Trash2, Snowflake, ChevronRight } from 'lucide-react';
import * as api from '../services/api';

interface NotificationBellProps {
  onSelectResort?: (resortName: string) => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onSelectResort }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<api.AlertNotification[]>([]);
  const [subscriptions, setSubscriptions] = useState<api.AlertSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'subscriptions'>('notifications');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load data when opened
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Poll for new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        api.getNotifications().then(setNotifications).catch(() => {});
      }
    }, 60000); // Check every minute

    // Initial load
    api.getNotifications().then(setNotifications).catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notifs, subs] = await Promise.all([
        api.getNotifications(true),
        api.getMyAlerts(),
      ]);
      setNotifications(notifs);
      setSubscriptions(subs);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleUnsubscribe = async (id: number) => {
    try {
      await api.unsubscribeAlert(id);
      setSubscriptions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getThresholdColor = (threshold: string) => {
    switch (threshold) {
      case 'light': return 'bg-cyan-100 text-cyan-700';
      case 'good': return 'bg-blue-100 text-blue-700';
      case 'great': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all ${
          isOpen 
            ? 'bg-blue-100 text-blue-600' 
            : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
        }`}
        title="Snow Alerts"
      >
        {unreadCount > 0 ? (
          <BellRing size={20} className="animate-pulse" />
        ) : (
          <Bell size={20} />
        )}
        
        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BellRing size={18} />
                <span className="font-semibold">Snow Alerts</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'subscriptions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              My Alerts ({subscriptions.length})
            </button>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                Loading...
              </div>
            ) : activeTab === 'notifications' ? (
              notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Snowflake size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Subscribe to resort alerts to get notified!
                  </p>
                </div>
              ) : (
                <>
                  {/* Mark all read button */}
                  {unreadCount > 0 && (
                    <div className="px-4 py-2 border-b border-slate-100">
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                  
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notif.isRead ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => {
                        handleMarkRead(notif.id);
                        if (notif.resortName && onSelectResort) {
                          onSelectResort(notif.resortName);
                          setIsOpen(false);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          notif.predictedSnow >= 15 ? 'bg-purple-100 text-purple-600' :
                          notif.predictedSnow >= 5 ? 'bg-blue-100 text-blue-600' :
                          'bg-cyan-100 text-cyan-600'
                        }`}>
                          <Snowflake size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-slate-800 truncate">
                              {notif.title}
                            </p>
                            {!notif.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  ))}
                </>
              )
            ) : (
              subscriptions.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-500 text-sm">No active alerts</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Click the bell icon on any resort to subscribe!
                  </p>
                </div>
              ) : (
                subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (onSelectResort) {
                            onSelectResort(sub.resortName);
                            setIsOpen(false);
                          }
                        }}
                      >
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {sub.resortName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getThresholdColor(sub.threshold)}`}>
                            {sub.thresholdLabel}
                          </span>
                          <span className="text-xs text-slate-400">
                            {sub.timeframe} days
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnsubscribe(sub.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Unsubscribe"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

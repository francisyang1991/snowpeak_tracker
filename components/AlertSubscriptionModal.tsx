import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X, Snowflake, Check, Loader2 } from 'lucide-react';
import * as api from '../services/api';

interface AlertSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  resortId: string;
  resortName: string;
  onSubscribed?: () => void;
}

const THRESHOLDS = [
  { 
    id: 'light' as const, 
    label: 'Light Snow', 
    range: '1-5"',
    color: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    activeColor: 'bg-cyan-500 text-white border-cyan-500',
    icon: '🩵',
  },
  { 
    id: 'good' as const, 
    label: 'Good Snow', 
    range: '5-15"',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    activeColor: 'bg-blue-500 text-white border-blue-500',
    icon: '🔵',
  },
  { 
    id: 'great' as const, 
    label: 'Great Snow', 
    range: '15-30"',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    activeColor: 'bg-purple-500 text-white border-purple-500',
    icon: '🟣',
  },
];

const TIMEFRAMES = [
  { id: 5 as const, label: 'Next 5 Days' },
  { id: 10 as const, label: 'Next 10 Days' },
];

const AlertSubscriptionModal: React.FC<AlertSubscriptionModalProps> = ({
  isOpen,
  onClose,
  resortId,
  resortName,
  onSubscribed,
}) => {
  const [threshold, setThreshold] = useState<'light' | 'good' | 'great'>('good');
  const [timeframe, setTimeframe] = useState<5 | 10>(5);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingSubscription, setExistingSubscription] = useState<api.AlertSubscription | null>(null);

  // Check for existing subscription
  useEffect(() => {
    if (isOpen) {
      api.isSubscribedToResort(resortId).then(sub => {
        if (sub) {
          setExistingSubscription(sub);
          setThreshold(sub.threshold);
          setTimeframe(sub.timeframe as 5 | 10);
        }
      }).catch(() => {});
    }
  }, [isOpen, resortId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.subscribeToAlert({
        resortId,
        resortName,
        threshold,
        timeframe,
        email: email || undefined,
      });

      setIsSuccess(true);
      
      // Show success for a moment, then close
      setTimeout(() => {
        onSubscribed?.();
        onClose();
        setIsSuccess(false);
      }, 1500);
    } catch (err) {
      setError('Failed to subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!existingSubscription) return;
    
    setIsLoading(true);
    try {
      await api.unsubscribeAlert(existingSubscription.id);
      setExistingSubscription(null);
      onClose();
    } catch (err) {
      setError('Failed to unsubscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <BellRing size={20} />
              </div>
              <div>
                <h2 className="font-bold text-lg">Snow Alerts</h2>
                <p className="text-sm text-blue-100">{resortName}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Success State */}
        {isSuccess ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
              <Check size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Alert Set!</h3>
            <p className="text-slate-500">
              We'll notify you when {resortName} has{' '}
              {threshold === 'light' ? '1-5"' : threshold === 'good' ? '5-15"' : '15-30"'}{' '}
              of snow predicted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Threshold Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Alert me when there's at least:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {THRESHOLDS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setThreshold(t.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      threshold === t.id ? t.activeColor : t.color
                    }`}
                  >
                    <div className="text-lg mb-1">{t.icon}</div>
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-xs opacity-80">{t.range}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Timeframe Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Forecast window:
              </label>
              <div className="flex gap-2">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTimeframe(t.id)}
                    className={`flex-1 py-2 px-4 rounded-xl border-2 font-medium transition-all ${
                      timeframe === t.id
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-400 mt-1">
                Get email notifications in addition to in-app alerts
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {existingSubscription ? (
                <>
                  <button
                    type="button"
                    onClick={handleUnsubscribe}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    Unsubscribe
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={18} />
                        Update
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Bell size={18} />
                      Subscribe to Alerts
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AlertSubscriptionModal;

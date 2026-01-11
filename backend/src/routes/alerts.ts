import { Router } from 'express';
import { supabase, getToday, getDaysFromNow } from '../db/supabase.js';

export const alertRoutes = Router();

// Threshold definitions (in inches)
const THRESHOLDS = {
  light: { min: 1, max: 5, label: 'Light Snow (1-5")' },
  good: { min: 5, max: 15, label: 'Good Snow (5-15")' },
  great: { min: 15, max: 30, label: 'Great Snow (15-30")' },
};

/**
 * POST /api/alerts/subscribe
 * Create a new alert subscription
 */
alertRoutes.post('/subscribe', async (req, res) => {
  try {
    const { visitorId, email, resortId, resortName, threshold, timeframe } = req.body;

    // Validate required fields
    if (!visitorId || !resortId || !resortName || !threshold) {
      return res.status(400).json({ 
        error: 'Missing required fields: visitorId, resortId, resortName, threshold' 
      });
    }

    // Validate threshold
    if (!['light', 'good', 'great'].includes(threshold)) {
      return res.status(400).json({ 
        error: 'Invalid threshold. Must be: light, good, or great' 
      });
    }

    // Validate timeframe
    const validTimeframe = timeframe === 10 ? 10 : 5;

    // Create or update subscription (upsert)
    const { data: subscription, error } = await supabase
      .from('alert_subscriptions')
      .upsert({
        visitor_id: visitorId,
        email,
        resort_id: resortId,
        resort_name: resortName,
        threshold,
        timeframe: validTimeframe,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'visitor_id,resort_id',
      })
      .select()
      .single();

    if (error) throw error;

    // Check if there's already snow predicted that meets the threshold
    const alertCheck = await checkForAlerts(subscription.id);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        resortId: subscription.resort_id,
        resortName: subscription.resort_name,
        threshold: subscription.threshold,
        thresholdLabel: THRESHOLDS[threshold as keyof typeof THRESHOLDS].label,
        timeframe: subscription.timeframe,
        isActive: subscription.is_active,
      },
      immediateAlert: alertCheck,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * GET /api/alerts/my
 * Get all alert subscriptions for a visitor
 */
alertRoutes.get('/my', async (req, res) => {
  try {
    const { visitorId } = req.query;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    // Get subscriptions with notifications
    const { data: subscriptions, error } = await supabase
      .from('alert_subscriptions')
      .select('*, alert_notifications(*)')
      .eq('visitor_id', visitorId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format response
    const formatted = (subscriptions || []).map((sub: any) => {
      const unreadNotifs = (sub.alert_notifications || []).filter((n: any) => !n.is_read);
      return {
        id: sub.id,
        resortId: sub.resort_id,
        resortName: sub.resort_name,
        threshold: sub.threshold,
        thresholdLabel: THRESHOLDS[sub.threshold as keyof typeof THRESHOLDS]?.label || sub.threshold,
        timeframe: sub.timeframe,
        isActive: sub.is_active,
        createdAt: sub.created_at,
        unreadNotifications: unreadNotifs.length,
        notifications: unreadNotifs.slice(0, 5).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          predictedSnow: n.predicted_snow,
          forecastDate: n.forecast_date,
          isRead: n.is_read,
          createdAt: n.created_at,
        })),
      };
    });

    res.json({
      count: formatted.length,
      subscriptions: formatted,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

/**
 * DELETE /api/alerts/:id
 * Unsubscribe from an alert
 */
alertRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { visitorId } = req.query;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    // Verify ownership and delete
    const { data: subscription, error: findError } = await supabase
      .from('alert_subscriptions')
      .select('id')
      .eq('id', parseInt(id))
      .eq('visitor_id', visitorId)
      .single();

    if (findError || !subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const { error: deleteError } = await supabase
      .from('alert_subscriptions')
      .delete()
      .eq('id', parseInt(id));

    if (deleteError) throw deleteError;

    res.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * GET /api/alerts/notifications
 * Get all unread notifications for a visitor
 */
alertRoutes.get('/notifications', async (req, res) => {
  try {
    const { visitorId, includeRead } = req.query;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    // Build query
    let query = supabase
      .from('alert_notifications')
      .select('*, alert_subscriptions!inner(visitor_id, resort_id, resort_name)')
      .eq('alert_subscriptions.visitor_id', visitorId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (includeRead !== 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    res.json({
      count: notifications?.length || 0,
      notifications: (notifications || []).map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        predictedSnow: n.predicted_snow,
        forecastDate: n.forecast_date,
        resortId: n.alert_subscriptions.resort_id,
        resortName: n.alert_subscriptions.resort_name,
        isRead: n.is_read,
        createdAt: n.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/alerts/notifications/:id/read
 * Mark a notification as read
 */
alertRoutes.post('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('alert_notifications')
      .update({ is_read: true })
      .eq('id', parseInt(id));

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * POST /api/alerts/notifications/read-all
 * Mark all notifications as read for a visitor
 */
alertRoutes.post('/notifications/read-all', async (req, res) => {
  try {
    const { visitorId } = req.body;

    if (!visitorId) {
      return res.status(400).json({ error: 'visitorId is required' });
    }

    // Get subscription IDs for this visitor
    const { data: subscriptions } = await supabase
      .from('alert_subscriptions')
      .select('id')
      .eq('visitor_id', visitorId);

    if (subscriptions && subscriptions.length > 0) {
      const subscriptionIds = subscriptions.map((s: any) => s.id);
      
      await supabase
        .from('alert_notifications')
        .update({ is_read: true })
        .in('subscription_id', subscriptionIds)
        .eq('is_read', false);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * POST /api/alerts/check
 * Manually trigger alert check for all active subscriptions
 * (This would typically be called by a cron job)
 */
alertRoutes.post('/check', async (req, res) => {
  try {
    const { data: activeSubscriptions, error } = await supabase
      .from('alert_subscriptions')
      .select('id')
      .eq('is_active', true);

    if (error) throw error;

    let triggeredCount = 0;
    
    for (const sub of activeSubscriptions || []) {
      const triggered = await checkForAlerts(sub.id);
      if (triggered) triggeredCount++;
    }

    res.json({
      success: true,
      checked: activeSubscriptions?.length || 0,
      triggered: triggeredCount,
    });
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

/**
 * Helper: Check if a subscription should trigger an alert
 */
async function checkForAlerts(subscriptionId: number): Promise<boolean> {
  try {
    const { data: subscription, error: subError } = await supabase
      .from('alert_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription || !subscription.is_active) return false;

    const threshold = THRESHOLDS[subscription.threshold as keyof typeof THRESHOLDS];
    if (!threshold) return false;

    // Get forecasts for the resort within the timeframe
    const today = getToday();
    const futureDate = getDaysFromNow(subscription.timeframe);

    const { data: forecasts, error: forecastError } = await supabase
      .from('forecasts')
      .select('*')
      .eq('resort_id', subscription.resort_id)
      .gte('forecast_date', today)
      .lte('forecast_date', futureDate)
      .gte('predicted_snow', threshold.min)
      .order('predicted_snow', { ascending: false })
      .limit(1);

    if (forecastError || !forecasts || forecasts.length === 0) return false;

    const forecast = forecasts[0];

    // Check if we already sent a notification for this forecast recently
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentNotification } = await supabase
      .from('alert_notifications')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('forecast_date', forecast.forecast_date)
      .gte('created_at', oneDayAgo)
      .limit(1);

    if (recentNotification && recentNotification.length > 0) return false;

    // Create notification
    const snowLabel = forecast.predicted_snow >= 15 ? '🟣 Great' : 
                      forecast.predicted_snow >= 5 ? '🔵 Good' : '🩵 Light';

    const { error: notifError } = await supabase
      .from('alert_notifications')
      .insert({
        subscription_id: subscriptionId,
        title: `${snowLabel} Snow Alert: ${subscription.resort_name}`,
        message: `${forecast.predicted_snow}" of snow predicted for ${formatDate(forecast.forecast_date)}!`,
        predicted_snow: forecast.predicted_snow,
        forecast_date: forecast.forecast_date,
      });

    if (notifError) {
      console.error('Error creating notification:', notifError);
      return false;
    }

    // Update last triggered
    await supabase
      .from('alert_subscriptions')
      .update({ 
        last_triggered: new Date().toISOString(),
        last_checked: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    return true;
  } catch (error) {
    console.error('Error checking alerts:', error);
    return false;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

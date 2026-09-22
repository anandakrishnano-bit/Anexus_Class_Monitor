package com.anexus.classmanager;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "LiveNotification",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class LiveNotificationPlugin extends Plugin {

    private static final int NOTIFICATION_ID = 1016;
    private PendingIntent sessionEndAlarmIntent;

    private void scheduleExactSessionEndAlarm(long endTimeMillis, int periodNumber, String subjectName, int colorInt) {
        cancelExactSessionEndAlarm();
        Context context = getContext();
        if (context == null || endTimeMillis <= System.currentTimeMillis()) return;

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, SessionEndReceiver.class);
        intent.setAction(SessionEndReceiver.ACTION_SESSION_ENDED);
        intent.putExtra("periodNumber", periodNumber);
        intent.putExtra("subjectName", subjectName);
        intent.putExtra("colorInt", colorInt);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        sessionEndAlarmIntent = PendingIntent.getBroadcast(context, 1017, intent, flags);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endTimeMillis, sessionEndAlarmIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, endTimeMillis, sessionEndAlarmIntent);
            }
        } catch (Exception e) {
            try {
                alarmManager.set(AlarmManager.RTC_WAKEUP, endTimeMillis, sessionEndAlarmIntent);
            } catch (Exception ignored) {}
        }
    }

    private void cancelExactSessionEndAlarm() {
        if (sessionEndAlarmIntent != null && getContext() != null) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                alarmManager.cancel(sessionEndAlarmIntent);
            }
            sessionEndAlarmIntent = null;
        }
    }

    @PluginMethod
    public void showOrUpdateLiveNotification(PluginCall call) {
        try {
            Context context = getContext();
            if (context == null) {
                call.reject("Context is null");
                return;
            }

            String title = call.getString("title", "Class in Session");
            String message = call.getString("message", "Live class activity");
            String subText = call.getString("subText", "Live Progress");
            String capsuleText = call.getString("capsuleText", "");
            int progress = call.getInt("progress", 0);
            int maxProgress = call.getInt("maxProgress", 100);
            boolean isOngoing = call.getBoolean("ongoing", true);
            String accentColorHex = call.getString("accentColor", "#3B82F6");
            int periodNumber = call.getInt("periodNumber", 1);

            long startTimeMillis = 0;
            long endTimeMillis = 0;
            Double startD = call.getDouble("startTimeMillis");
            Double endD = call.getDouble("endTimeMillis");
            if (startD != null) startTimeMillis = startD.longValue();
            if (endD != null) endTimeMillis = endD.longValue();

            String subName = call.getString("subjectName", title);
            String room = call.getString("classroom", "General");
            String faculty = call.getString("facultyName", "Faculty");

            int colorInt = Color.parseColor("#3B82F6");
            try {
                if (accentColorHex != null && accentColorHex.startsWith("#")) {
                    colorInt = Color.parseColor(accentColorHex);
                }
            } catch (Exception ignored) {}

            Bundle data = new Bundle();
            data.putString("title", title);
            data.putString("message", message);
            data.putString("subText", subText);
            data.putString("capsuleText", capsuleText);
            data.putInt("progress", progress);
            data.putInt("maxProgress", maxProgress);
            data.putBoolean("ongoing", isOngoing);
            data.putInt("colorInt", colorInt);
            data.putInt("periodNumber", periodNumber);
            data.putLong("startTimeMillis", startTimeMillis);
            data.putLong("endTimeMillis", endTimeMillis);
            data.putString("subjectName", subName);
            data.putString("classroom", room);
            data.putString("facultyName", faculty);

            // Forward to Foreground Service for background persistence
            LiveClassService.startWithData(context, data);

            // Also schedule exact alarm for battery-saving wakeup when class ends
            if (isOngoing && endTimeMillis > System.currentTimeMillis()) {
                scheduleExactSessionEndAlarm(endTimeMillis, periodNumber, subName, colorInt);
            } else {
                cancelExactSessionEndAlarm();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("notificationId", NOTIFICATION_ID);
            ret.put("originIslandEnabled", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to show live notification: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void dismissLiveNotification(PluginCall call) {
        try {
            cancelExactSessionEndAlarm();

            Context context = getContext();
            if (context != null) {
                LiveClassService.stop(context);

                NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
                try {
                    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, LiveClassService.CHANNEL_ID)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle("Class Manager")
                        .setOngoing(false);
                    Bundle extras = new Bundle();
                    extras.putInt("notification.superx.operation", 2); // 2 = end
                    builder.addExtras(extras);
                    notificationManager.notify(NOTIFICATION_ID, builder.build());
                } catch (Exception ignored) {}

                notificationManager.cancel(NOTIFICATION_ID);
            }

            JSObject ret = new JSObject();
            ret.put("dismissed", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to dismiss live notification: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported", true);
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        ret.put("isAndroid16Plus", Build.VERSION.SDK_INT >= 36);

        String brand = Build.BRAND != null ? Build.BRAND.toLowerCase() : "";
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER.toLowerCase() : "";
        boolean isVivoOrIqoo = brand.contains("vivo") || brand.contains("iqoo") || manufacturer.contains("vivo");
        ret.put("isVivoOrIqoo", isVivoOrIqoo);
        ret.put("brand", Build.BRAND);
        ret.put("manufacturer", Build.MANUFACTURER);
        call.resolve(ret);
    }

    @PluginMethod
    public void openOriginIslandSettings(PluginCall call) {
        try {
            Context context = getContext();
            if (context == null) {
                call.reject("Context is null");
                return;
            }

            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
            } else {
                intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not open notification settings: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Context context = getContext();
            if (context == null) {
                call.reject("Context is null");
                return;
            }

            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                    intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                } else {
                    intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                }
            } else {
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
            }

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            try {
                Intent fallback = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                fallback.setData(Uri.parse("package:" + getContext().getPackageName()));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(fallback);
                JSObject ret = new JSObject();
                ret.put("opened", true);
                call.resolve(ret);
            } catch (Exception ex) {
                call.reject("Could not open battery settings: " + ex.getMessage(), ex);
            }
        }
    }
}

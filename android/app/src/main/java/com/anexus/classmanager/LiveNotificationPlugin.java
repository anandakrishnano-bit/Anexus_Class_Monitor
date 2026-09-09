package com.anexus.classmanager;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

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

    private static final String OLD_CHANNEL_ID = "live_class_activity_channel";
    private static final String CHANNEL_ID = "live_class_activity_v4";
    private static final String CHANNEL_NAME = "Live Class Activity (Ongoing Progress)";
    private static final String CHANNEL_DESC = "Real-time class progress, live countdown chronometer, and ongoing attendance tracking";
    private static final int NOTIFICATION_ID = 1016;

    private boolean isChannelCreated = false;
    private boolean hasCreatedIsland = false;

    // Active session parameters for native background ticker
    private ScheduledExecutorService tickerService;
    private ScheduledFuture<?> tickerFuture;

    private long sessionStartTime = 0;
    private long sessionEndTime = 0;
    private String sessionTitleTemplate = "";
    private String sessionSubName = "";
    private String sessionRoom = "";
    private String sessionFaculty = "";
    private int sessionPeriodNumber = 1;
    private int sessionColorInt = Color.parseColor("#171717");
    private boolean sessionIsOngoing = true;

    private void createNotificationChannel() {
        if (isChannelCreated || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            try {
                manager.deleteNotificationChannel(OLD_CHANNEL_ID);
                manager.deleteNotificationChannel("live_class_activity_v3");
            } catch (Exception ignored) {}

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(CHANNEL_DESC);
            channel.setShowBadge(true);
            channel.enableLights(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);

            manager.createNotificationChannel(channel);
            isChannelCreated = true;
        }
    }

    private synchronized void startNativeBackgroundTicker() {
        stopNativeBackgroundTicker();

        if (sessionEndTime <= System.currentTimeMillis() || sessionStartTime >= sessionEndTime) {
            return;
        }

        if (tickerService == null || tickerService.isShutdown()) {
            tickerService = Executors.newSingleThreadScheduledExecutor();
        }

        // Run every 20 seconds to recalculate and refresh progress and Vivo Origin Island
        tickerFuture = tickerService.scheduleWithFixedDelay(new Runnable() {
            @Override
            public void run() {
                try {
                    long now = System.currentTimeMillis();
                    if (now >= sessionEndTime) {
                        // Session completed
                        stopNativeBackgroundTicker();
                        showCompletedNotification();
                        return;
                    }

                    long elapsed = now - sessionStartTime;
                    long total = sessionEndTime - sessionStartTime;
                    int progress = (int) Math.min(100, Math.max(0, (elapsed * 100) / total));
                    int remainingMinutes = (int) Math.max(1, Math.ceil((sessionEndTime - now) / 60000.0));
                    int elapsedMinutes = (int) Math.max(0, Math.floor(elapsed / 60000.0));
                    int totalMinutes = (int) Math.round(total / 60000.0);

                    String title = sessionTitleTemplate;
                    String message = sessionSubName + " (" + sessionRoom + " • " + sessionFaculty + ") • " + remainingMinutes + "m left";
                    String subText = progress + "% completed (" + elapsedMinutes + "/" + totalMinutes + "m)";
                    String capsuleText = "P" + sessionPeriodNumber + " • " + remainingMinutes + "m";

                    postNotification(
                        title,
                        message,
                        subText,
                        capsuleText,
                        progress,
                        100,
                        sessionIsOngoing,
                        sessionColorInt,
                        sessionPeriodNumber,
                        sessionStartTime,
                        sessionEndTime,
                        true // isUpdate
                    );
                } catch (Exception ignored) {}
            }
        }, 20, 20, TimeUnit.SECONDS);
    }

    private synchronized void stopNativeBackgroundTicker() {
        if (tickerFuture != null) {
            tickerFuture.cancel(true);
            tickerFuture = null;
        }
    }

    private void showCompletedNotification() {
        Context context = getContext();
        if (context == null) return;

        try {
            createNotificationChannel();
            String title = "Period " + sessionPeriodNumber + " Ended";
            String message = sessionSubName + " has finished. Mark your attendance!";

            Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("navigateTab", "attendance");
            intent.putExtra("periodNumber", sessionPeriodNumber);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                101,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(message)
                .setColor(sessionColorInt)
                .setOngoing(false)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .addAction(R.drawable.ic_attendance, "Mark Attendance", pendingIntent);

            // Vivo Origin Island end operation
            Bundle extras = new Bundle();
            extras.putInt("notification.superx.operation", 2); // 2 = finish / end
            builder.addExtras(extras);

            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            manager.notify(NOTIFICATION_ID, builder.build());
            hasCreatedIsland = false;
        } catch (Exception ignored) {}
    }

    private void postNotification(
        String title,
        String message,
        String subText,
        String capsuleText,
        int progress,
        int maxProgress,
        boolean isOngoing,
        int colorInt,
        int periodNumber,
        long startTimeMillis,
        long endTimeMillis,
        boolean isUpdate
    ) {
        Context context = getContext();
        if (context == null) return;

        createNotificationChannel();

        // Intent to open the main app
        Intent contentIntent = new Intent(context, MainActivity.class);
        contentIntent.setAction(Intent.ACTION_MAIN);
        contentIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        contentIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        contentIntent.putExtra("navigateTab", "dashboard");

        PendingIntent pendingContentIntent = PendingIntent.getActivity(
            context,
            0,
            contentIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Intent for Quick Action: "Take Attendance"
        Intent attendanceIntent = new Intent(context, MainActivity.class);
        attendanceIntent.setAction(Intent.ACTION_VIEW);
        attendanceIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        attendanceIntent.putExtra("navigateTab", "attendance");
        attendanceIntent.putExtra("periodNumber", periodNumber);

        PendingIntent pendingAttendanceIntent = PendingIntent.getActivity(
            context,
            1,
            attendanceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // RemoteViews for app-styled dark card matching app aesthetic
        RemoteViews collapsedView = new RemoteViews(context.getPackageName(), R.layout.notification_live_class);
        RemoteViews expandedView = new RemoteViews(context.getPackageName(), R.layout.notification_live_class_expanded);

        String displayTitle = (sessionSubName != null && !sessionSubName.isEmpty()) ? sessionSubName : title;
        String displayDetails = (sessionRoom != null && !sessionRoom.isEmpty() && !sessionRoom.equals("General"))
            ? (title + " • Room " + sessionRoom + " • " + sessionFaculty)
            : message;

        collapsedView.setTextViewText(R.id.notif_header_title, "CLASS IN SESSION • P" + periodNumber);
        collapsedView.setTextViewText(R.id.notif_subject_title, displayTitle);
        collapsedView.setTextViewText(R.id.notif_subject_details, displayDetails);
        collapsedView.setProgressBar(R.id.notif_progress_bar, maxProgress, progress, false);

        expandedView.setTextViewText(R.id.notif_exp_app_title, "ANEXUS CLASS MANAGER");
        expandedView.setTextViewText(R.id.notif_exp_status_chip, "PERIOD " + periodNumber + " • " + (isOngoing ? "LIVE" : "STANDBY"));
        expandedView.setTextViewText(R.id.notif_exp_subject_title, displayTitle);
        expandedView.setTextViewText(R.id.notif_exp_details, displayDetails);
        expandedView.setProgressBar(R.id.notif_exp_progress_bar, maxProgress, progress, false);
        expandedView.setTextViewText(R.id.notif_exp_progress_text, subText);
        expandedView.setOnClickPendingIntent(R.id.notif_exp_action_btn, pendingAttendanceIntent);

        // Native Android Chronometer countdown in custom RemoteViews: ticks every second smoothly
        if (endTimeMillis > System.currentTimeMillis()) {
            collapsedView.setChronometer(R.id.notif_chronometer, endTimeMillis, "%s", true);
            expandedView.setChronometer(R.id.notif_exp_chronometer, endTimeMillis, "%s", true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                collapsedView.setChronometerCountDown(R.id.notif_chronometer, true);
                expandedView.setChronometerCountDown(R.id.notif_exp_chronometer, true);
            }
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(message)
            .setSubText(subText)
            .setColor(colorInt)
            .setColorized(true)
            .setOngoing(isOngoing)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(pendingContentIntent)
            .setAutoCancel(false)
            .setProgress(maxProgress, progress, false)
            .setCustomContentView(collapsedView)
            .setCustomBigContentView(expandedView)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle());

        // Native Chronometer on system notification wrapper
        if (endTimeMillis > System.currentTimeMillis()) {
            builder.setShowWhen(true);
            builder.setWhen(endTimeMillis);
            builder.setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setChronometerCountDown(true);
            }
        }

        // Add Quick Action: "Take Attendance"
        builder.addAction(
            R.drawable.ic_attendance,
            "Take Attendance",
            pendingAttendanceIntent
        );

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            androidx.core.content.ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            notificationManager.notify(NOTIFICATION_ID, builder.build());
        }
    }

    @PluginMethod
    public void showOrUpdateLiveNotification(PluginCall call) {
        try {
            String title = call.getString("title", "Class in Session");
            String message = call.getString("message", "Live class activity");
            String subText = call.getString("subText", "Live Progress");
            String capsuleText = call.getString("capsuleText", "");
            int progress = call.getInt("progress", 0);
            int maxProgress = call.getInt("maxProgress", 100);
            boolean isOngoing = call.getBoolean("ongoing", true);
            String accentColorHex = call.getString("accentColor", "#3B82F6");
            int periodNumber = call.getInt("periodNumber", 1);

            // Optional epoch millisecond timestamps for native background ticking
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

            // Post immediately
            postNotification(
                title,
                message,
                subText,
                capsuleText,
                progress,
                maxProgress,
                isOngoing,
                colorInt,
                periodNumber,
                startTimeMillis,
                endTimeMillis,
                false
            );
            hasCreatedIsland = true;

            // If this is an active class session with valid future end time, initialize native background ticker
            if (isOngoing && startTimeMillis > 0 && endTimeMillis > System.currentTimeMillis()) {
                sessionStartTime = startTimeMillis;
                sessionEndTime = endTimeMillis;
                sessionTitleTemplate = title;
                sessionSubName = subName;
                sessionRoom = room;
                sessionFaculty = faculty;
                sessionPeriodNumber = periodNumber;
                sessionColorInt = colorInt;
                sessionIsOngoing = isOngoing;

                startNativeBackgroundTicker();
            } else {
                stopNativeBackgroundTicker();
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
            stopNativeBackgroundTicker();

            Context context = getContext();
            if (context != null) {
                NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

                // Send finish command to Vivo Origin Island before cancelling
                try {
                    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle("Class Manager")
                        .setOngoing(false);
                    Bundle extras = new Bundle();
                    extras.putInt("notification.superx.operation", 2); // 2 = end
                    builder.addExtras(extras);
                    notificationManager.notify(NOTIFICATION_ID, builder.build());
                } catch (Exception ignored) {}

                notificationManager.cancel(NOTIFICATION_ID);
                hasCreatedIsland = false;
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
            // Fallback to application details
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

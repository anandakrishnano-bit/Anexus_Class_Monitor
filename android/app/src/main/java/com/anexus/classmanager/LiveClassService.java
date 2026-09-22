package com.anexus.classmanager;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.SystemClock;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Native Android Foreground Service that keeps the Live Notification alive in the background,
 * prevents the OS from suspending background execution, and maintains
 * real-time class countdown and progress updates across sleep/Doze states.
 */
public class LiveClassService extends Service {

    public static final String ACTION_START_LIVE = "com.anexus.classmanager.START_LIVE";
    public static final String ACTION_STOP_LIVE = "com.anexus.classmanager.STOP_LIVE";
    public static final int NOTIFICATION_ID = 1016;
    public static final String CHANNEL_ID = "live_class_activity_v4";
    public static final String CHANNEL_NAME = "Live Class Activity (Ongoing Progress)";
    public static final String CHANNEL_DESC = "Real-time class progress, live countdown chronometer, and ongoing attendance tracking";

    private static volatile boolean isServiceRunning = false;

    // Session state
    private String sessionTitle = "Class in Session";
    private String sessionMessage = "Live class activity";
    private String sessionSubText = "Live Progress";
    private String sessionCapsuleText = "";
    private int sessionProgress = 0;
    private int sessionMaxProgress = 100;
    private boolean sessionOngoing = true;
    private int sessionColorInt = Color.parseColor("#3B82F6");
    private int sessionPeriodNumber = 1;
    private long sessionStartTime = 0;
    private long sessionEndTime = 0;
    private String sessionSubjectName = "";
    private String sessionClassroom = "General";
    private String sessionFaculty = "Faculty";

    private ScheduledExecutorService tickerService;
    private ScheduledFuture<?> tickerFuture;

    public static boolean isRunning() {
        return isServiceRunning;
    }

    public static void startWithData(Context context, Bundle data) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, LiveClassService.class);
            intent.setAction(ACTION_START_LIVE);
            if (data != null) {
                intent.putExtras(data);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception ignored) {}
    }

    public static void stop(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, LiveClassService.class);
            intent.setAction(ACTION_STOP_LIVE);
            context.stopService(intent);
        } catch (Exception ignored) {}
    }

    @Override
    public void onCreate() {
        super.onCreate();
        isServiceRunning = true;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP_LIVE.equals(intent.getAction())) {
            stopTicker();
            stopForeground(true);
            stopSelf();
            isServiceRunning = false;
            return START_NOT_STICKY;
        }

        if (intent != null) {
            sessionTitle = intent.getStringExtra("title") != null ? intent.getStringExtra("title") : sessionTitle;
            sessionMessage = intent.getStringExtra("message") != null ? intent.getStringExtra("message") : sessionMessage;
            sessionSubText = intent.getStringExtra("subText") != null ? intent.getStringExtra("subText") : sessionSubText;
            sessionCapsuleText = intent.getStringExtra("capsuleText") != null ? intent.getStringExtra("capsuleText") : sessionCapsuleText;
            sessionProgress = intent.getIntExtra("progress", sessionProgress);
            sessionMaxProgress = intent.getIntExtra("maxProgress", sessionMaxProgress);
            sessionOngoing = intent.getBooleanExtra("ongoing", sessionOngoing);
            sessionColorInt = intent.getIntExtra("colorInt", sessionColorInt);
            sessionPeriodNumber = intent.getIntExtra("periodNumber", sessionPeriodNumber);
            sessionStartTime = intent.getLongExtra("startTimeMillis", sessionStartTime);
            sessionEndTime = intent.getLongExtra("endTimeMillis", sessionEndTime);
            sessionSubjectName = intent.getStringExtra("subjectName") != null ? intent.getStringExtra("subjectName") : sessionSubjectName;
            sessionClassroom = intent.getStringExtra("classroom") != null ? intent.getStringExtra("classroom") : sessionClassroom;
            sessionFaculty = intent.getStringExtra("facultyName") != null ? intent.getStringExtra("facultyName") : sessionFaculty;
        }

        ensureChannel();

        Notification notification = buildLiveNotification();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
                } else {
                    startForeground(NOTIFICATION_ID, notification);
                }
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            try {
                startForeground(NOTIFICATION_ID, notification);
            } catch (Exception ignored) {}
        }

        isServiceRunning = true;

        // Start background ticker if active class session
        if (sessionOngoing && sessionStartTime > 0 && sessionEndTime > System.currentTimeMillis()) {
            startTicker();
        } else {
            stopTicker();
        }

        return START_STICKY;
    }

    public Notification buildLiveNotification() {
        Context context = this;
        ensureChannel();

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

        Intent attendanceIntent = new Intent(context, MainActivity.class);
        attendanceIntent.setAction(Intent.ACTION_VIEW);
        attendanceIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        attendanceIntent.putExtra("navigateTab", "attendance");
        attendanceIntent.putExtra("periodNumber", sessionPeriodNumber);

        PendingIntent pendingAttendanceIntent = PendingIntent.getActivity(
            context,
            1,
            attendanceIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        RemoteViews collapsedView = new RemoteViews(context.getPackageName(), R.layout.notification_live_class);
        RemoteViews expandedView = new RemoteViews(context.getPackageName(), R.layout.notification_live_class_expanded);

        String displayTitle = (sessionSubjectName != null && !sessionSubjectName.isEmpty()) ? sessionSubjectName : sessionTitle;
        String displayDetails = (sessionClassroom != null && !sessionClassroom.isEmpty() && !sessionClassroom.equals("General"))
            ? (sessionTitle + " • Room " + sessionClassroom + " • " + sessionFaculty)
            : sessionMessage;

        collapsedView.setTextViewText(R.id.notif_header_title, "CLASS IN SESSION • P" + sessionPeriodNumber);
        collapsedView.setTextViewText(R.id.notif_subject_title, displayTitle);
        collapsedView.setTextViewText(R.id.notif_subject_details, displayDetails);
        collapsedView.setProgressBar(R.id.notif_progress_bar, sessionMaxProgress, sessionProgress, false);

        expandedView.setTextViewText(R.id.notif_exp_app_title, "ANEXUS CLASS MANAGER");
        expandedView.setTextViewText(R.id.notif_exp_status_chip, "PERIOD " + sessionPeriodNumber + " • " + (sessionOngoing ? "LIVE" : "STANDBY"));
        expandedView.setTextViewText(R.id.notif_exp_subject_title, displayTitle);
        expandedView.setTextViewText(R.id.notif_exp_details, displayDetails);
        expandedView.setProgressBar(R.id.notif_exp_progress_bar, sessionMaxProgress, sessionProgress, false);
        expandedView.setTextViewText(R.id.notif_exp_progress_text, sessionSubText);
        expandedView.setOnClickPendingIntent(R.id.notif_exp_action_btn, pendingAttendanceIntent);

        // Native Android Chronometer countdown in custom RemoteViews:
        // IMPORTANT: Chronometer base MUST be SystemClock.elapsedRealtime() + remainingMillis, NOT System.currentTimeMillis()
        long now = System.currentTimeMillis();
        if (sessionEndTime > now) {
            long remainingMillis = sessionEndTime - now;
            long chronometerBase = SystemClock.elapsedRealtime() + remainingMillis;
            collapsedView.setChronometer(R.id.notif_chronometer, chronometerBase, "%s", true);
            expandedView.setChronometer(R.id.notif_exp_chronometer, chronometerBase, "%s", true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                collapsedView.setChronometerCountDown(R.id.notif_chronometer, true);
                expandedView.setChronometerCountDown(R.id.notif_exp_chronometer, true);
            }
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(sessionTitle)
            .setContentText(sessionMessage)
            .setSubText(sessionSubText)
            .setColor(sessionColorInt)
            .setColorized(true)
            .setOngoing(sessionOngoing)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentIntent(pendingContentIntent)
            .setAutoCancel(false)
            .setProgress(sessionMaxProgress, sessionProgress, false)
            .setCustomContentView(collapsedView)
            .setCustomBigContentView(expandedView)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle());

        // Native Chronometer on system notification wrapper for lockscreen and status bar
        if (sessionEndTime > now) {
            builder.setShowWhen(true);
            builder.setWhen(sessionEndTime);
            builder.setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setChronometerCountDown(true);
            }
        }

        builder.addAction(
            R.drawable.ic_attendance,
            "Take Attendance",
            pendingAttendanceIntent
        );

        // Vivo Origin Island extras
        Bundle extras = new Bundle();
        extras.putInt("notification.superx.operation", 1);
        if (sessionCapsuleText != null && !sessionCapsuleText.isEmpty()) {
            extras.putString("notification.superx.capsuleText", sessionCapsuleText);
        }
        builder.addExtras(extras);

        return builder.build();
    }

    private synchronized void startTicker() {
        stopTicker();

        if (sessionEndTime <= System.currentTimeMillis() || sessionStartTime >= sessionEndTime) {
            return;
        }

        if (tickerService == null || tickerService.isShutdown()) {
            tickerService = Executors.newSingleThreadScheduledExecutor();
        }

        // Ticks every 15 seconds natively in the foreground service
        tickerFuture = tickerService.scheduleWithFixedDelay(new Runnable() {
            @Override
            public void run() {
                try {
                    long now = System.currentTimeMillis();
                    if (now >= sessionEndTime) {
                        stopTicker();
                        SessionEndReceiver.triggerCompletionAlert(LiveClassService.this, sessionPeriodNumber, sessionSubjectName, sessionColorInt);
                        stopForeground(false);
                        stopSelf();
                        return;
                    }

                    long elapsed = now - sessionStartTime;
                    long total = sessionEndTime - sessionStartTime;
                    sessionProgress = (int) Math.min(100, Math.max(0, (elapsed * 100) / total));
                    int remainingMinutes = (int) Math.max(1, Math.ceil((sessionEndTime - now) / 60000.0));
                    int elapsedMinutes = (int) Math.max(0, Math.floor(elapsed / 60000.0));
                    int totalMinutes = (int) Math.round(total / 60000.0);

                    sessionMessage = sessionSubjectName + " (" + sessionClassroom + " • " + sessionFaculty + ") • " + remainingMinutes + "m left";
                    sessionSubText = sessionProgress + "% completed (" + elapsedMinutes + "/" + totalMinutes + "m)";
                    sessionCapsuleText = "P" + sessionPeriodNumber + " • " + remainingMinutes + "m";

                    Notification updatedNotif = buildLiveNotification();
                    NotificationManagerCompat.from(LiveClassService.this).notify(NOTIFICATION_ID, updatedNotif);
                } catch (Exception ignored) {}
            }
        }, 15, 15, TimeUnit.SECONDS);
    }

    private synchronized void stopTicker() {
        if (tickerFuture != null) {
            tickerFuture.cancel(true);
            tickerFuture = null;
        }
        if (tickerService != null && !tickerService.isShutdown()) {
            tickerService.shutdown();
            tickerService = null;
        }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
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
            }
        }
    }

    @Override
    public void onDestroy() {
        stopTicker();
        isServiceRunning = false;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

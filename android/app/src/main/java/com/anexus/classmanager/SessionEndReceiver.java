package com.anexus.classmanager;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * Ultra-low power exact alarm receiver that triggers when a live class session ends.
 * Woken up directly by Android OS AlarmManager (RTC_WAKEUP) without keeping any background
 * threads, WebView instances, CPU cores, or GPU active during the class.
 */
public class SessionEndReceiver extends BroadcastReceiver {

    public static final String ACTION_SESSION_ENDED = "com.anexus.classmanager.ACTION_SESSION_ENDED";
    public static final String CHANNEL_ID = "live_class_activity_v4";
    public static final int NOTIFICATION_ID = 1016;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

        int periodNumber = intent.getIntExtra("periodNumber", 1);
        String subjectName = intent.getStringExtra("subjectName");
        if (subjectName == null || subjectName.isEmpty()) subjectName = "Current Class";
        int colorInt = intent.getIntExtra("colorInt", Color.parseColor("#3B82F6"));

        triggerCompletionAlert(context, periodNumber, subjectName, colorInt);
    }

    public static void triggerCompletionAlert(Context context, int periodNumber, String subjectName, int colorInt) {
        try {
            ensureNotificationChannel(context);

            String title = "Period " + periodNumber + " Ended";
            String message = subjectName + " has finished. Mark your attendance!";

            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setAction(Intent.ACTION_VIEW);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            launchIntent.putExtra("navigateTab", "attendance");
            launchIntent.putExtra("periodNumber", periodNumber);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                101,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(message)
                .setColor(colorInt)
                .setOngoing(false)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .addAction(R.drawable.ic_attendance, "Mark Attendance", pendingIntent);

            // Vivo Origin Island end operation
            Bundle extras = new Bundle();
            extras.putInt("notification.superx.operation", 2); // 2 = end/finish
            builder.addExtras(extras);

            NotificationManagerCompat manager = NotificationManagerCompat.from(context);
            manager.notify(NOTIFICATION_ID, builder.build());
        } catch (Exception ignored) {}
    }

    private static void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null && manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Live Class Activity (Ongoing Progress)",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Real-time class progress, live countdown chronometer, and ongoing attendance tracking");
                channel.setShowBadge(true);
                channel.enableLights(false);
                channel.setSound(null, null);
                channel.enableVibration(false);
                channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(channel);
            }
        }
    }
}

package com.anexus.classmanager;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(ThemePlugin.class);
        registerPlugin(LiveNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

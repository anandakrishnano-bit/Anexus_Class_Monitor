package com.anexus.classmanager;

import android.content.res.Configuration;
import android.os.Build;
import android.util.TypedValue;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Theme")
public class ThemePlugin extends Plugin {

    @PluginMethod()
    public void getMaterialYouColors(PluginCall call) {
        JSObject ret = new JSObject();
        // Default fallback Material You Tertiary violet colors
        String tertiaryHex = "#7C3AED";
        String tertiaryLightHex = "#A78BFA";
        String primaryHex = "#6366F1";
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                int nightModeFlags = getContext().getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
                boolean isDark = (nightModeFlags == Configuration.UI_MODE_NIGHT_YES);

                // system_accent3 is Material You Tertiary (extracted directly from the user's wallpaper by Monet engine)
                int tertiaryRes = isDark ? android.R.color.system_accent3_300 : android.R.color.system_accent3_600;
                int tertiaryLightRes = isDark ? android.R.color.system_accent3_500 : android.R.color.system_accent3_200;

                int tertiaryInt = ContextCompat.getColor(getContext(), tertiaryRes);
                tertiaryHex = String.format("#%06X", (0xFFFFFF & tertiaryInt));

                int tertiaryLightInt = ContextCompat.getColor(getContext(), tertiaryLightRes);
                tertiaryLightHex = String.format("#%06X", (0xFFFFFF & tertiaryLightInt));

                // system_accent1 is Material You Primary
                int primaryRes = isDark ? android.R.color.system_accent1_300 : android.R.color.system_accent1_600;
                int primaryInt = ContextCompat.getColor(getContext(), primaryRes);
                primaryHex = String.format("#%06X", (0xFFFFFF & primaryInt));
            } else {
                TypedValue typedValue = new TypedValue();
                if (getContext().getTheme().resolveAttribute(android.R.attr.colorAccent, typedValue, true)) {
                    int colorInt = typedValue.data;
                    tertiaryHex = String.format("#%06X", (0xFFFFFF & colorInt));
                    tertiaryLightHex = tertiaryHex;
                }
            }
        } catch (Exception e) {
            // Keep defaults if color extraction fails
        }
        
        ret.put("color", tertiaryHex);
        ret.put("tertiary", tertiaryHex);
        ret.put("tertiaryLight", tertiaryLightHex);
        ret.put("primary", primaryHex);
        call.resolve(ret);
    }

    @PluginMethod()
    public void getSystemAccentColor(PluginCall call) {
        getMaterialYouColors(call);
    }
}

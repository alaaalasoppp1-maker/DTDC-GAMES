package com.dentalchain.games;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.SparseArray;
import android.util.SparseIntArray;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Runs one game at a time in the dedicated :game Android process.
 * Destroying this activity releases WebGL, WebAudio, timers, and the WebView.
 */
public final class GameActivity extends Activity {
    public static final String EXTRA_DIRECT_RETURN = "directReturn";
    public static final String EXTRA_RESULT_JSON = "resultJson";

    private static final Set<String> VALID_GAME_IDS = new HashSet<>(Arrays.asList(
            "neon-rush", "orbit-smash", "pulse-arena", "last-line", "puzzle-studio", "skyline-rush"));
    private static boolean dataDirectoryConfigured;

    private final SparseIntArray controllerSlots = new SparseIntArray();
    private final SparseArray<boolean[]> motionStates = new SparseArray<>();
    private int nextControllerSlot;
    private WebView webView;
    private boolean finishingGame;
    private final BroadcastReceiver closeReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { closeGame("{\"reason\":\"controller-close\"}"); }
    };

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        if (Build.VERSION.SDK_INT >= 28 && !dataDirectoryConfigured) {
            WebView.setDataDirectorySuffix("games");
            dataDirectoryConfigured = true;
        }
        enterImmersiveMode();
        IntentFilter closeFilter = new IntentFilter("com.dentalchain.games.CLOSE");
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(closeReceiver, closeFilter, Context.RECEIVER_EXPORTED);
        else registerReceiver(closeReceiver, closeFilter);

        String gameId = getIntent().getStringExtra(MainActivity.EXTRA_GAME_ID);
        if (gameId == null || !VALID_GAME_IDS.contains(gameId)) {
            finish();
            return;
        }

        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.BLACK);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View view) { return true; }
        });

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.addJavascriptInterface(new GameBridge(), "DTDCGameBridge");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                view.requestFocus();
                enterImmersiveMode();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // A WebGL renderer crash only closes this isolated game process/activity.
                closeGame("{\"reason\":\"renderer-gone\"}");
                return true;
            }
        });

        container.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(container);
        webView.loadUrl("file:///android_asset/games/" + gameId + "/index.html");
        webView.requestFocus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            webView.requestFocus();
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        closeGame("{\"reason\":\"android-back\"}");
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(closeReceiver); } catch (Exception ignored) {}
        destroyWebView();
        super.onDestroy();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (event.getAction() == KeyEvent.ACTION_UP) onBackPressed();
            return true;
        }

        if (isControllerEvent(event)) {
            int slot = slotForDevice(event.getDeviceId());
            KeySpec mapped = mapControllerKey(slot, event.getKeyCode());
            if (mapped != null) {
                boolean down = event.getAction() == KeyEvent.ACTION_DOWN;
                sendKeyboard(mapped, down, event.getRepeatCount() > 0);
                // Let Chromium see the physical event too so navigator.getGamepads()
                // remains available. The synthetic keyboard event is the fallback.
                super.dispatchKeyEvent(event);
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent event) {
        boolean injected = false;
        if ((event.getSource() & InputDevice.SOURCE_JOYSTICK) != 0 &&
                event.getAction() == MotionEvent.ACTION_MOVE) {
            injected = translateJoystick(event);
        }
        boolean handled = super.dispatchGenericMotionEvent(event);
        return handled || injected;
    }

    private boolean translateJoystick(MotionEvent event) {
        int deviceId = event.getDeviceId();
        int slot = slotForDevice(deviceId);
        boolean[] previous = motionStates.get(deviceId);
        if (previous == null) {
            previous = new boolean[5];
            motionStates.put(deviceId, previous);
        }

        float x = centeredAxis(event, MotionEvent.AXIS_HAT_X, MotionEvent.AXIS_X);
        float y = centeredAxis(event, MotionEvent.AXIS_HAT_Y, MotionEvent.AXIS_Y);
        float trigger = Math.max(event.getAxisValue(MotionEvent.AXIS_RTRIGGER),
                event.getAxisValue(MotionEvent.AXIS_GAS));
        boolean[] current = new boolean[] {
                x < -0.35f, x > 0.35f, y < -0.35f, y > 0.35f, trigger > 0.45f
        };

        KeySpec[] keys = new KeySpec[] {
                directionKey(slot, 0), directionKey(slot, 1),
                directionKey(slot, 2), directionKey(slot, 3), primaryKey(slot)
        };
        boolean changed = false;
        for (int i = 0; i < current.length; i++) {
            if (current[i] != previous[i]) {
                sendKeyboard(keys[i], current[i], false);
                previous[i] = current[i];
                changed = true;
            }
        }
        return changed;
    }

    private float centeredAxis(MotionEvent event, int hatAxis, int stickAxis) {
        float hat = event.getAxisValue(hatAxis);
        if (Math.abs(hat) > 0.1f) return hat;
        float value = event.getAxisValue(stickAxis);
        InputDevice device = event.getDevice();
        if (device != null) {
            InputDevice.MotionRange range = device.getMotionRange(stickAxis, event.getSource());
            if (range != null && Math.abs(value) <= range.getFlat()) return 0f;
        }
        return value;
    }

    private boolean isControllerEvent(KeyEvent event) {
        int source = event.getSource();
        return (source & InputDevice.SOURCE_GAMEPAD) != 0 ||
                (source & InputDevice.SOURCE_JOYSTICK) != 0;
    }

    private int slotForDevice(int deviceId) {
        int existing = controllerSlots.get(deviceId, -1);
        if (existing >= 0) return existing;
        int slot = nextControllerSlot % 2;
        nextControllerSlot++;
        controllerSlots.put(deviceId, slot);
        return slot;
    }

    private KeySpec mapControllerKey(int slot, int keyCode) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT: return directionKey(slot, 0);
            case KeyEvent.KEYCODE_DPAD_RIGHT: return directionKey(slot, 1);
            case KeyEvent.KEYCODE_DPAD_UP: return directionKey(slot, 2);
            case KeyEvent.KEYCODE_DPAD_DOWN: return directionKey(slot, 3);
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_BUTTON_A:
            case KeyEvent.KEYCODE_BUTTON_R1:
            case KeyEvent.KEYCODE_BUTTON_R2:
                return primaryKey(slot);
            case KeyEvent.KEYCODE_BUTTON_B:
            case KeyEvent.KEYCODE_BUTTON_X:
            case KeyEvent.KEYCODE_BUTTON_Y:
            case KeyEvent.KEYCODE_BUTTON_L1:
                return secondaryKey(slot);
            case KeyEvent.KEYCODE_BUTTON_START:
                return new KeySpec("Enter", "Enter", 13);
            case KeyEvent.KEYCODE_BUTTON_SELECT:
                return new KeySpec("Escape", "Escape", 27);
            default:
                return null;
        }
    }

    private KeySpec directionKey(int slot, int direction) {
        if (slot == 0) {
            switch (direction) {
                case 0: return new KeySpec("ArrowLeft", "ArrowLeft", 37);
                case 1: return new KeySpec("ArrowRight", "ArrowRight", 39);
                case 2: return new KeySpec("ArrowUp", "ArrowUp", 38);
                default: return new KeySpec("ArrowDown", "ArrowDown", 40);
            }
        }
        switch (direction) {
            case 0: return new KeySpec("a", "KeyA", 65);
            case 1: return new KeySpec("d", "KeyD", 68);
            case 2: return new KeySpec("w", "KeyW", 87);
            default: return new KeySpec("s", "KeyS", 83);
        }
    }

    private KeySpec primaryKey(int slot) {
        return slot == 0
                ? new KeySpec(" ", "Space", 32)
                : new KeySpec("f", "KeyF", 70);
    }

    private KeySpec secondaryKey(int slot) {
        return slot == 0
                ? new KeySpec("Shift", "ShiftLeft", 16)
                : new KeySpec("g", "KeyG", 71);
    }

    private void sendKeyboard(KeySpec key, boolean down, boolean repeat) {
        WebView view = webView;
        if (view == null || key == null) return;
        final String script = "(function(){try{window.dispatchEvent(new KeyboardEvent('" +
                (down ? "keydown" : "keyup") + "',{key:'" + key.key + "',code:'" + key.code +
                "',keyCode:" + key.keyCode + ",which:" + key.keyCode + ",bubbles:true,cancelable:true,repeat:" +
                (repeat ? "true" : "false") + "}));}catch(e){}})();";
        view.evaluateJavascript(script, null);
    }

    private void closeGame(String resultJson) {
        if (finishingGame) return;
        finishingGame = true;
        Intent result = new Intent();
        if (resultJson != null) result.putExtra(EXTRA_RESULT_JSON, resultJson);
        setResult(RESULT_OK, result);
        finish();
    }

    private void destroyWebView() {
        WebView view = webView;
        webView = null;
        if (view == null) return;
        try {
            view.stopLoading();
            view.loadUrl("about:blank");
            view.clearHistory();
            view.removeJavascriptInterface("DTDCGameBridge");
            view.onPause();
            view.removeAllViews();
            ViewGroup parent = (ViewGroup) view.getParent();
            if (parent != null) parent.removeView(view);
            view.destroy();
        } catch (Exception ignored) {
            // Destruction is best-effort because the process is isolated anyway.
        }
    }

    private void enterImmersiveMode() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }

    public final class GameBridge {
        @JavascriptInterface
        public void exitGame(final String resultJson) {
            runOnUiThread(new Runnable() {
                @Override public void run() { closeGame(resultJson); }
            });
        }
    }

    private static final class KeySpec {
        final String key;
        final String code;
        final int keyCode;

        KeySpec(String key, String code, int keyCode) {
            this.key = key;
            this.code = code;
            this.keyCode = keyCode;
        }
    }
}

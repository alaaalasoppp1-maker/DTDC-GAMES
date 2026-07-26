package com.dentalchain.games;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.os.Bundle;
import android.os.Build;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.FrameLayout;
import android.widget.GridLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.InputStream;
import java.util.HashSet;
import java.util.Set;

/** Lightweight native launcher. No WebView exists until a game is selected. */
public final class MainActivity extends Activity {
    public static final String ACTION_OPEN_GAME = "com.dentalchain.games.OPEN_GAME";
    public static final String EXTRA_GAME_ID = "gameId";

    private static final GameSpec[] GAMES = new GameSpec[] {
            new GameSpec("neon-rush", "NEON RUSH", "سباق نيون سريع", "NR", 0xFF21E6FF, 0xFF087EA0),
            new GameSpec("orbit-smash", "ORBIT SMASH", "تصويب وجاذبية", "OS", 0xFFFFCB55, 0xFFEF6C35),
            new GameSpec("pulse-arena", "PULSE ARENA", "مواجهة تنافسية", "PA", 0xFFFF4E91, 0xFF8B4DFF),
            new GameSpec("last-line", "LAST LINE", "دفاع ساحلي", "LL", 0xFF7EF6FF, 0xFF247BFF),
            new GameSpec("puzzle-studio", "PUZZLE ODYSSEY", "20 لوحة وتحديات", "PZ", 0xFFFFC85B, 0xFF9B63FF),
            new GameSpec("skyline-rush", "SKYLINE RUSH", "مطاردة دراجات", "SK", 0xFFB8FF60, 0xFF19C4B1)
    };

    private final Set<String> validIds = new HashSet<>();
    private final View[] cards = new View[GAMES.length];
    private long lastStickMove;
    private int lastStickDirection;
    private final BroadcastReceiver closeReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { finish(); }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        for (GameSpec game : GAMES) validIds.add(game.id);
        registerCloseReceiver();
        enterImmersiveMode();
        if (!handleDirectLaunch(getIntent())) {
            buildLauncher();
        }
    }

    private void registerCloseReceiver() {
        IntentFilter filter = new IntentFilter("com.dentalchain.games.CLOSE");
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(closeReceiver, filter, Context.RECEIVER_EXPORTED);
        else registerReceiver(closeReceiver, filter);
    }

    @Override protected void onDestroy() {
        try { unregisterReceiver(closeReceiver); } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDirectLaunch(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
    }

    private boolean handleDirectLaunch(Intent intent) {
        if (intent == null) return false;
        String requested = intent.getStringExtra(EXTRA_GAME_ID);
        if (requested == null || !validIds.contains(requested)) return false;

        Intent game = new Intent(this, GameActivity.class);
        game.putExtra(EXTRA_GAME_ID, requested);
        game.putExtra(GameActivity.EXTRA_DIRECT_RETURN, true);
        startActivity(game);

        // Removing this native launcher from the stack makes GameActivity.finish()
        // return to the calling Display activity instead of showing the game menu.
        finish();
        return true;
    }

    private void buildLauncher() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(2, 8, 19));

        ImageView background = new ImageView(this);
        background.setScaleType(ImageView.ScaleType.CENTER_CROP);
        background.setAlpha(0.48f);
        try (InputStream stream = getAssets().open("launcher/skyline-sunset.webp")) {
            background.setImageBitmap(BitmapFactory.decodeStream(stream));
        } catch (Exception ignored) {
            background.setBackgroundColor(Color.rgb(8, 26, 48));
        }
        root.addView(background, match());

        View shade = new View(this);
        GradientDrawable shadeDrawable = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[] {0xC7061326, 0xDA031020, 0xF0020813});
        shade.setBackground(shadeDrawable);
        root.addView(shade, match());

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(34), dp(22), dp(34), dp(18));
        root.addView(page, match());

        page.addView(buildHeader(), new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(82)));

        GridLayout grid = new GridLayout(this);
        grid.setColumnCount(3);
        grid.setRowCount(2);
        LinearLayout.LayoutParams gridLayout = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        gridLayout.topMargin = dp(16);
        gridLayout.bottomMargin = dp(14);
        page.addView(grid, gridLayout);

        for (int i = 0; i < GAMES.length; i++) {
            View card = buildGameCard(GAMES[i]);
            card.setId(View.generateViewId());
            cards[i] = card;
            GridLayout.LayoutParams params = new GridLayout.LayoutParams(
                    GridLayout.spec(i / 3, 1f), GridLayout.spec(i % 3, 1f));
            params.width = 0;
            params.height = 0;
            params.setMargins(dp(7), dp(7), dp(7), dp(7));
            grid.addView(card, params);
        }
        wireFocusNavigation();

        TextView footer = new TextView(this);
        footer.setText("استخدم الأسهم أو عصا القبضة للتنقل  •  A / زر الوسط للاختيار  •  BACK للعودة إلى الشاشة");
        footer.setTextColor(0xFFB8CCE3);
        footer.setTextSize(13);
        footer.setGravity(Gravity.CENTER);
        footer.setBackground(roundRect(0xB20A1A2E, 0xFF244562, 18, 1));
        page.addView(footer, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(42)));

        setContentView(root);
        cards[0].requestFocus();
    }

    private View buildHeader() {
        LinearLayout header = new LinearLayout(this);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(18), 0, dp(12), 0);
        header.setBackground(roundRect(0xC20A1B31, 0xFF31506D, 22, 1));

        TextView logo = new TextView(this);
        logo.setText("D");
        logo.setTextColor(0xFF06111F);
        logo.setTextSize(25);
        logo.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        logo.setGravity(Gravity.CENTER);
        GradientDrawable logoBg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] {0xFF22E7FF, 0xFFB8FF60});
        logoBg.setShape(GradientDrawable.OVAL);
        logo.setBackground(logoBg);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(50), dp(50));
        logoParams.setMarginEnd(dp(14));
        header.addView(logo, logoParams);

        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.setGravity(Gravity.CENTER_VERTICAL);
        header.addView(titles, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));

        TextView title = text("DTDC GAMES", 27, 0xFFF4FAFF, true);
        title.setLetterSpacing(0.09f);
        titles.addView(title);
        TextView subtitle = text("ست ألعاب أوفلاين • منها 20 تحدي Puzzle", 13, 0xFF90AEC8, false);
        titles.addView(subtitle);

        TextView exit = text("عودة للشاشة", 14, 0xFFE9F9FF, true);
        exit.setGravity(Gravity.CENTER);
        exit.setFocusable(true);
        exit.setClickable(true);
        exit.setBackground(focusableBackground(0xCC112A43, 0xFF22E7FF, 15));
        exit.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { finish(); }
        });
        header.addView(exit, new LinearLayout.LayoutParams(dp(138), dp(48)));
        return header;
    }

    private View buildGameCard(final GameSpec game) {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_VERTICAL);
        card.setPadding(dp(20), dp(15), dp(20), dp(15));
        card.setFocusable(true);
        card.setFocusableInTouchMode(true);
        card.setClickable(true);
        card.setBackground(cardBackground(game.colorA, game.colorB));
        card.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { openGame(game.id); }
        });
        card.setOnKeyListener(new View.OnKeyListener() {
            @Override public boolean onKey(View view, int keyCode, KeyEvent event) {
                if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0 &&
                        (keyCode == KeyEvent.KEYCODE_BUTTON_A || keyCode == KeyEvent.KEYCODE_BUTTON_START ||
                                keyCode == KeyEvent.KEYCODE_ENTER || keyCode == KeyEvent.KEYCODE_DPAD_CENTER)) {
                    view.performClick();
                    return true;
                }
                return false;
            }
        });

        LinearLayout top = new LinearLayout(this);
        top.setOrientation(LinearLayout.HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        card.addView(top, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48)));

        TextView monogram = text(game.badge, 18, 0xFF06111F, true);
        monogram.setGravity(Gravity.CENTER);
        GradientDrawable badge = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR, new int[] {game.colorA, game.colorB});
        badge.setCornerRadius(dp(14));
        monogram.setBackground(badge);
        top.addView(monogram, new LinearLayout.LayoutParams(dp(48), dp(48)));

        TextView playerBadge = text("1–2 لاعبين", 11, 0xFFD8ECFF, true);
        playerBadge.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams playerParams = new LinearLayout.LayoutParams(dp(92), dp(30));
        playerParams.setMarginStart(dp(12));
        top.addView(playerBadge, playerParams);
        playerBadge.setBackground(roundRect(0x80213A55, 0x994A6A88, 15, 1));

        TextView name = text(game.title, 22, 0xFFF7FBFF, true);
        name.setLetterSpacing(0.045f);
        LinearLayout.LayoutParams nameParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        nameParams.topMargin = dp(12);
        card.addView(name, nameParams);

        TextView description = text(game.arabic, 15, 0xFFB8CDE2, false);
        card.addView(description);

        TextView hint = text("اضغط A للعب", 11, game.colorA, true);
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        hintParams.topMargin = dp(9);
        card.addView(hint, hintParams);
        return card;
    }

    private void wireFocusNavigation() {
        for (int i = 0; i < cards.length; i++) {
            int row = i / 3;
            int col = i % 3;
            cards[i].setNextFocusLeftId(cards[row * 3 + (col + 2) % 3].getId());
            cards[i].setNextFocusRightId(cards[row * 3 + (col + 1) % 3].getId());
            cards[i].setNextFocusUpId(cards[((row + 1) % 2) * 3 + col].getId());
            cards[i].setNextFocusDownId(cards[((row + 1) % 2) * 3 + col].getId());
        }
    }

    private void openGame(String gameId) {
        Intent intent = new Intent(this, GameActivity.class);
        intent.putExtra(EXTRA_GAME_ID, gameId);
        intent.putExtra(GameActivity.EXTRA_DIRECT_RETURN, false);
        startActivity(intent);
    }

    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        if ((event.getSource() & InputDevice.SOURCE_JOYSTICK) == 0 ||
                event.getAction() != MotionEvent.ACTION_MOVE) {
            return super.onGenericMotionEvent(event);
        }
        float x = axis(event, MotionEvent.AXIS_HAT_X, MotionEvent.AXIS_X);
        float y = axis(event, MotionEvent.AXIS_HAT_Y, MotionEvent.AXIS_Y);
        int direction = 0;
        if (Math.abs(x) > Math.abs(y) && Math.abs(x) > 0.55f) direction = x > 0 ? View.FOCUS_RIGHT : View.FOCUS_LEFT;
        else if (Math.abs(y) > 0.55f) direction = y > 0 ? View.FOCUS_DOWN : View.FOCUS_UP;

        long now = SystemClock.uptimeMillis();
        if (direction != 0 && (direction != lastStickDirection || now - lastStickMove > 280)) {
            View current = getCurrentFocus();
            if (current != null) {
                View next = current.focusSearch(direction);
                if (next != null) next.requestFocus();
            }
            lastStickMove = now;
            lastStickDirection = direction;
            return true;
        }
        if (direction == 0) lastStickDirection = 0;
        return true;
    }

    private float axis(MotionEvent event, int preferred, int fallback) {
        float value = event.getAxisValue(preferred);
        return Math.abs(value) > 0.1f ? value : event.getAxisValue(fallback);
    }

    private StateListDrawable cardBackground(int colorA, int colorB) {
        GradientDrawable focused = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] {withAlpha(colorA, 0x66), 0xF0182A45, withAlpha(colorB, 0x4D)});
        focused.setCornerRadius(dp(24));
        focused.setStroke(dp(3), colorA);

        GradientDrawable normal = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[] {0xE812263F, 0xE808172B});
        normal.setCornerRadius(dp(24));
        normal.setStroke(dp(1), withAlpha(colorA, 0x70));

        StateListDrawable states = new StateListDrawable();
        states.addState(new int[] {android.R.attr.state_focused}, focused);
        states.addState(new int[] {android.R.attr.state_pressed}, focused);
        states.addState(new int[0], normal);
        return states;
    }

    private StateListDrawable focusableBackground(int base, int accent, int radius) {
        GradientDrawable focused = roundRect(base, accent, radius, 3);
        GradientDrawable normal = roundRect(base, 0xFF31506D, radius, 1);
        StateListDrawable states = new StateListDrawable();
        states.addState(new int[] {android.R.attr.state_focused}, focused);
        states.addState(new int[] {android.R.attr.state_pressed}, focused);
        states.addState(new int[0], normal);
        return states;
    }

    private GradientDrawable roundRect(int fill, int stroke, int radius, int strokeWidth) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        drawable.setStroke(dp(strokeWidth), stroke);
        return drawable;
    }

    private TextView text(String value, float size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.START | Gravity.CENTER_VERTICAL);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private int withAlpha(int color, int alpha) {
        return (color & 0x00FFFFFF) | (alpha << 24);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private FrameLayout.LayoutParams match() {
        return new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private void enterImmersiveMode() {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
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

    private static final class GameSpec {
        final String id;
        final String title;
        final String arabic;
        final String badge;
        final int colorA;
        final int colorB;

        GameSpec(String id, String title, String arabic, String badge, int colorA, int colorB) {
            this.id = id;
            this.title = title;
            this.arabic = arabic;
            this.badge = badge;
            this.colorA = colorA;
            this.colorB = colorB;
        }
    }
}

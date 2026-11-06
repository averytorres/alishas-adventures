package com.princessadventure;

import android.app.Activity;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.app.KeyguardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Random;

public final class MainActivity extends Activity {
  private static final String HOST = "appassets.androidplatform.net";
  private static final int UNPIN_REQUEST = 102;
  private WebView web;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    web = new WebView(this);
    web.setBackgroundColor(0xfff7eddb);

    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setAllowFileAccess(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

    web.addJavascriptInterface(new GameLockBridge(), "AndroidGameLock");
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        return !local(request.getUrl());
      }

      @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!local(uri)) return blocked(403, "Forbidden");

        String path = uri.getPath();
        if (path == null || !path.startsWith("/assets/") || path.contains("..") || path.contains("\\")) {
          return blocked(404, "Not Found");
        }

        String name = path.substring(8);
        String contentType = mime(name);
        boolean isText = contentType.startsWith("text/")
            || contentType.equals("application/javascript")
            || contentType.equals("application/json");
        try {
          return new WebResourceResponse(contentType, isText ? "UTF-8" : null, getAssets().open(name));
        } catch (IOException ex) {
          return blocked(404, "Not Found");
        }
      }
    });

    setContentView(web);
    web.loadUrl("https://" + HOST + "/assets/index.html");
  }

  private boolean local(Uri uri) {
    return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost());
  }

  private WebResourceResponse blocked(int code, String reason) {
    return new WebResourceResponse("text/plain", "UTF-8", code, reason,
        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
  }

  private String mime(String name) {
    if (name.endsWith(".html")) return "text/html";
    if (name.endsWith(".css")) return "text/css";
    if (name.endsWith(".js") || name.endsWith(".mjs")) return "application/javascript";
    if (name.endsWith(".json")) return "application/json";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".webp")) return "image/webp";
    if (name.endsWith(".mp3")) return "audio/mpeg";
    if (name.endsWith(".ogg")) return "audio/ogg";
    if (name.endsWith(".woff2")) return "font/woff2";
    return "application/octet-stream";
  }

  private boolean pinned() {
    ActivityManager manager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
    return manager.getLockTaskModeState() != ActivityManager.LOCK_TASK_MODE_NONE;
  }

  private void notifyPin() {
    if (web != null) web.evaluateJavascript("window.dispatchEvent(new Event('android-game-lock'))", null);
  }

  private final class GameLockBridge {
    @JavascriptInterface public boolean isPinned() {
      return pinned();
    }

    @JavascriptInterface public void toggle() {
      runOnUiThread(() -> {
        if (pinned()) {
          confirmUnpin();
        } else {
          confirmPin();
        }
      });
    }
  }

  private void confirmUnpin() {
    KeyguardManager keyguard = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
    Intent unlock = keyguard.createConfirmDeviceCredentialIntent(
        "Turn off Keep game open", "Confirm your screen lock to unpin Alisha's Adventures.");
    if (unlock != null) {
      startActivityForResult(unlock, UNPIN_REQUEST);
      return;
    }

    int a = 12 + new Random().nextInt(8);
    int b = 12 + new Random().nextInt(8);
    EditText answer = new EditText(this);
    answer.setInputType(2);
    new AlertDialog.Builder(this)
        .setTitle("Grown-ups: " + a + " + " + b + " = ?")
        .setView(answer)
        .setNegativeButton("Cancel", null)
        .setPositiveButton("Turn off", (dialog, which) -> {
          if (answer.getText().toString().trim().equals(String.valueOf(a + b))) {
            stopLockTask();
            notifyPin();
          }
        })
        .show();
  }

  private void confirmPin() {
    new AlertDialog.Builder(this)
        .setTitle("Keep game open")
        .setMessage("Android will ask you to pin Alisha's Adventures. Accept its prompt. To leave, use the unpin gesture shown by Android, or return here to turn it off. For stronger protection, enable Require PIN to unpin in your phone's App pinning settings.")
        .setNegativeButton("Cancel", null)
        .setPositiveButton("Pin game", (dialog, which) -> {
          try {
            startLockTask();
          } catch (IllegalStateException | SecurityException error) {
            Toast.makeText(this, "Could not pin. Enable App pinning in your phone settings.", Toast.LENGTH_LONG).show();
          }
          notifyPin();
        })
        .show();
  }

  @Override protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if (request == UNPIN_REQUEST && result == RESULT_OK) {
      stopLockTask();
      notifyPin();
    }
  }

  @Override public void onWindowFocusChanged(boolean focus) {
    super.onWindowFocusChanged(focus);
    if (focus) notifyPin();
  }

  @Override protected void onResume() {
    super.onResume();
    notifyPin();
  }

  @Override protected void onDestroy() {
    if (web != null) {
      web.removeJavascriptInterface("AndroidGameLock");
      web.destroy();
    }
    super.onDestroy();
  }
}

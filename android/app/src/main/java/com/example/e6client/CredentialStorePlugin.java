package com.example.e6client;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyPermanentlyInvalidatedException;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.UnrecoverableKeyException;
import java.util.Iterator;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.json.JSONException;
import org.json.JSONObject;

/** Main-process-only Android credential store. It never returns raw platform errors. */
@CapacitorPlugin(name = "CredentialStore")
public class CredentialStorePlugin extends Plugin {
    private static final String KEY_ALIAS = "e6client.credentials.v1";
    private static final String STORE_FILE = "credentials.v1.json";
    private static final String CIPHER = "AES/GCM/NoPadding";

    @PluginMethod
    public void capabilities(PluginCall call) {
        try {
            verifyKeyUsable();
            resolve(call, "ok", new JSObject().put("persistence", "secure"));
        } catch (KeyInvalidatedException exception) {
            clearInvalidatedState();
            resolveError(call, "unavailable");
        } catch (Exception exception) {
            if (isKeyInvalidated(exception)) clearInvalidatedState();
            resolveError(call, "unavailable");
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        try {
            String scope = scope(call);
            SecretKey key = requireKey();
            JSONObject entries = readEntries();
            if (!entries.has(scope)) {
                resolve(call, "ok", null);
                return;
            }
            String encoded = entries.optString(scope, null);
            String apiKey = decrypt(key, encoded);
            if (apiKey == null || apiKey.trim().isEmpty()) throw new StorageException();
            resolve(call, "ok", new JSObject().put("apiKey", apiKey));
        } catch (CredentialScope.InvalidScopeException exception) {
            resolveError(call, "invalid_scope");
        } catch (KeyInvalidatedException exception) {
            clearInvalidatedState();
            resolveError(call, "unavailable");
        } catch (StorageException exception) {
            resolveError(call, "storage_failure");
        } catch (Exception exception) {
            resolveUnexpectedFailure(call, exception);
        }
    }

    @PluginMethod
    public void set(PluginCall call) {
        try {
            String scope = scope(call);
            JSObject credentials = call.getObject("credentials");
            String apiKey = credentials == null ? null : credentials.getString("apiKey", null);
            if (apiKey == null || apiKey.trim().isEmpty()) {
                resolveError(call, "invalid_credential");
                return;
            }
            JSONObject entries = readEntries();
            entries.put(scope, encrypt(requireKey(), apiKey));
            writeEntries(entries);
            resolve(call, "ok", null);
        } catch (CredentialScope.InvalidScopeException exception) {
            resolveError(call, "invalid_scope");
        } catch (KeyInvalidatedException exception) {
            clearInvalidatedState();
            resolveError(call, "unavailable");
        } catch (StorageException | JSONException exception) {
            resolveError(call, "storage_failure");
        } catch (Exception exception) {
            resolveUnexpectedFailure(call, exception);
        }
    }

    @PluginMethod
    public void delete(PluginCall call) {
        try {
            String scope = scope(call);
            JSONObject entries = readEntries();
            entries.remove(scope);
            writeEntries(entries);
            resolve(call, "ok", null);
        } catch (CredentialScope.InvalidScopeException exception) {
            resolveError(call, "invalid_scope");
        } catch (StorageException exception) {
            resolveError(call, "storage_failure");
        } catch (Exception exception) {
            resolveError(call, "storage_failure");
        }
    }

    private String scope(PluginCall call) throws CredentialScope.InvalidScopeException {
        return CredentialScope.key(call.getString("accountId"), call.getString("hostUrl"));
    }

    private SecretKey requireKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        if (keyStore.containsAlias(KEY_ALIAS)) {
            try {
                SecretKey key = (SecretKey) keyStore.getKey(KEY_ALIAS, null);
                if (key == null) throw new KeyInvalidatedException();
                return key;
            } catch (UnrecoverableKeyException exception) {
                throw new KeyInvalidatedException();
            }
        }
        if (storeFile().exists()) throw new KeyInvalidatedException();

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build());
        return generator.generateKey();
    }

    private void verifyKeyUsable() throws Exception {
        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.ENCRYPT_MODE, requireKey());
    }

    private String encrypt(SecretKey key, String plaintext) throws Exception {
        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.ENCRYPT_MODE, key);
        byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + "."
            + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
    }

    private String decrypt(SecretKey key, String encoded) throws Exception {
        if (encoded == null) throw new StorageException();
        String[] pieces = encoded.split("\\.", -1);
        if (pieces.length != 2 || pieces[0].isEmpty() || pieces[1].isEmpty()) throw new StorageException();
        Cipher cipher = Cipher.getInstance(CIPHER);
        cipher.init(Cipher.DECRYPT_MODE, key, new javax.crypto.spec.GCMParameterSpec(
            128, Base64.decode(pieces[0], Base64.NO_WRAP)
        ));
        return new String(cipher.doFinal(Base64.decode(pieces[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    private JSONObject readEntries() throws StorageException {
        File file = storeFile();
        if (!file.exists()) return new JSONObject();
        try (FileInputStream input = new FileInputStream(file); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            JSONObject entries = new JSONObject(output.toString(StandardCharsets.UTF_8.name()));
            Iterator<String> keys = entries.keys();
            while (keys.hasNext()) {
                if (!(entries.opt(keys.next()) instanceof String)) throw new StorageException();
            }
            return entries;
        } catch (IOException | JSONException exception) {
            throw new StorageException();
        }
    }

    private void writeEntries(JSONObject entries) throws StorageException {
        File target = storeFile();
        File temporary = new File(target.getParentFile(), STORE_FILE + ".tmp");
        try (FileOutputStream output = new FileOutputStream(temporary, false)) {
            output.write(entries.toString().getBytes(StandardCharsets.UTF_8));
            output.getFD().sync();
        } catch (IOException exception) {
            temporary.delete();
            throw new StorageException();
        }
        if (!temporary.renameTo(target)) {
            temporary.delete();
            throw new StorageException();
        }
    }

    private File storeFile() {
        return new File(getContext().getNoBackupFilesDir(), STORE_FILE);
    }

    private void clearInvalidatedState() {
        try {
            storeFile().delete();
            KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
            keyStore.deleteEntry(KEY_ALIAS);
        } catch (Exception ignored) {
            // The only safe result is still a signed-out state; never log secrets or platform details.
        }
    }

    private void resolveUnexpectedFailure(PluginCall call, Exception exception) {
        if (isKeyInvalidated(exception)) {
            clearInvalidatedState();
            resolveError(call, "unavailable");
        } else {
            resolveError(call, "storage_failure");
        }
    }

    private static boolean isKeyInvalidated(Throwable exception) {
        for (Throwable current = exception; current != null; current = current.getCause()) {
            if (current instanceof KeyPermanentlyInvalidatedException) return true;
        }
        return false;
    }

    private static void resolve(PluginCall call, String status, JSObject value) {
        JSObject result = new JSObject().put("status", status);
        result.put("value", value == null ? JSONObject.NULL : value);
        call.resolve(result);
    }

    private static void resolveError(PluginCall call, String code) {
        call.resolve(new JSObject().put("status", "error").put("code", code));
    }

    private static final class KeyInvalidatedException extends Exception {}
    private static final class StorageException extends Exception {}
}

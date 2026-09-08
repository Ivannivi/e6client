package com.example.e6client;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import org.json.JSONArray;

/** Canonical credential scope shared by every native credential operation. */
final class CredentialScope {
    private CredentialScope() {}

    static String key(String accountId, String hostUrl) throws InvalidScopeException {
        if (accountId == null || accountId.trim().isEmpty() || hostUrl == null) {
            throw new InvalidScopeException();
        }
        try {
            URI url = new URI(hostUrl);
            String scheme = url.getScheme();
            String host = url.getHost();
            String rawPath = url.getRawPath();
            if (
                scheme == null || host == null || url.getUserInfo() != null || url.getRawQuery() != null
                || url.getRawFragment() != null || (rawPath != null && !rawPath.equals("/"))
            ) {
                throw new InvalidScopeException();
            }
            scheme = scheme.toLowerCase(Locale.ROOT);
            if (!scheme.equals("https") && !scheme.equals("http")) throw new InvalidScopeException();

            host = host.toLowerCase(Locale.ROOT);
            int port = url.getPort();
            boolean defaultPort = (scheme.equals("https") && port == 443) || (scheme.equals("http") && port == 80);
            String origin = scheme + "://" + host + (port == -1 || defaultPort ? "" : ":" + port);
            return new JSONArray().put(accountId).put(origin).toString();
        } catch (URISyntaxException exception) {
            throw new InvalidScopeException();
        }
    }

    static final class InvalidScopeException extends Exception {}
}

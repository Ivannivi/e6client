package com.example.e6client;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.fail;
import org.junit.Test;

public class CredentialScopeTest {
    @Test
    public void canonicalizesOriginsWithOrWithoutRootSlashAndDefaultPort() throws Exception {
        assertEquals(
            "v1:9:account-1:https://e621.net",
            CredentialScope.key("account-1", "HTTPS://E621.NET:443/")
        );
        assertEquals(
            CredentialScope.key("account-1", "https://e621.net"),
            CredentialScope.key("account-1", "https://e621.net/")
        );
    }

    @Test
    public void keepsAccountsSchemesAndNonDefaultPortsIsolated() throws Exception {
        String defaultHttps = CredentialScope.key("account-1", "https://e621.net");
        String defaultHttpsWithPort = CredentialScope.key("account-1", "https://e621.net:443/");
        String nonDefaultHttps = CredentialScope.key("account-1", "https://e621.net:8443");
        String http = CredentialScope.key("account-1", "http://e621.net");
        String otherAccount = CredentialScope.key("account-2", "https://e621.net");

        assertEquals(defaultHttps, defaultHttpsWithPort);
        assertEquals("v1:9:account-1:https://e621.net:8443", nonDefaultHttps);
        assertNotEquals(defaultHttps, nonDefaultHttps);
        assertNotEquals(defaultHttps, http);
        assertNotEquals(defaultHttps, otherAccount);
    }

    @Test
    public void rejectsAmbiguousAndNonHttpScopes() {
        for (String host : new String[] {
            "https://user:secret@e621.net", "https://e621.net/api", "https://e621.net/?key=secret",
            "https://e621.net/#secret", "file:///tmp", "not-a-url"
        }) {
            try {
                CredentialScope.key("account-1", host);
                fail("Expected invalid scope: " + host);
            } catch (CredentialScope.InvalidScopeException expected) {}
        }
    }
}

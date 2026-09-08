package com.example.e6client;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;
import org.junit.Test;

public class CredentialScopeTest {
    @Test
    public void canonicalizesHostCaseDefaultPortAndRootSlash() throws Exception {
        assertEquals(
            "[\"account-1\",\"https://e621.net\"]",
            CredentialScope.key("account-1", "HTTPS://E621.NET:443/")
        );
    }

    @Test
    public void keepsAccountsSchemesAndNonDefaultPortsIsolated() throws Exception {
        assertEquals(
            "[\"account-2\",\"http://e621.net:8443\"]",
            CredentialScope.key("account-2", "http://e621.net:8443")
        );
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

package com.example.e6client;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(CredentialStorePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

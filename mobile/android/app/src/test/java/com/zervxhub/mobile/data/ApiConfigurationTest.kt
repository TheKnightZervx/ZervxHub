package com.zervxhub.mobile.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ApiConfigurationTest {
    @Test
    fun emptyApiOriginIsDisconnected() {
        assertNull(ApiConfiguration.parse("", isDebug = false))
        assertNull(ApiConfiguration.parse("   ", isDebug = true))
    }

    @Test
    fun releaseBuildRequiresHttps() {
        assertNull(ApiConfiguration.parse("http://api.example.test", isDebug = false))
        assertEquals("https", ApiConfiguration.parse("https://api.example.test", isDebug = false)?.scheme)
    }

    @Test
    fun debugBuildMayUseLocalHttp() {
        assertEquals("http", ApiConfiguration.parse("http://10.0.2.2:8787", isDebug = true)?.scheme)
    }

    @Test
    fun rejectsEmbeddedCredentialsQueryAndFragment() {
        assertNull(ApiConfiguration.parse("https://user:pass@api.example.test", isDebug = false))
        assertNull(ApiConfiguration.parse("https://api.example.test?token=secret", isDebug = false))
        assertNull(ApiConfiguration.parse("https://api.example.test#fragment", isDebug = false))
    }
}

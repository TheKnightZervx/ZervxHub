package com.zervxhub.mobile.data

import com.zervxhub.mobile.BuildConfig
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/** Cross-platform API boundary; never guess a production host. */
object ApiConfiguration {
    fun baseUrl(): HttpUrl? = parse(BuildConfig.API_BASE_URL, BuildConfig.DEBUG)

    internal fun parse(raw: String, isDebug: Boolean): HttpUrl? {
        val value = raw.trim()
        if (value.isEmpty()) return null
        val parsed = value.toHttpUrlOrNull() ?: return null
        if (parsed.scheme != "https" && !(isDebug && parsed.scheme == "http")) return null
        if (parsed.username.isNotEmpty() || parsed.password.isNotEmpty()) return null
        if (parsed.query != null || parsed.fragment != null) return null
        return parsed
    }
}

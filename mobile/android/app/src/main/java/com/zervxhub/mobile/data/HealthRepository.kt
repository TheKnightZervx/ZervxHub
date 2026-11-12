package com.zervxhub.mobile.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.concurrent.TimeUnit

sealed interface ApiConnection {
    data object NotConfigured : ApiConnection
    data object Checking : ApiConnection
    data class Connected(val version: String) : ApiConnection
    data class Unavailable(val message: String) : ApiConnection
}

/** Public, credential-free API health probe. Authenticated routes are intentionally separate. */
class HealthRepository(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .callTimeout(8, TimeUnit.SECONDS)
        .followRedirects(false)
        .followSslRedirects(false)
        .build()
) {
    suspend fun check(): ApiConnection = withContext(Dispatchers.IO) {
        val baseUrl = ApiConfiguration.baseUrl() ?: return@withContext ApiConnection.NotConfigured
        val healthUrl = baseUrl.newBuilder().addPathSegments("v1/health").build()
        try {
            client.newCall(Request.Builder().url(healthUrl).get().build()).execute().use { response ->
                if (!response.isSuccessful) return@withContext ApiConnection.Unavailable("API returned an unavailable response")
                val payload = JSONObject(response.body?.string().orEmpty())
                if (!payload.optBoolean("ok", false)) {
                    return@withContext ApiConnection.Unavailable("API health check did not pass")
                }
                ApiConnection.Connected(payload.optString("version", "Connected"))
            }
        } catch (_: Exception) {
            ApiConnection.Unavailable("Could not reach the ZervxHub API")
        }
    }
}

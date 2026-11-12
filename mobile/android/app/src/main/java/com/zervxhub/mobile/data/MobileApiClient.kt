package com.zervxhub.mobile.data

import android.content.Context
import com.zervxhub.mobile.security.SecureTokenStore
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class MobileUser(val id: String, val email: String, val displayName: String)
data class MobileMessage(val id: String, val senderId: String, val content: String, val createdAt: Long)
data class MobileConversation(val id: String, val kind: String, val name: String?)

class MobileApiClient(context: Context) {
    private val tokens = SecureTokenStore(context.applicationContext)
    private val client = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .callTimeout(15, TimeUnit.SECONDS)
        .followRedirects(false)
        .followSslRedirects(false)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    fun isSignedIn(): Boolean = !tokens.read().isNullOrBlank()

    suspend fun requestEmailCode(email: String): Pair<String, Int> {
        val response = call("POST", "v2/mobile/auth/email/request-code", JSONObject().put("email", email), authenticated = false)
        return response.getString("challengeId") to response.optInt("expiresInSeconds", 300)
    }

    suspend fun verifyEmailCode(challengeId: String, code: String): MobileUser {
        val response = call(
            "POST", "v2/mobile/auth/email/verify-code",
            JSONObject().put("challengeId", challengeId).put("code", code),
            authenticated = false
        )
        val token = response.optString("token")
        if (token.isBlank()) throw IOException("The sign-in service returned an invalid session.")
        tokens.save(token)
        return response.getJSONObject("user").toUser()
    }

    suspend fun account(): MobileUser = call("GET", "v2/mobile/account").getJSONObject("user").toUser()

    suspend fun logout() {
        try { call("POST", "v2/mobile/auth/session/logout", JSONObject()) } finally { tokens.clear() }
    }

    suspend fun globalMessages(): List<MobileMessage> =
        call("GET", "v2/mobile/chat/global/messages?limit=40").getJSONArray("messages").toMessages()

    suspend fun sendGlobalMessage(content: String): MobileMessage =
        call("POST", "v2/mobile/chat/global/messages", JSONObject().put("content", content))
            .getJSONObject("message").toMessage()

    suspend fun conversations(): List<MobileConversation> {
        val rows = call("GET", "v2/mobile/chat/conversations").getJSONArray("conversations")
        return (0 until rows.length()).map { index ->
            val row = rows.getJSONObject(index)
            MobileConversation(row.getString("id"), row.getString("kind"), row.optString("name").takeIf { it.isNotBlank() })
        }
    }

    suspend fun createDirect(recipientEmail: String): String =
        call("POST", "v2/mobile/chat/direct", JSONObject().put("recipientEmail", recipientEmail))
            .getString("conversationId")

    suspend fun createGroup(name: String, memberEmails: List<String>): String {
        val members = JSONArray().apply { memberEmails.forEach { put(it) } }
        return call("POST", "v2/mobile/chat/groups", JSONObject().put("name", name).put("memberEmails", members))
            .getString("conversationId")
    }

    suspend fun privateMessages(conversationId: String): List<MobileMessage> =
        call("GET", "v2/mobile/chat/conversations/$conversationId/messages?limit=40")
            .getJSONArray("messages").toMessages()

    suspend fun sendPrivateMessage(conversationId: String, content: String): MobileMessage =
        call("POST", "v2/mobile/chat/conversations/$conversationId/messages", JSONObject().put("content", content))
            .getJSONObject("message").toMessage()

    suspend fun subscription(): JSONObject = call("GET", "v2/mobile/subscription")

    private suspend fun call(
        method: String,
        path: String,
        body: JSONObject? = null,
        authenticated: Boolean = true
    ): JSONObject = withContext(Dispatchers.IO) {
        val base = ApiConfiguration.baseUrl()
            ?: throw IOException("The verified ZervxHub API address has not been configured yet.")
        val urlBuilder = base.newBuilder().addPathSegments(path.substringBefore("?"))
        path.substringAfter("?", "").takeIf { it.isNotBlank() }?.split("&")?.forEach { pair ->
            val parts = pair.split("=", limit = 2)
            urlBuilder.addQueryParameter(parts[0], parts.getOrElse(1) { "" })
        }
        val url = urlBuilder.build()
        val builder = Request.Builder().url(url).header("Accept", "application/json")
        if (authenticated) {
            val token = tokens.read() ?: throw IOException("Sign in to continue.")
            builder.header("Authorization", "Bearer $token")
        }
        when (method) {
            "GET" -> builder.get()
            "POST" -> builder.post((body ?: JSONObject()).toString().toRequestBody(jsonType))
            else -> throw IOException("Unsupported request.")
        }
        try {
            client.newCall(builder.build()).execute().use { response ->
                val raw = response.body?.string().orEmpty()
                val payload = try { JSONObject(raw.ifBlank { "{}" }) } catch (_: Exception) { JSONObject() }
                if (!response.isSuccessful) {
                    if (response.code == 401 && authenticated) tokens.clear()
                    throw IOException(payload.optString("error").ifBlank { "ZervxHub request failed (HTTP " + response.code + ")." })
                }
                payload
            }
        } catch (error: IOException) {
            throw error
        } catch (_: Exception) {
            throw IOException("Could not reach the ZervxHub service.")
        }
    }

    private fun JSONObject.toUser() = MobileUser(
        optString("id"), optString("email"), optString("displayName")
    )

    private fun JSONObject.toMessage() = MobileMessage(
        optString("id"), optString("senderId"), optString("content"), optLong("createdAt")
    )

    private fun JSONArray.toMessages(): List<MobileMessage> =
        (0 until length()).map { getJSONObject(it).toMessage() }
}

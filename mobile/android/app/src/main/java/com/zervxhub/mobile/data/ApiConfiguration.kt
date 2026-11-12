package com.zervxhub.mobile.data

import com.zervxhub.mobile.BuildConfig
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

/** Cross-platform API boundary; never guess a production host. */
object ApiConfiguration {
 fun baseUrl(): HttpUrl? {
  val raw = BuildConfig.API_BASE_URL.trim()
  if (raw.isEmpty()) return null
  val parsed = raw.toHttpUrlOrNull() ?: return null
  if (parsed.scheme != "https" && !BuildConfig.DEBUG) return null
  if (parsed.username.isNotEmpty() || parsed.password.isNotEmpty()) return null
  return parsed
 }
}

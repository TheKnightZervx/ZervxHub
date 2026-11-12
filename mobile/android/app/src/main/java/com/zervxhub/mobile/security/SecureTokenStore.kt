package com.zervxhub.mobile.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.spec.GCMParameterSpec

/** AES-GCM token storage backed by a non-exportable Android Keystore key. */
class SecureTokenStore(context: Context) {
 private val preferences = context.getSharedPreferences("secure_session", Context.MODE_PRIVATE)
 private val keyAlias = "zervxhub_session_v1"

 fun save(token: String) {
  require(token.isNotBlank())
  val cipher = Cipher.getInstance(TRANSFORMATION)
  cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
  val packed = cipher.iv + cipher.doFinal(token.toByteArray(Charsets.UTF_8))
  check(preferences.edit().putString(TOKEN_KEY, Base64.encodeToString(packed, Base64.NO_WRAP)).commit())
 }

 fun read(): String? {
  val packed = preferences.getString(TOKEN_KEY, null) ?: return null
  return try {
   val bytes = Base64.decode(packed, Base64.NO_WRAP)
   require(bytes.size > IV_LENGTH)
   val cipher = Cipher.getInstance(TRANSFORMATION)
   cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(128, bytes.copyOfRange(0, IV_LENGTH)))
   cipher.doFinal(bytes.copyOfRange(IV_LENGTH, bytes.size)).toString(Charsets.UTF_8)
  } catch (_: Exception) {
   clear()
   null
  }
 }

 fun clear() { preferences.edit().remove(TOKEN_KEY).commit() }

 private fun getOrCreateKey(): javax.crypto.SecretKey {
  val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
  (store.getKey(keyAlias, null) as? javax.crypto.SecretKey)?.let { return it }
  val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
  generator.init(KeyGenParameterSpec.Builder(keyAlias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
   .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
   .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
   .setRandomizedEncryptionRequired(true).build())
  return generator.generateKey()
 }

 private companion object {
  const val TRANSFORMATION = "AES/GCM/NoPadding"
  const val TOKEN_KEY = "encrypted_session_token"
  const val IV_LENGTH = 12
 }
}

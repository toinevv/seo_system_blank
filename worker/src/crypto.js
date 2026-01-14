/**
 * Decryption helper using WebCrypto API
 * Called from Python worker to decrypt API keys
 */

export async function decryptAesGcm(encryptedBase64, keyBase64) {
  if (!encryptedBase64 || !keyBase64) return null;

  try {
    // Decode base64
    const encryptedData = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));

    // Extract IV (16 bytes), tag (16 bytes), ciphertext
    const iv = encryptedData.slice(0, 16);
    const tag = encryptedData.slice(16, 32);
    const ciphertext = encryptedData.slice(32);

    // Combine ciphertext and tag (WebCrypto expects them together)
    const ciphertextWithTag = new Uint8Array(ciphertext.length + tag.length);
    ciphertextWithTag.set(ciphertext);
    ciphertextWithTag.set(tag, ciphertext.length);

    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      cryptoKey,
      ciphertextWithTag
    );

    // Convert to string
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

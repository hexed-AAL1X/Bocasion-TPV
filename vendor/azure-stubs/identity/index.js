"use strict";
/** Stub: BocaSoft no usa autenticación Azure AD. */
class StubCredential {
  async getToken() {
    throw new Error("Azure AD no está disponible en este build");
  }
}
module.exports = {
  DefaultAzureCredential: StubCredential,
  ClientSecretCredential: StubCredential,
  ClientCertificateCredential: StubCredential,
  ManagedIdentityCredential: StubCredential,
  EnvironmentCredential: StubCredential,
  UsernamePasswordCredential: StubCredential,
  InteractiveBrowserCredential: StubCredential,
  DeviceCodeCredential: StubCredential,
  AzureCliCredential: StubCredential,
  ChainedTokenCredential: StubCredential,
};

"use strict";
class KeyClient {
  constructor() {
    throw new Error("Azure Key Vault no está disponible en este build");
  }
}
module.exports = { KeyClient, CryptographyClient: KeyClient };

import { DefaultAzureCredential } from "@azure/identity";

export class CredentialCache {
  private static credential: DefaultAzureCredential | null = null;

  public static getInstance(): DefaultAzureCredential {
    if (!this.credential) {
      this.credential = new DefaultAzureCredential();
    }
    return this.credential;
  }
}

import type { TokenCredential } from "@azure/core-auth";
import {
  AzureCliCredential,
  ManagedIdentityCredential,
  VisualStudioCodeCredential,
  EnvironmentCredential,
  WorkloadIdentityCredential,
} from "@azure/identity";
import type { AzureCredentialName } from "@lage-run/config";

// Canonical list of allowed credential names (order reflects selection precedence for docs/UI):
// environmentCredential, workloadIdentityCredential, managedIdentityCredential, visualStudioCodeCredential, azureCliCredential
const credentialNames = [
  "environmentCredential",
  "workloadIdentityCredential",
  "managedIdentityCredential",
  "visualStudioCodeCredential",
  "azureCliCredential",
] as const;

export class CredentialCache {
  private static cache: Map<AzureCredentialName, TokenCredential> = new Map();

  // Expose the list for runtime validation elsewhere
  public static readonly credentialNames = credentialNames as readonly AzureCredentialName[];
  /**
   * Returns a credential instance based on the provided name. Results are cached per name.
   * If no name is provided, EnvironmentCredential is used by default.
   */
  public static getInstance(credentialName?: AzureCredentialName): TokenCredential {
    const key: AzureCredentialName = credentialName ?? "environmentCredential";
    const existing = this.cache.get(key);
    if (existing) return existing;

    let credential: TokenCredential;
    switch (key) {
      case "environmentCredential":
        credential = new EnvironmentCredential();
        break;
      case "workloadIdentityCredential":
        credential = new WorkloadIdentityCredential();
        break;
      case "managedIdentityCredential":
        credential = new ManagedIdentityCredential();
        break;
      case "visualStudioCodeCredential":
        credential = new VisualStudioCodeCredential();
        break;
      case "azureCliCredential":
        credential = new AzureCliCredential();
        break;
    }

    this.cache.set(key, credential);
    return credential;
  }
}

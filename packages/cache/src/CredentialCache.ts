import type { TokenCredential } from "@azure/core-auth";
import {
  AzureCliCredential,
  ManagedIdentityCredential,
  VisualStudioCodeCredential,
  EnvironmentCredential,
  WorkloadIdentityCredential,
} from "@azure/identity";
import type { AzureCredentialName } from "@lage-run/config";

// Canonical list of allowed credential names (kebab-case; order is for docs/UI only):
// environment-credential, workload-identity-credential, managed-identity-credential, visual-studio-code-credential, azure-cli-credential
const credentialNames = [
  "environment-credential",
  "workload-identity-credential",
  "managed-identity-credential",
  "visual-studio-code-credential",
  "azure-cli-credential",
] as const;

export class CredentialCache {
  private static cache: Map<AzureCredentialName, TokenCredential> = new Map();

  // Expose the list for runtime validation elsewhere
  public static readonly credentialNames: readonly AzureCredentialName[] = credentialNames;
  /**
   * Returns a credential instance based on the provided name. Results are cached per name.
   * If no name is provided, EnvironmentCredential is used by default.
   */
  public static getInstance(credentialName?: AzureCredentialName): TokenCredential {
    const key: AzureCredentialName = credentialName ?? "environment-credential"; // Default if none provided
    const existing = this.cache.get(key);
    if (existing) return existing;

    let credential: TokenCredential | undefined;
    switch (key) {
      case "environment-credential":
        credential = new EnvironmentCredential();
        break;
      case "workload-identity-credential":
        credential = new WorkloadIdentityCredential();
        break;
      case "managed-identity-credential":
        credential = new ManagedIdentityCredential();
        break;
      case "visual-studio-code-credential":
        credential = new VisualStudioCodeCredential();
        break;
      case "azure-cli-credential":
        credential = new AzureCliCredential();
        break;
    }
    if (!credential) {
      // This should never happen due to the union type and exhaustive list, but keep a safeguard.
      throw new Error(`Unsupported credential name: ${key}`);
    }
    this.cache.set(key, credential);
    return credential;
  }
}

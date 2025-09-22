import type { TokenCredential } from "@azure/core-auth";
import {
  DefaultAzureCredential,
  AzureCliCredential,
  ManagedIdentityCredential,
  VisualStudioCodeCredential,
  EnvironmentCredential,
  WorkloadIdentityCredential,
} from "@azure/identity";
import type { AzureCredentialName } from "@lage-run/config";

// Canonical list of allowed credential names, matching the camelCase class names from @azure/identity
const credentialNames = [
  "defaultAzureCredential",
  "azureCliCredential",
  "managedIdentityCredential",
  "visualStudioCodeCredential",
  "environmentCredential",
  "workloadIdentityCredential",
] as const;

export class CredentialCache {
  private static cache: Map<AzureCredentialName, TokenCredential> = new Map();

  // Expose the list for runtime validation elsewhere
  public static readonly credentialNames = credentialNames as readonly AzureCredentialName[];
  /**
   * Returns a credential instance based on the provided name. Results are cached per name.
   * If no name is provided (or it's unrecognized), DefaultAzureCredential is used.
   *
   * Supported names (case-insensitive):
   * - default | defaultazurecredential
   * - azureclicredential | cli | az
   * - managedidentitycredential | managedidentity | mi
   * - visualstudiocodecredential | vscode
   * - environmentcredential | env
   * - workloadidentitycredential | workload
   */
  public static getInstance(credentialName?: AzureCredentialName): TokenCredential {
    const key: AzureCredentialName = credentialName ?? "defaultAzureCredential";
    const existing = this.cache.get(key);
    if (existing) return existing;

    let credential: TokenCredential;
    switch (key) {
      case "azureCliCredential":
        credential = new AzureCliCredential();
        break;
      case "managedIdentityCredential":
        credential = new ManagedIdentityCredential();
        break;
      case "visualStudioCodeCredential":
        credential = new VisualStudioCodeCredential();
        break;
      case "environmentCredential":
        credential = new EnvironmentCredential();
        break;
      case "workloadIdentityCredential":
        credential = new WorkloadIdentityCredential();
        break;
      case "defaultAzureCredential":
      default:
        credential = new DefaultAzureCredential();
        break;
    }

    this.cache.set(key, credential);
    return credential;
  }
}

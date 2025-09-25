import type { TokenCredential } from "@azure/core-auth";
import {
  AzureCliCredential,
  ManagedIdentityCredential,
  VisualStudioCodeCredential,
  EnvironmentCredential,
  WorkloadIdentityCredential,
} from "@azure/identity";
import type { AzureCredentialName } from "@lage-run/config";
/**
 * Exhaustive credential factory map keyed by AzureCredentialName.
 * This enforces compile-time alignment with the AzureCredentialName union and provides a single source of truth.
 */
type CredentialFactoryMap = { [K in AzureCredentialName]: () => TokenCredential };
const CREDENTIAL_FACTORY: CredentialFactoryMap = {
  environment: () => new EnvironmentCredential(),
  "workload-identity": () => new WorkloadIdentityCredential(),
  "managed-identity": () => new ManagedIdentityCredential(),
  "visual-studio-code": () => new VisualStudioCodeCredential(),
  "azure-cli": () => new AzureCliCredential(),
};

export class CredentialCache {
  private static cache: Map<AzureCredentialName, TokenCredential> = new Map();

  // Expose the list for runtime validation elsewhere (derived from the exhaustive factory above)
  public static readonly credentialNames: readonly AzureCredentialName[] = Object.keys(CREDENTIAL_FACTORY) as AzureCredentialName[];

  /**
   * Returns a credential instance based on the provided name. Results are cached per name.
   * If no name is provided, EnvironmentCredential is used by default.
   */
  public static getInstance(credentialName?: AzureCredentialName): TokenCredential {
    const key = (credentialName ?? "environment") as AzureCredentialName;
    const existing = this.cache.get(key);
    if (existing) return existing;

    const credential = CREDENTIAL_FACTORY[key]();
    this.cache.set(key, credential);
    return credential;
  }
}

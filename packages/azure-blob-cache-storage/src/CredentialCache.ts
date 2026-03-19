import type { TokenCredential } from "@azure/core-auth";
import {
  AzureCliCredential,
  ManagedIdentityCredential,
  VisualStudioCodeCredential,
  EnvironmentCredential,
  WorkloadIdentityCredential,
} from "@azure/identity";

/** Allowed credential names matching camelCase of @azure/identity credential class names */
export type AzureCredentialName = "environment" | "workload-identity" | "managed-identity" | "visual-studio-code" | "azure-cli";

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

  public static readonly credentialNames: readonly AzureCredentialName[] = Object.keys(CREDENTIAL_FACTORY) as AzureCredentialName[];

  public static getInstance(credentialName?: AzureCredentialName): TokenCredential {
    const key = (credentialName ?? "environment") as AzureCredentialName;
    const existing = this.cache.get(key);
    if (existing) return existing;

    const credential = CREDENTIAL_FACTORY[key]();
    this.cache.set(key, credential);
    return credential;
  }
}

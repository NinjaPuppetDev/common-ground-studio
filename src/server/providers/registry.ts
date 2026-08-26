/**
 * Provider Registry for Common Ground
 * Allows lookup and selection of any registered provider profile.
 */

import { ProviderProfile } from "../../../packages/contracts/v1/provider.js";
import { DAVID_RAIGOZA_PROVIDER_PROFILE } from "./david-raigoza.js";

const REGISTRY: Record<string, ProviderProfile> = {
  "david-raigoza": DAVID_RAIGOZA_PROVIDER_PROFILE
};

export function getProviderProfile(id: string = "david-raigoza"): ProviderProfile {
  const profile = REGISTRY[id];
  if (!profile) {
    // Fall back to David Raigoza as default
    return DAVID_RAIGOZA_PROVIDER_PROFILE;
  }
  return profile;
}

export function listProviders(): ProviderProfile[] {
  return Object.values(REGISTRY);
}

export { DAVID_RAIGOZA_PROVIDER_PROFILE };

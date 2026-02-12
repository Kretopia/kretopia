import { createThirdwebClient } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";

export const THIRDWEB_CLIENT_ID = "0e6791560ac63c8c3dbb340cae4984bb";

export const thirdwebClient = createThirdwebClient({
  clientId: THIRDWEB_CLIENT_ID,
});

// Default chain — Base L2
export const defaultChain = base;

// Supported chains
export const supportedChains = [base, baseSepolia];

import { createOffchainClient } from "@thenamespace/offchain-manager";

// Client-side namespace client for read-only operations (no API key required)
const clientSideClient = createOffchainClient();

export default clientSideClient;

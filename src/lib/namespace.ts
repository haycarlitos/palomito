import { createOffchainClient } from "@thenamespace/offchain-manager";
const client = createOffchainClient({
    mode: "mainnet",
    defaultApiKey: process.env.NAMESPACE_API_KEY!
});

export default client;
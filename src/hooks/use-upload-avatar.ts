 import { useMutation } from '@tanstack/react-query';
import { SiweMessage } from 'siwe';
import { useAccount, useSignMessage } from 'wagmi';

type Network = 'mainnet' | 'sepolia' ;
type UploadParams = {
  file: File;
  subname: string;      // e.g. 'alice.offchainsub.eth'
  network: Network;     // must match backend enum
  scope?: 'avatar' | 'header' | 'avatar+header';
};

// Direct calls to avatar service (configurable via env)
const baseUrl = process.env.NEXT_PUBLIC_AVATAR_SERVICE_URL || 'https://metadata.namespace.ninja';

async function getNonce(address: string, scope: UploadParams['scope'] = 'avatar+header') {
  const url = `${baseUrl}/auth/nonce`;
  // Request nonce from avatar service
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ address, scope }),
    });
    
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`Failed to get nonce: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    return data as { nonce: string; expiresAt: number };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Cannot connect to avatar service. Check if the server is running and CORS is configured.');
    }
    throw error;
  }
}

function buildSiweMessage(params: {
  address: string;
  nonce: string;
  statement?: string;
}) {
  const { address, nonce } = params;
  
  const msg = new SiweMessage({
    domain: process.env.NEXT_PUBLIC_SIWE_DOMAIN || 'localhost:3000',
    address: address, 
    statement:'Sign in to Avatar Service',
    uri: process.env.NEXT_PUBLIC_SIWE_URI || 'http://localhost:3000',
    version: '1',
    chainId: Number(process.env.NEXT_PUBLIC_SIWE_CHAIN_ID || 1),
    nonce,
    issuedAt: new Date().toISOString(),
  });
  
  return msg.prepareMessage();
}

async function uploadAvatarDirect({
  file,
  subname,
  network,
  address,
  signMessageAsync,
}: {
  file: File;
  subname: string;
  network: Network;
  address: `0x${string}`;
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>;
}) {
  // 1) Get nonce
  const { nonce } = await getNonce(address, 'avatar+header');

  // 2) Build SIWE message and sign
  const siweMessage = buildSiweMessage({ address, nonce });
  const siweSignature = await signMessageAsync({ message: siweMessage });

  // 3) POST multipart form
  const form = new FormData();
  
  // Append fields in a specific order (some servers are sensitive to this)
  form.append('address', address);
  form.append('siweMessage', siweMessage);
  form.append('siweSignature', siweSignature);
  form.append('avatar', file, file.name);  // Explicitly set filename

  
  const res = await fetch(`${baseUrl}/profile/${network}/${subname}/avatar`, {
    method: 'POST',
    body: form,
    // Don't set Content-Type - let browser set multipart/form-data boundary
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'Upload failed');
  }

  return res.json() as Promise<{
    subname: string;
    network: string;
    avatarUrl: string;
    uploadedAt: string;
    fileSize: number;
    isUpdate: boolean;
  }>;
}


export function useUploadAvatar() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, subname, network }: UploadParams) => {
      if (!address) throw new Error('Connect wallet');
      return uploadAvatarDirect({
        file,
        subname,
        network,
        address,
        signMessageAsync,
      });
    },
  });


  return {
    uploadAvatar: uploadMutation.mutateAsync,
    isUploading: uploadMutation.isPending,
    data: uploadMutation.data,
    error: uploadMutation.error,
  };
}

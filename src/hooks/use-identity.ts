import { useEnsName, useEnsAvatar } from 'wagmi'
import { usePreferredIdentity } from './use-subnames'
import { mainnet } from 'wagmi/chains'
import { emojiAvatarForAddress } from '@/utils/avatar'

export function useIdentity(address: string | undefined) {
  // Fetch ENS name and avatar
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  })
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: mainnet.id,
  })

  // Get subname/username data and preferred identity
  const { name, avatarSrc, isLoading, hasSubnames, subname, refetch } = usePreferredIdentity({
    address,
    fallbackName: ensName || undefined,
    fallbackAvatar: ensAvatar || undefined,
  })

  // Generate deterministic emoji/color fallback if no avatar
  const avatarData = address ? emojiAvatarForAddress(address) : { emoji: '👤', color: '#9CA3AF' }
  const fallbackEmoji = avatarData.emoji
  const fallbackColor = avatarData.color

  return {
    name,
    avatarSrc,
    fallbackEmoji,
    fallbackColor,
    isLoading,
    hasSubnames,
    subname,
    ensName,
    ensAvatar,
    refetch,
  }
}


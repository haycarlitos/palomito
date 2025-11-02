import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import clientSideClient from '@/lib/namespace-client'

interface CreateSubnameData {
  label: string
  address: string
  displayName: string
  pfpUrl: string
}

export function useSubnameAvailability(label: string) {
  const ENS_NAME = process.env.NEXT_PUBLIC_ENS_NAME
  
  return useQuery({
    queryKey: ['subname-availability', label],
    queryFn: async (): Promise<boolean> => {
      if (!label || !ENS_NAME) return false
      
      try {
        const fullSubname = `${label}.${ENS_NAME}`
        const result = await clientSideClient.isSubnameAvailable(fullSubname)
        // Handle different return types - it might be a boolean or an object with isAvailable property
        if (typeof result === 'boolean') {
          return result
        } else if (result && typeof result === 'object' && 'isAvailable' in result) {
          return Boolean(result.isAvailable)
        }
        return Boolean(result)
      } catch (error) {
        console.error('Error checking availability:', error)
        return false
      }
    },
    enabled: !!label && label.length > 0,
    staleTime: 1000, // 1 second
    gcTime: 5000, // 5 seconds
  })
}

export function useCreateSubname() {
  const [isCreating, setIsCreating] = useState(false)
  
  const mutation = useMutation({
    mutationFn: async (data: CreateSubnameData) => {
      setIsCreating(true)
      try {
        // Normalize the address before sending
        const normalizedData = {
          ...data,
          address: data.address.toLowerCase().trim()
        }
        
        const response = await fetch('/api/subname/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(normalizedData),
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create subname')
        }
        
        return await response.json()
      } finally {
        setIsCreating(false)
      }
    },
  })

  return {
    createSubname: mutation.mutate,
    isCreating: isCreating || mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    reset: mutation.reset,
  }
}

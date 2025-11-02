import { useCallback } from 'react';

export interface UpdateEnsAvatarParams {
  subname: string;
  avatarUrl: string;
}

export function useUpdateEnsAvatar() {
  const updateEnsAvatar = useCallback(async ({ subname, avatarUrl }: UpdateEnsAvatarParams) => {
    try {
      const response = await fetch('/api/subname/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: subname.split('.')[0], // Extract label from full subname
          pfpUrl: avatarUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update ENS avatar: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('ENS avatar updated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error updating ENS avatar:', error);
      throw error;
    }
  }, []);

  return {
    updateEnsAvatar,
  };
}

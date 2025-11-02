// Generate deterministic emoji and color for addresses
export function emojiAvatarForAddress(address: string) {
  const emojis = [
    '🌟', '🎨', '🚀', '🌈', '🎭', '🎪', '🎯', '🎲', 
    '🎸', '🎺', '🎼', '🎹', '🎬', '🎮', '🏆', '🏀', 
    '⚽', '🎾', '🏈', '🏐', '🎱', '🏓', '🏸', '🥊',
    '🎿', '⛷️', '🏂', '🏄', '🚴', '🏊', '⛹️', '🤺',
    '🏹', '🎣', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️'
  ]
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    '#EC7063', '#AF7AC5', '#5DADE2', '#48C9B0', '#F4D03F',
    '#EB984E', '#7DCEA0', '#AED6F1', '#FADBD8', '#D7BDE2'
  ]
  
  const hash = address.toLowerCase().split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  
  return {
    emoji: emojis[hash % emojis.length],
    color: colors[hash % colors.length]
  }
}


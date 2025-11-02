import * as React from "react"
import Image from "next/image"

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}
    {...props}
  />
))
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement> & { src?: string }
>(({ className = "", src, alt, ...props }, ref) => {
  if (!src) return null
  
  // Check if it's a data URL or external URL
  const isDataUrl = src.startsWith('data:')
  
  return (
    <Image
      src={src}
      alt={alt || "Avatar"}
      width={80}
      height={80}
      unoptimized={isDataUrl}
      className={`aspect-square h-full w-full object-cover ${className}`}
      {...(props as any)}
    />
  )
})
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`flex h-full w-full items-center justify-center rounded-full bg-gray-100 ${className}`}
    {...props}
  />
))
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }


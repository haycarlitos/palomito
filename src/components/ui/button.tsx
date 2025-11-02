import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    
    const variants = {
      default: "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500",
      outline: "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50 focus:ring-amber-500",
      ghost: "text-stone-700 hover:bg-amber-50 focus:ring-amber-500",
      destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    }
    
    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 px-3 text-sm",
      lg: "h-12 px-6 text-lg",
      icon: "h-10 w-10",
    }
    
    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
    
    return (
      <button
        className={classes}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }


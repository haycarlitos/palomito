"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export function DialogOverlay(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  const { className = "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", ...rest } = props
  return <DialogPrimitive.Overlay className={className} {...rest} />
}

export function DialogContent(
  { className = "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-lg outline-none duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", children, ...props }:
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content className={className} {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({ className = "flex items-center justify-between mb-6", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}

export function DialogTitle({ className = "text-lg font-medium leading-6 text-gray-900", ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={className} {...props} />
}



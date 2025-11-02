"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export function SheetOverlay(props: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>) {
  const { className = "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", ...rest } = props
  return <DialogPrimitive.Overlay className={className} {...rest} />
}

export function SheetContent(
  { className = "fixed inset-x-0 bottom-0 z-50 mt-24 rounded-t-2xl bg-white p-6 shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom", children, ...props }:
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content className={className} {...props}>
        <div className="mx-auto h-1 w-12 rounded-full bg-gray-300 mb-4" />
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function SheetHeader({ className = "mb-4", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props} />
}

export function SheetTitle({ className = "text-base font-medium", ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={className} {...props} />
}



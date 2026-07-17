import { RiLoaderLine } from "@remixicon/react"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

// Omit "children": remixicon's props type declares `children?: undefined`, which conflicts
// with the ReactNode that ComponentProps<"svg"> allows. A spinner has no children anyway.
type SpinnerProps = Omit<ComponentProps<"svg">, "children">

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <RiLoaderLine data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }

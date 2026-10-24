import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "group/button relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none",
    // Tactile ::before surface layer
    "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:border before:border-transparent",
    "before:transition-[transform,scale,background-color,border-color,box-shadow,filter] before:duration-150 before:ease-out",
    // shadcn active translate + tactile ::before scale compression
    "active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:not-data-[variant=push]:before:scale-[0.99] data-pressed:not-data-[variant=push]:before:scale-[0.99]",
    "motion-reduce:transition-none motion-reduce:before:transition-none motion-reduce:active:translate-y-0 motion-reduce:active:before:scale-100 motion-reduce:data-pressed:before:scale-100",
    // shadcn focus-visible & aria-invalid rings
    "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground before:bg-primary before:border-primary before:shadow-[0_1px_2px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.2)] dark:before:shadow-[0_1px_2px_rgba(0,0,0,0.5),inset_0_-1px_0_rgba(0,0,0,0.18)] hover:before:bg-primary/90",
        outline:
          "text-foreground before:bg-background dark:before:bg-input/30 before:border-border dark:before:border-input hover:before:bg-muted dark:hover:before:bg-input/50 before:shadow-[0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] dark:before:shadow-[0_1px_2px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] aria-expanded:before:bg-muted",
        secondary:
          "text-secondary-foreground before:bg-secondary before:border-black/5 dark:before:border-white/5 before:shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:before:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:before:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:before:bg-secondary",
        ghost:
          "text-foreground hover:text-foreground before:bg-transparent hover:before:bg-muted dark:hover:before:bg-muted/50 aria-expanded:before:bg-muted",
        destructive:
          "text-white before:bg-destructive before:border-rose-700 before:shadow-[0_1px_2px_rgba(225,29,72,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:before:brightness-110 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        indigo:
          "text-white before:bg-indigo-600 before:border-indigo-700 before:shadow-[0_1px_2px_rgba(79,70,229,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:before:bg-indigo-500",
        emerald:
          "text-white before:bg-emerald-600 before:border-emerald-700 before:shadow-[0_1px_2px_rgba(5,150,105,0.35),inset_0_1px_0_rgba(255,255,255,0.25)] hover:before:bg-emerald-500",
        amber:
          "text-white before:bg-amber-600 before:border-amber-700 before:shadow-[0_1px_2px_rgba(217,119,6,0.35),inset_0_1px_0_rgba(255,255,255,0.28)] hover:before:bg-amber-500",
        link: "text-primary underline-offset-4 hover:underline before:hidden",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
      radius: {
        full: "rounded-full",
        xl: "rounded-xl",
        lg: "rounded-lg",
        md: "rounded-md",
        sm: "rounded-sm",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "full",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  radius = "full",
  asChild = false,
  loading = false,
  customColor,
  disabled,
  style,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    customColor?: string
  }) {
  const Comp = asChild ? Slot.Root : "button"

  const customColorClasses = customColor
    ? "text-white before:bg-[var(--btn-bg)] before:border-white/20 before:shadow-[0_1px_2px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)] hover:before:brightness-110"
    : ""

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      disabled={disabled || loading}
      style={customColor ? ({ "--btn-bg": customColor, ...style } as React.CSSProperties) : style}
      className={cn(
        buttonVariants({
          variant: customColor ? undefined : variant,
          size,
          radius,
        }),
        customColorClasses,
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <svg
              aria-hidden="true"
              data-slot="spinner"
              className="animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}
          {children}
        </>
      )}
    </Comp>
  )
}

export { Button, buttonVariants }

import AppClientLayout from "./app-client-layout"

export const instant = false

export default function AppLayout({ children }: LayoutProps<"/">) {
  return <AppClientLayout>{children}</AppClientLayout>
}

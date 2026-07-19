import { Outlet, Navigate, useLocation } from "react-router"
import { AppSidebar } from "~/components/AppSidebar"
import { ExploreSidebar } from "~/components/ExploreSidebar"
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar"
import { useMe } from "~/hooks/useMe"
import VerifyEmailDialog from "../components/VerifyEmailDialog"

export default function AppLayout() {
    const { isAuth, isInitialLoading } = useMe()
    const location = useLocation()

    if (isInitialLoading) return null

    if (!isAuth) {
        return <Navigate to="/signin" state={{ from: location }} replace />
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full min-w-screen bg-background">
                <AppSidebar />
                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="sticky top-0 z-20 flex items-center border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
                        <SidebarTrigger />
                    </div>
                    <div className="flex min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                            <Outlet />
                        </div>
                        {!location.pathname.startsWith("/messages") && <ExploreSidebar />}
                    </div>
                </main>

            </div>
        </SidebarProvider>
    )
}

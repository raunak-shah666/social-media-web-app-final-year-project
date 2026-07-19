import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenuItem,
} from "~/components/ui/sidebar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "~/components/ui/dialog"
import { Logo } from "./Logo"
import { HomeIcon, MessageSquare } from "lucide-react"
import { NavLink, useLocation } from "react-router"
import React from "react"
import { useMe } from "~/hooks/useMe"
import { Spinner } from "./ui/spinner"
import PostComposer from "./PostComposer"
import { Button } from "~/components/ui/button"
import LogoutButton from "./LogoutButton"

const sidebarItems = [
    {
        icon: <HomeIcon />,
        name: "Home",
        to: "/home"
    },
    {
        icon: <MessageSquare />,
        name: "Messages",
        to: "/messages"
    }
]

export function AppSidebar() {
    const location = useLocation()
    const { isInitialLoading, isAuth } = useMe()
    if (isInitialLoading)
        return <Spinner />

    if (!isAuth)
        return null
    return (
        <Sidebar>
            <SidebarHeader>
                <Logo />
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    {sidebarItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center p-2 rounded-xl transition-colors
       ${isActive
                                    ? "bg-primary/50 text-white font-bold"
                                    : "hover:bg-accent-foreground/50 text-muted-foreground"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Clone icon to control color */}
                                    {React.cloneElement(item.icon, {
                                        className: isActive ? "text-white" : "text-muted-foreground",
                                    })}
                                    <p className="ml-2">{item.name}</p>
                                </>
                            )}
                        </NavLink>
                    ))}
                </SidebarGroup>
                <Dialog>
                    <DialogTrigger asChild >
                        <Button
                            className="flex items-center gap-2"
                        >
                            Post
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Post a reply</DialogTitle>
                        </DialogHeader>
                        <PostComposer />
                    </DialogContent>
                </Dialog>
                <LogoutButton variant="outline" />
                <SidebarGroup />
            </SidebarContent>
            <SidebarFooter />
        </Sidebar>
    )
}
"use client"

import { useState } from "react"
import type { User } from "@supabase/supabase-js"
import { LogOut, User as UserIcon, Eclipse, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"
import { useAuth } from "./auth/auth-provider"

import { ModeToggleSwitch } from "./mode-toggle-switch"
import { signOut } from "@/actions/auth"
import Link from "next/link"

export interface NavUser {
  name: string | null
  email: string | null
  imageUrl?: string | null
}

interface UserNavDropdownProps {
  user: NavUser
}

function userFromAuth(user: User): NavUser {
  return {
    email: user.email || null,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User",
    imageUrl: user.user_metadata?.avatar_url || null,
  }
}

export default function UserNavDropdown({ user: serverUser }: UserNavDropdownProps) {
  const [open, setOpen] = useState(false)
  const { user: clientUser, loading: loadingUser } = useAuth()

  // Server session is authoritative; client auth supplements live updates when available.
  const appUser = clientUser ? userFromAuth(clientUser) : serverUser

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full w-10 h-10 p-0 overflow-hidden" variant="outline">
          {loadingUser && !serverUser ? (
            <UserIcon className="w-5 h-5" />
          ) : appUser.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={appUser.imageUrl} alt={appUser.name || "User avatar"} className="h-full w-full object-cover" />
          ) : (
            <UserIcon className="w-5 h-5" />
          )}
          <span className="sr-only">Open user menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[320px] rounded-xl" align="end" forceMount>
        <div className="flex flex-col">
          {/* Accounts section */}
          <div className="p-4">
            <h3 className="mb-3 text-base font-medium">Account</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 overflow-hidden rounded-full bg-[#3982b8] flex items-center justify-center">
                  {loadingUser && !serverUser ? (
                    <UserIcon className="text-white h-8 w-8 animate-pulse" />
                  ) : appUser.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={appUser.imageUrl} alt={appUser.name || "User avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="text-white h-8 w-8" />
                  )}
                </div>
                <div>
                  {loadingUser && !serverUser ? (
                    <>
                      <p className="text-lg font-medium h-6 bg-gray-300 rounded w-32 animate-pulse"></p>
                      <p className="text-sm text-muted-foreground h-4 bg-gray-200 rounded w-40 mt-1 animate-pulse"></p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium">{appUser.name}</p>
                      <p className="text-sm text-muted-foreground">{appUser.email}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-muted" />

          {/* Menu items */}
          <Button className="w-full text-base justify-between" variant="ghost">
                <div className="flex items-center justify-start gap-2">
                    <Eclipse className="w-4 h-4 text-muted-foreground" />
                    <span className="">Theme</span>
                </div>
              <ModeToggleSwitch />
          </Button>

          <>
            <Button className="w-full text-base justify-between" variant="ghost" asChild>
              <Link href="/workspace/profile">
                <div className="flex items-center justify-start gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="">Settings</span>
                </div>
              </Link>
            </Button>
            <form action={signOut}>
            <Button type="submit" className="w-full text-base justify-between" variant="ghost">
                  <div className="flex items-center justify-start gap-2">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                  <span>Log out</span>
                  </div>    
            </Button>
            </form>
          </>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

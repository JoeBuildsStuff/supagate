"use client"

import { useState, useEffect } from "react"
import { LogOut, User, Eclipse, Settings } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"
import { createClient } from "@/utils/supabase/client"

import { ModeToggleSwitch } from "./mode-toggle-switch"
import { toast } from "sonner"
import Link from "next/link"

// Define a type for our user state
interface AppUser {
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
}

export default function UserNavDropdown() {
  const [open, setOpen] = useState(false)
  const [appUser, setAppUser] = useState<AppUser | null>(null); // State for Supabase user
  const [loadingUser, setLoadingUser] = useState(true); // Loading state

  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      setLoadingUser(true);
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching user:", error);
        setAppUser(null);
      } else if (user) {
        setAppUser({
          email: user.email || null,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "User",
          imageUrl: user.user_metadata?.avatar_url || null,
        });
      } else {
        setAppUser(null); // No user logged in
      }
      setLoadingUser(false);
    };

    fetchUser();

    // Listen for auth changes to update user
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user;
        if (currentUser) {
          setAppUser({
            email: currentUser.email || null,
            name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || "User",
            imageUrl: currentUser.user_metadata?.avatar_url || null,
          });
        } else {
          setAppUser(null);
        }
        setLoadingUser(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // If not loading and no user is found, don't render the component
  if (!loadingUser && !appUser) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full w-10 h-10 p-0 overflow-hidden" variant="outline">
          {loadingUser ? (
            <User className="w-5 h-5" />
          ) : appUser?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={appUser.imageUrl} alt={appUser.name || "User avatar"} className="h-full w-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
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
                  {loadingUser ? (
                    <User className="text-white h-8 w-8 animate-pulse" />
                  ) : appUser?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={appUser.imageUrl} alt={appUser.name || "User avatar"} className="h-full w-full object-cover" />
                  ) : (
                    <User className="text-white h-8 w-8" />
                  )}
                </div>
                <div>
                  {loadingUser ? (
                    <>
                      <p className="text-lg font-medium h-6 bg-gray-300 rounded w-32 animate-pulse"></p>
                      <p className="text-sm text-muted-foreground h-4 bg-gray-200 rounded w-40 mt-1 animate-pulse"></p>
                    </>
                  ) : appUser ? (
                    <>
                      <p className="text-lg font-medium">{appUser.name}</p>
                      <p className="text-sm text-muted-foreground">{appUser.email}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not logged in</p>
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

          {appUser && ( // Only show logout if user is logged in
          <>
                      <Button className="w-full text-base justify-between" variant="ghost" asChild>
              <Link href="/workspace/profile">
                <div className="flex items-center justify-start gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="">Settings</span>
                </div>
              </Link>
            </Button>
            <Button className="w-full text-base justify-between" variant="ghost" onClick={async () => {
              const supabase = createClient();
              const { error } = await supabase.auth.signOut();
              if (error) {
                console.error("Error signing out:", error);
                // Potentially show a toast notification here using a library like sonner
                toast.error("Error signing out", { description: error.message });
              } else {
                setAppUser(null); // Clear user state
                // Redirect to the root page after sign out
                window.location.href = '/';
              }
            }}>
                  <div className="flex items-center justify-start gap-2">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                  <span>Log out</span>
                  </div>    
            </Button>

            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

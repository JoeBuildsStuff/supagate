'use client'

import * as React from "react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "motion/react"

import { Switch } from "@/components/ui/switch"
import { Sun } from "lucide-react"
import { Moon } from "lucide-react"

export function ModeToggleSwitch() {
  const { theme, setTheme } = useTheme()

  const handleCheckedChange = (checked: boolean) => {
    setTheme(checked ? "dark" : "light")
  }

  // Ensure that the component correctly reflects the current theme,
  // even if it was set to "system" by another component.
  // For this switch, "system" will be treated as "light".
  const isChecked = theme === "dark"

  const iconVariants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -90 },
    visible: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.5, rotate: 90 },
  }

  return (
    <div className="relative flex items-center space-x-2">
      <Switch
        id="theme-mode-switch"
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        aria-label="Toggle theme"
      />
      <AnimatePresence mode="sync" initial={false}>
        {theme === "light" && (
          <motion.div
            key="sun"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={iconVariants}
            transition={{ duration: 0.2 }}
            className="absolute left-[.15rem] pointer-events-none"
          >
            <Sun className="h-[.25rem] w-[.25rem]" />
          </motion.div>
        )}
        {theme === "dark" && (
          <motion.div
            key="moon"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={iconVariants}
            transition={{ duration: 0.2 }}
            className="absolute right-[.55rem] pointer-events-none"
          >
              <Moon className="h-[.45rem] w-[.45rem]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 
'use client'

import Link from 'next/link'
import { Button } from '~/components/ui/button'
import { ThemeToggle } from '~/components/theme-toggle'
import { CheckSquare } from 'lucide-react' // Using CheckSquare as a placeholder for the logo icon

export function Navbar() {
  return (
    <nav className="flex items-center justify-between py-3 px-4 bg-white dark:bg-gray-800 shadow-md">
      <div className="flex items-center space-x-2">
        <CheckSquare className="h-6 w-6 text-blue-600" /> {/* Placeholder Logo Icon */}
        <Link href="/" className="text-xl font-bold text-gray-800 dark:text-white">
          ClearBill
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <Link href="#how-it-works" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
          How It Works
        </Link>
        <Link href="#faqs" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
          FAQs
        </Link>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Sign In
        </Button>
        <ThemeToggle />
      </div>
    </nav>
  )
}


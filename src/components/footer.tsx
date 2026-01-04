import Link from 'next/link'
import { Twitter, Facebook, Linkedin } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-800 py-8 px-4 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto text-gray-700 dark:text-gray-300">
        <div className="mb-6 text-center">
          <p className="text-sm mb-4 max-w-2xl mx-auto">
            ClearBill is a patient advocate tool, not a billing authority. Results are for informational purposes only and should
            be reviewed with a professional.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex space-x-4 mb-4 md:mb-0">
            <Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400 text-sm">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400 text-sm">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400 text-sm">
              Contact Us
            </Link>
          </div>
          <p className="text-sm mb-4 md:mb-0">© 2024 ClearBill. All rights reserved.</p>
          <div className="flex space-x-4">
            <Link href="#" aria-label="Twitter">
              <Twitter className="h-5 w-5 hover:text-blue-600 dark:hover:text-blue-400" />
            </Link>
            <Link href="#" aria-label="Facebook">
              <Facebook className="h-5 w-5 hover:text-blue-600 dark:hover:text-blue-400" />
            </Link>
            <Link href="#" aria-label="LinkedIn">
              <Linkedin className="h-5 w-5 hover:text-blue-600 dark:hover:text-blue-400" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}


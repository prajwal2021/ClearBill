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
          
        </div>
      </div>
    </footer>
  )
}


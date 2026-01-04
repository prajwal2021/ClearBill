import { SearchCheck, MessageSquare, FileEdit } from 'lucide-react'

export function Features() {
  return (
    <section className="py-16 px-4 bg-gray-100 dark:bg-gray-800">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
          <SearchCheck className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Analyze Your Bill</h3>
          <p className="text-gray-600 dark:text-gray-300">
            We scan your bill for potential errors and inconsistencies.
          </p>
        </div>

        <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
          <MessageSquare className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Understand the Issues</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Get clear explanations of questionable charges.
          </p>
        </div>

        <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md">
          <FileEdit className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Generate a Dispute Letter</h3>
          <p className="text-gray-600 dark:text-gray-300">
            Create a customized letter to dispute your bill.
          </p>
        </div>
      </div>
    </section>
  )
}


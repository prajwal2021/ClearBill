'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { FileUp } from 'lucide-react'

export function Hero() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processStatus, setProcessStatus] = useState<
    'idle' | 'uploading' | 'analyzing' | 'complete' | 'error'
  >('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [billId, setBillId] = useState<string | null>(null)
  const router = useRouter();

  useEffect(() => {
    if (processStatus === 'complete' && billId) {
      router.push(`/bill/${billId}`);
    }
  }, [processStatus, billId, router]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0])
      setProcessStatus('idle')
      setStatusMessage('')
      setBillId(null)
    } else {
      setSelectedFile(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setStatusMessage('Please select a file to upload.')
      return
    }

    setProcessStatus('uploading')
    setStatusMessage('Uploading...')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setBillId(data.billId)
        setSelectedFile(null)

        setProcessStatus('analyzing')
        setStatusMessage(`Upload successful! File: ${data.fileName}. Status: Analyzing your bill...`)

        if (data.fairnessStatus === 'complete') {
          setProcessStatus('complete')
          setStatusMessage(`Upload successful! File: ${data.fileName}. Status: Bill scored and ready for review.`)
        } else if (data.fairnessStatus === 'failed') {
          setProcessStatus('error')
          setStatusMessage(`Upload successful! File: ${data.fileName}. Status: Scoring failed.`)
        } else if (data.analysisStatus === 'complete') {
          setStatusMessage(`Upload successful! File: ${data.fileName}. Status: Bill analyzed, computing fairness score...`)
        } else if (data.parsingStatus === 'complete') {
          setStatusMessage(`Upload successful! File: ${data.fileName}. Status: Text parsed, performing analysis...`)
        } else if (data.ocrStatus === 'complete') {
          setStatusMessage(`Upload successful! File: ${data.fileName}. Status: OCR complete, parsing text...`)
        } else if (data.ocrStatus === 'failed') {
          setProcessStatus('error')
          setStatusMessage(`Upload successful! File: ${data.fileName}. Status: OCR failed.`)
        }

      } else {
        setProcessStatus('error')
        setStatusMessage(`Upload failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error during upload:', error)
      setProcessStatus('error')
      setStatusMessage('An error occurred during upload.')
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setProcessStatus('idle')
    setStatusMessage('')
    setBillId(null)
  }

  return (
    <section className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
        Spot Errors in Your Medical Bill
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
        Upload your bill, get explanations, and generate a dispute letter to challenge
        unexpected charges.
      </p>

      <Card className="w-full max-w-xl mx-auto p-6 border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center p-8">
          {!selectedFile && (
            <>
              <FileUp className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
                Drag & drop your medical bill here or
                <label
                  htmlFor="file-upload"
                  className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline ml-1"
                >
                  Browse Files
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                PDF, JPG, or PNG formats. Files are stored securely.
              </p>
            </>
          )}

          {selectedFile && (
            <div className="flex flex-col items-center w-full">
              {processStatus !== 'uploading' && processStatus !== 'analyzing' && processStatus !== 'complete' && (
                <p className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  Selected: {selectedFile.name}
                </p>
              )}
              <div className="flex space-x-4 mb-6">
                <Button
                  onClick={handleUpload}
                  disabled={processStatus === 'uploading' || processStatus === 'analyzing'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {processStatus === 'uploading' ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Uploading...
                    </span>
                  ) : processStatus === 'analyzing' ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : (
                    'Upload Bill'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearFile}
                  disabled={processStatus === 'uploading' || processStatus === 'analyzing'}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {statusMessage && (
            <p
              className={
                `text-center text-sm mt-4 ` +
                (processStatus === 'error' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300')
              }
            >
              {statusMessage}
            </p>
          )}
          {billId && (processStatus === 'ocr_extracting' || processStatus === 'complete') && (
            <p className="text-center text-sm mt-2 text-gray-700 dark:text-gray-300">
              Bill ID: {billId}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

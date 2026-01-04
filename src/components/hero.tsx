'use client'

import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { FileUp } from 'lucide-react'

export function Hero() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0])
    } else {
      setSelectedFile(null)
    }
    setMessage('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage('Please select a file to upload.')
      return
    }

    setIsUploading(true)
    setMessage('Uploading...')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Upload successful! File: ${data.fileName}. URL: ${data.publicUrl}`)
        setSelectedFile(null)
      } else {
        setMessage(`Upload failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error during upload:', error)
      setMessage('An error occurred during upload.')
    } finally {
      setIsUploading(false)
    }
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
          <FileUp className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
            Drag & drop your medical bill here or
            <label htmlFor="file-upload" className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline ml-1">
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
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-blue-600 hover:bg-blue-700 text-white w-full max-w-xs"
          >
            {isUploading ? 'Uploading...' : 'Upload Bill'}
          </Button>
          {message && <p className="text-center text-sm mt-4 text-gray-700 dark:text-gray-300">{message}</p>}
        </CardContent>
      </Card>
    </section>
  )
}


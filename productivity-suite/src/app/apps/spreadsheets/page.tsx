'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, Save, Download, Share, Plus, Folder, BarChart3 } from 'lucide-react'

interface Spreadsheet {
  id: string
  name: string
  data: string[][]
  createdAt: string
  updatedAt: string
}

export default function SpreadsheetsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([])
  const [currentSpreadsheet, setCurrentSpreadsheet] = useState<Spreadsheet | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [spreadsheetName, setSpreadsheetName] = useState('')
  const [rows, setRows] = useState(10)
  const [cols, setCols] = useState(8)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const createNewSpreadsheet = () => {
    const data = Array(rows).fill(null).map(() => Array(cols).fill(''))
    const newSheet: Spreadsheet = {
      id: Date.now().toString(),
      name: 'Untitled Spreadsheet',
      data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setSpreadsheets([newSheet, ...spreadsheets])
    setCurrentSpreadsheet(newSheet)
    setSpreadsheetName(newSheet.name)
    setIsEditing(true)
  }

  const openSpreadsheet = (sheet: Spreadsheet) => {
    setCurrentSpreadsheet(sheet)
    setSpreadsheetName(sheet.name)
    setRows(sheet.data.length)
    setCols(sheet.data[0]?.length || 8)
    setIsEditing(true)
  }

  const updateCell = (row: number, col: number, value: string) => {
    if (!currentSpreadsheet) return

    const newData = [...currentSpreadsheet.data]
    if (!newData[row]) newData[row] = Array(cols).fill('')
    newData[row][col] = value

    const updatedSheet = {
      ...currentSpreadsheet,
      data: newData,
      updatedAt: new Date().toISOString()
    }

    setCurrentSpreadsheet(updatedSheet)
    setSpreadsheets(spreadsheets.map(sheet => 
      sheet.id === currentSpreadsheet.id ? updatedSheet : sheet
    ))
  }

  const saveSpreadsheet = () => {
    if (!currentSpreadsheet) return

    const updatedSheet = {
      ...currentSpreadsheet,
      name: spreadsheetName,
      updatedAt: new Date().toISOString()
    }

    setSpreadsheets(spreadsheets.map(sheet => 
      sheet.id === currentSpreadsheet.id ? updatedSheet : sheet
    ))
    setCurrentSpreadsheet(updatedSheet)
    setIsEditing(false)
  }

  const downloadSpreadsheet = () => {
    if (!currentSpreadsheet) return

    const csvContent = currentSpreadsheet.data
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentSpreadsheet.name}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getColumnLabel = (index: number) => {
    let result = ''
    while (index >= 0) {
      result = String.fromCharCode(65 + (index % 26)) + result
      index = Math.floor(index / 26) - 1
    }
    return result
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Spreadsheets
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing && currentSpreadsheet && (
                <>
                  <Button onClick={saveSpreadsheet} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" onClick={downloadSpreadsheet} size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </>
              )}
              <Button onClick={createNewSpreadsheet}>
                <Plus className="h-4 w-4 mr-2" />
                New Spreadsheet
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Spreadsheets List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Folder className="h-5 w-5 mr-2" />
                  My Spreadsheets
                </CardTitle>
                <CardDescription>
                  {spreadsheets.length} spreadsheet{spreadsheets.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {spreadsheets.map((sheet) => (
                    <div
                      key={sheet.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                        currentSpreadsheet?.id === sheet.id ? 'bg-green-50 border-green-200' : ''
                      }`}
                      onClick={() => openSpreadsheet(sheet)}
                    >
                      <div className="flex items-center">
                        <Table className="h-4 w-4 mr-2 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {sheet.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(sheet.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {spreadsheets.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No spreadsheets yet</p>
                      <p className="text-sm">Create your first spreadsheet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spreadsheet Editor */}
          <div className="lg:col-span-3">
            {isEditing && currentSpreadsheet ? (
              <Card className="h-full">
                <CardHeader>
                  <Input
                    value={spreadsheetName}
                    onChange={(e) => setSpreadsheetName(e.target.value)}
                    className="text-lg font-semibold border-none shadow-none p-0"
                    placeholder="Spreadsheet name"
                  />
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  <div className="overflow-auto">
                    <table className="border-collapse border border-gray-300 min-w-full">
                      <thead>
                        <tr>
                          <th className="border border-gray-300 bg-gray-100 p-2 w-12"></th>
                          {Array.from({ length: cols }, (_, i) => (
                            <th key={i} className="border border-gray-300 bg-gray-100 p-2 min-w-24">
                              {getColumnLabel(i)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: rows }, (_, rowIndex) => (
                          <tr key={rowIndex}>
                            <td className="border border-gray-300 bg-gray-100 p-2 text-center font-medium">
                              {rowIndex + 1}
                            </td>
                            {Array.from({ length: cols }, (_, colIndex) => (
                              <td key={colIndex} className="border border-gray-300 p-0">
                                <input
                                  type="text"
                                  value={currentSpreadsheet.data[rowIndex]?.[colIndex] || ''}
                                  onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                  className="w-full h-8 px-2 border-0 focus:outline-none focus:bg-blue-50"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96">
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Table className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No spreadsheet selected</h3>
                    <p>Choose a spreadsheet from the list or create a new one</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
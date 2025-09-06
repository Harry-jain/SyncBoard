import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  SaveIcon,
  ShareIcon,
  DownloadIcon,
  UploadIcon,
  CalculatorIcon,
  BarChart3Icon,
  PieChartIcon,
  LineChartIcon,
  FilterIcon,
  SortAscIcon,
  SortDescIcon,
  UndoIcon,
  RedoIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Cell {
  value: string | number;
  formula?: string;
  style?: {
    backgroundColor?: string;
    color?: string;
    fontWeight?: string;
    textAlign?: string;
    fontSize?: number;
  };
}

interface Sheet {
  id: number;
  name: string;
  data: Cell[][];
  formulas: Record<string, string>;
  selectedRange?: { startRow: number; endRow: number; startCol: number; endCol: number };
}

interface ExcelAppProps {
  documentId: number;
  onSave: (content: any) => void;
  onClose: () => void;
}

export const ExcelApp: React.FC<ExcelAppProps> = ({
  documentId,
  onSave,
  onClose
}) => {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellValue, setCellValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const [formulaInput, setFormulaInput] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);

  const ROWS = 50;
  const COLS = 26; // A-Z

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await fetch(`/api/drive/documents/${documentId}`);
      const data = await response.json();
      
      if (data.success && data.document) {
        const content = data.document.content || { sheets: [] };
        setSheets(content.sheets || []);
        if (content.sheets.length === 0) {
          addSheet();
        }
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const saveDocument = async () => {
    try {
      setIsSaving(true);
      const content = { sheets };
      await onSave(content);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addSheet = () => {
    const newSheet: Sheet = {
      id: Date.now(),
      name: `Sheet${sheets.length + 1}`,
      data: Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => ({ value: '' }))),
      formulas: {}
    };
    setSheets([...sheets, newSheet]);
    setCurrentSheet(sheets.length);
  };

  const deleteSheet = (sheetId: number) => {
    if (sheets.length <= 1) return;
    
    const updatedSheets = sheets.filter(sheet => sheet.id !== sheetId);
    setSheets(updatedSheets);
    
    if (currentSheet >= updatedSheets.length) {
      setCurrentSheet(updatedSheets.length - 1);
    }
  };

  const renameSheet = (sheetId: number, newName: string) => {
    const updatedSheets = sheets.map(sheet =>
      sheet.id === sheetId ? { ...sheet, name: newName } : sheet
    );
    setSheets(updatedSheets);
  };

  const getCurrentSheet = () => sheets[currentSheet] || { data: [], formulas: {} };

  const getCellValue = (row: number, col: number): string => {
    const sheet = getCurrentSheet();
    const cell = sheet.data[row]?.[col];
    if (!cell) return '';
    
    if (cell.formula) {
      return evaluateFormula(cell.formula, sheet);
    }
    
    return String(cell.value || '');
  };

  const evaluateFormula = (formula: string, sheet: Sheet): string => {
    try {
      // Simple formula evaluation (in production, use a proper formula parser)
      if (formula.startsWith('=')) {
        const expression = formula.substring(1);
        
        // Handle SUM formula
        if (expression.startsWith('SUM(')) {
          const range = expression.match(/SUM\(([A-Z]+\d+:[A-Z]+\d+)\)/);
          if (range) {
            return evaluateSumRange(range[1], sheet);
          }
        }
        
        // Handle basic arithmetic
        const result = eval(expression.replace(/[A-Z]+\d+/g, (ref) => {
          const cellValue = getCellValueFromRef(ref, sheet);
          return cellValue || '0';
        }));
        
        return isNaN(result) ? '#ERROR!' : String(result);
      }
      
      return formula;
    } catch (error) {
      return '#ERROR!';
    }
  };

  const evaluateSumRange = (range: string, sheet: Sheet): string => {
    const [start, end] = range.split(':');
    const startRef = parseCellRef(start);
    const endRef = parseCellRef(end);
    
    let sum = 0;
    for (let row = startRef.row; row <= endRef.row; row++) {
      for (let col = startRef.col; col <= endRef.col; col++) {
        const cell = sheet.data[row]?.[col];
        if (cell && !isNaN(Number(cell.value))) {
          sum += Number(cell.value);
        }
      }
    }
    
    return String(sum);
  };

  const parseCellRef = (ref: string) => {
    const match = ref.match(/([A-Z]+)(\d+)/);
    if (!match) return { row: 0, col: 0 };
    
    const colStr = match[1];
    const row = parseInt(match[2]) - 1;
    
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1;
    
    return { row, col };
  };

  const getCellValueFromRef = (ref: string, sheet: Sheet): string => {
    const { row, col } = parseCellRef(ref);
    const cell = sheet.data[row]?.[col];
    return cell ? String(cell.value || '') : '';
  };

  const updateCell = (row: number, col: number, value: string, formula?: string) => {
    const updatedSheets = sheets.map((sheet, index) => {
      if (index === currentSheet) {
        const newData = [...sheet.data];
        if (!newData[row]) {
          newData[row] = Array(COLS).fill(null).map(() => ({ value: '' }));
        }
        
        newData[row][col] = {
          value: formula ? '' : value,
          formula: formula || undefined,
          style: newData[row][col]?.style || {}
        };
        
        const newFormulas = { ...sheet.formulas };
        if (formula) {
          newFormulas[`${row},${col}`] = formula;
        } else {
          delete newFormulas[`${row},${col}`];
        }
        
        return { ...sheet, data: newData, formulas: newFormulas };
      }
      return sheet;
    });
    
    setSheets(updatedSheets);
  };

  const handleCellClick = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setEditingCell(null);
    setCellValue(getCellValue(row, col));
    
    const sheet = getCurrentSheet();
    const cell = sheet.data[row]?.[col];
    setFormulaInput(cell?.formula || '');
  };

  const handleCellDoubleClick = (row: number, col: number) => {
    setEditingCell({ row, col });
    setCellValue(getCellValue(row, col));
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      updateCell(row, col, cellValue);
      setEditingCell(null);
      
      // Move to next row
      if (row < ROWS - 1) {
        setSelectedCell({ row: row + 1, col });
        setCellValue(getCellValue(row + 1, col));
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setCellValue(getCellValue(row, col));
    }
  };

  const handleFormulaSubmit = () => {
    if (selectedCell) {
      updateCell(selectedCell.row, selectedCell.col, '', formulaInput);
      setFormulaInput('');
    }
  };

  const getColumnLabel = (col: number): string => {
    let result = '';
    let num = col;
    while (num >= 0) {
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26) - 1;
    }
    return result;
  };

  const currentSheetData = getCurrentSheet();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">SyncBoard Excel</h1>
          <Badge variant="outline">
            {sheets.length} sheet{sheets.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={saveDocument}
            disabled={isSaving}
          >
            <SaveIcon className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button variant="outline" size="sm">
            <ShareIcon className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button variant="outline" size="sm">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <Tabs defaultValue="sheets" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sheets">Sheets</TabsTrigger>
              <TabsTrigger value="functions">Functions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sheets" className="flex-1 p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Sheets</h3>
                  <Button size="sm" onClick={addSheet}>
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {sheets.map((sheet, index) => (
                    <Card
                      key={sheet.id}
                      className={`cursor-pointer transition-colors ${
                        index === currentSheet ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => setCurrentSheet(index)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <Input
                            value={sheet.name}
                            onChange={(e) => renameSheet(sheet.id, e.target.value)}
                            className="font-medium border-none shadow-none focus:ring-0 p-0 h-auto"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {sheets.length > 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSheet(sheet.id);
                              }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="functions" className="flex-1 p-4">
              <div className="space-y-4">
                <h3 className="font-medium">Functions</h3>
                
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setFormulaInput('=SUM(')}
                  >
                    <CalculatorIcon className="h-4 w-4 mr-2" />
                    SUM
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setFormulaInput('=AVERAGE(')}
                  >
                    <BarChart3Icon className="h-4 w-4 mr-2" />
                    AVERAGE
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setFormulaInput('=COUNT(')}
                  >
                    <PieChartIcon className="h-4 w-4 mr-2" />
                    COUNT
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setFormulaInput('=MAX(')}
                  >
                    <LineChartIcon className="h-4 w-4 mr-2" />
                    MAX
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <UndoIcon className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm">
                <RedoIcon className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <Button variant="outline" size="sm">
                <FilterIcon className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="sm">
                <SortAscIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                {selectedCell ? `${getColumnLabel(selectedCell.col)}${selectedCell.row + 1}` : 'A1'}
              </span>
            </div>
          </div>

          {/* Formula Bar */}
          {showFormulaBar && (
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-600">fx</span>
              <Input
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                placeholder="Enter formula..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFormulaSubmit();
                  }
                }}
              />
              <Button size="sm" onClick={handleFormulaSubmit}>
                Enter
              </Button>
            </div>
          )}

          {/* Spreadsheet */}
          <div className="flex-1 overflow-auto">
            <div className="p-4">
              <table ref={tableRef} className="border-collapse">
                <thead>
                  <tr>
                    <th className="w-12 h-8 bg-gray-100 border border-gray-300"></th>
                    {Array.from({ length: COLS }, (_, i) => (
                      <th
                        key={i}
                        className="w-20 h-8 bg-gray-100 border border-gray-300 text-center font-medium"
                      >
                        {getColumnLabel(i)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: ROWS }, (_, row) => (
                    <tr key={row}>
                      <td className="w-12 h-8 bg-gray-100 border border-gray-300 text-center font-medium">
                        {row + 1}
                      </td>
                      {Array.from({ length: COLS }, (_, col) => (
                        <td
                          key={col}
                          className={`w-20 h-8 border border-gray-300 cursor-pointer ${
                            selectedCell?.row === row && selectedCell?.col === col
                              ? 'bg-blue-100 ring-2 ring-blue-500'
                              : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => handleCellClick(row, col)}
                          onDoubleClick={() => handleCellDoubleClick(row, col)}
                        >
                          {editingCell?.row === row && editingCell?.col === col ? (
                            <input
                              type="text"
                              value={cellValue}
                              onChange={(e) => setCellValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, row, col)}
                              className="w-full h-full border-none outline-none px-1"
                              autoFocus
                            />
                          ) : (
                            <span className="block w-full h-full px-1 py-1 text-sm">
                              {getCellValue(row, col)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
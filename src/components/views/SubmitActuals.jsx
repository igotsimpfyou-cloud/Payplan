import React, { useState, useRef } from 'react';
import { DollarSign, Clock, Trash2, Camera, X, Receipt, Tag, AlertCircle, Edit2 } from 'lucide-react';
import { parseAmt } from '../../utils/formatters';
import { parseLocalDate, toYMD } from '../../utils/dateHelpers';
import Tesseract from 'tesseract.js';

const CATEGORIES = [
  { value: 'utilities', label: 'Utilities', color: 'bg-emerald-500' },
  { value: 'subscription', label: 'Subscription', color: 'bg-indigo-500' },
  { value: 'insurance', label: 'Insurance', color: 'bg-amber-500' },
  { value: 'loan', label: 'Loan', color: 'bg-red-500' },
  { value: 'rent', label: 'Rent', color: 'bg-purple-500' },
  { value: 'groceries', label: 'Groceries', color: 'bg-green-500' },
  { value: 'dining', label: 'Dining', color: 'bg-orange-500' },
  { value: 'transport', label: 'Transport', color: 'bg-blue-500' },
  { value: 'shopping', label: 'Shopping', color: 'bg-pink-500' },
  { value: 'other', label: 'Other', color: 'bg-slate-500' },
];

export const SubmitActuals = ({
  currentMonthInstances,
  onSubmitActual,
  nextPayDates,
  actualPayEntries,
  onAddActualPay,
  onDeleteActualPay,
  scannedReceipts,
  onAddReceipt,
  onDeleteReceipt,
  receiptOnly = false,
}) => {
  const thisMonthVars = currentMonthInstances.filter((i) => i.isVariable);
  const [values, setValues] = useState(() => {
    const obj = {};
    thisMonthVars.forEach((i) => {
      obj[i.id] = i.actualPaid != null ? i.actualPaid : '';
    });
    return obj;
  });

  // Pay entry form state
  const [payDate, setPayDate] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [overtimeHours, setOvertimeHours] = useState('');

  // Receipt scanner state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt', 'granted', 'denied'
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingReceiptId, setEditingReceiptId] = useState(null);
  const [receiptData, setReceiptData] = useState({
    merchant: '',
    amount: '',
    date: toYMD(new Date()), // Use local date, not UTC
    category: 'other',
    notes: '',
  });
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const handleAddPay = () => {
    if (!payDate || !payAmount) return;
    onAddActualPay(payDate, payAmount, overtimeHours);
    setPayDate('');
    setPayAmount('');
    setOvertimeHours('');
  };

  // Sort entries by date descending
  const sortedPayEntries = [...(actualPayEntries || [])].sort(
    (a, b) => new Date(b.payDate) - new Date(a.payDate)
  );

  const sortedReceipts = [...(scannedReceipts || [])].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // OCR API configuration - optional Tabscanner for better accuracy
  const OCR_API_KEY = localStorage.getItem('ppp.ocrApiKey') || '';

  // Check and request camera permission
  const checkCameraPermission = async () => {
    try {
      // Check if permissions API is available
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'camera' });
        setPermissionStatus(result.state);

        // Listen for permission changes
        result.onchange = () => {
          setPermissionStatus(result.state);
        };

        if (result.state === 'denied') {
          setShowPermissionModal(true);
          return false;
        }
      }
      return true;
    } catch (error) {
      // Permissions API not supported, proceed anyway
      console.log('Permissions API not supported, proceeding with capture');
      return true;
    }
  };

  // Request camera access explicitly
  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Permission granted, stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      setPermissionStatus('granted');
      setShowPermissionModal(false);
      return true;
    } catch (error) {
      console.error('Camera access denied:', error);
      setPermissionStatus('denied');
      return false;
    }
  };

  // Handle camera button click with permission check
  const handleCameraClick = async () => {
    const hasPermission = await checkCameraPermission();
    if (hasPermission) {
      fileInputRef.current?.click();
    }
  };

  // Handle gallery button click (no permission needed for file picker)
  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  // Parse receipt text to extract data
  const parseReceiptText = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // Find amounts (look for dollar amounts like $12.34 or 12.34)
    const amountPattern = /\$?\d{1,4}[.,]\d{2}/g;
    const amounts = text.match(amountPattern) || [];
    const parsedAmounts = amounts
      .map(a => parseFloat(a.replace('$', '').replace(',', '.')))
      .filter(a => a > 0 && a < 10000)
      .sort((a, b) => b - a);

    // The total is usually the largest amount or has keywords
    let total = '';
    const totalLine = lines.find(l => /total|amount|due|balance/i.test(l));
    if (totalLine) {
      const match = totalLine.match(amountPattern);
      if (match) total = match[match.length - 1].replace('$', '');
    }
    if (!total && parsedAmounts.length > 0) {
      total = parsedAmounts[0].toFixed(2);
    }

    // Find merchant (usually first few lines, look for store names)
    let merchant = '';
    const storePatterns = /walmart|target|costco|kroger|publix|safeway|aldi|cvs|walgreens|mcdonald|wendy|burger|starbucks|amazon|home depot|lowes|shell|exxon|chevron|bp|gas|station/i;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (storePatterns.test(lines[i])) {
        merchant = lines[i];
        break;
      }
    }
    // If no known store, use first non-numeric line
    if (!merchant && lines.length > 0) {
      merchant = lines.find(l => !/^\d/.test(l) && l.length > 2 && l.length < 40) || '';
    }

    // Find date - use local date format
    let date = toYMD(new Date());
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;
    const dateMatch = text.match(datePattern);
    if (dateMatch) {
      try {
        const [_, m, d, y] = dateMatch;
        const year = y.length === 2 ? '20' + y : y;
        // Create local date, not UTC
        const parsed = new Date(parseInt(year), parseInt(m) - 1, parseInt(d));
        if (!isNaN(parsed.getTime())) {
          date = toYMD(parsed);
        }
      } catch {}
    }

    return { merchant: merchant.substring(0, 50), amount: total, date };
  };

  // Built-in OCR using Tesseract.js (no API key needed)
  const processWithTesseract = async (file) => {
    try {
      setOcrProgress(0);

      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      const parsed = parseReceiptText(text);

      return {
        merchant: parsed.merchant,
        amount: parsed.amount,
        date: parsed.date,
        category: guessCategory(parsed.merchant),
      };
    } catch (error) {
      console.error('Tesseract OCR Error:', error);
      return {
        merchant: '',
        amount: '',
        date: toYMD(new Date()),
        category: 'other',
        error: 'OCR failed - enter manually',
      };
    }
  };

  // Tabscanner API (optional, better accuracy)
  const processWithTabscanner = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('https://api.tabscanner.com/api/2/process', {
        method: 'POST',
        headers: { 'apikey': OCR_API_KEY },
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const { token } = await uploadResponse.json();
      let attempts = 0;

      while (attempts < 10) {
        await new Promise(r => setTimeout(r, 1500));
        setOcrProgress(Math.min(90, 10 + attempts * 10));

        const resultResponse = await fetch(`https://api.tabscanner.com/api/result/${token}`, {
          headers: { 'apikey': OCR_API_KEY },
        });

        if (!resultResponse.ok) throw new Error('Result fetch failed');

        const result = await resultResponse.json();

        if (result.status === 'done') {
          const data = result.result;
          return {
            merchant: data.establishment || data.merchantName || '',
            amount: data.total?.toString() || data.subTotal?.toString() || '',
            date: data.date ? formatOCRDate(data.date) : toYMD(new Date()),
            category: guessCategory(data.establishment || ''),
          };
        } else if (result.status === 'failed') {
          throw new Error('Processing failed');
        }
        attempts++;
      }
      throw new Error('Timeout');
    } catch (error) {
      // Fallback to Tesseract if Tabscanner fails
      console.warn('Tabscanner failed, falling back to Tesseract:', error);
      return processWithTesseract(file);
    }
  };

  // Format date from OCR (handles various formats)
  const formatOCRDate = (dateStr) => {
    try {
      // Use parseLocalDate to avoid timezone issues
      const date = parseLocalDate(dateStr);
      if (!date || isNaN(date.getTime())) return toYMD(new Date());
      return toYMD(date);
    } catch {
      return toYMD(new Date());
    }
  };

  // Guess category from merchant name
  const guessCategory = (merchant) => {
    const lower = (merchant || '').toLowerCase();
    if (/walmart|target|costco|kroger|publix|safeway|aldi|grocery/i.test(lower)) return 'groceries';
    if (/mcdonald|wendy|burger|pizza|restaurant|cafe|starbucks|dunkin|food/i.test(lower)) return 'dining';
    if (/shell|exxon|chevron|gas|fuel|bp|mobil|station/i.test(lower)) return 'transport';
    if (/amazon|ebay|best buy|home depot|lowes/i.test(lower)) return 'shopping';
    if (/netflix|spotify|hulu|disney|subscription/i.test(lower)) return 'subscription';
    if (/electric|water|utility|power|energy/i.test(lower)) return 'utilities';
    return 'other';
  };

  // Handle file selection
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const imageUrl = URL.createObjectURL(file);
    setReceiptImage(imageUrl);
    setShowReceiptModal(true);
    setIsProcessing(true);
    setOcrProgress(0);

    // Process with OCR - use Tabscanner if configured, otherwise Tesseract
    const result = OCR_API_KEY
      ? await processWithTabscanner(file)
      : await processWithTesseract(file);

    setReceiptData({
      merchant: result.merchant,
      amount: result.amount,
      date: result.date || toYMD(new Date()),
      category: result.category || 'other',
      notes: result.error || '',
    });
    setIsProcessing(false);
    setOcrProgress(100);
  };

  const handleSaveReceipt = () => {
    if (!receiptData.amount) return;

    if (editingReceiptId) {
      // Update existing receipt - delete old and add new with same data
      onDeleteReceipt(editingReceiptId);
    }

    onAddReceipt(receiptData);
    setShowReceiptModal(false);
    setReceiptImage(null);
    setEditingReceiptId(null);
    setReceiptData({
      merchant: '',
      amount: '',
      date: toYMD(new Date()),
      category: 'other',
      notes: '',
    });
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditReceipt = (receipt) => {
    setReceiptData({
      merchant: receipt.merchant,
      amount: receipt.amount.toString(),
      date: receipt.date,
      category: receipt.category,
      notes: receipt.notes || '',
    });
    setEditingReceiptId(receipt.id);
    setReceiptImage(null);
    setShowReceiptModal(true);
    setIsProcessing(false);
  };

  const handleCloseModal = () => {
    setShowReceiptModal(false);
    setReceiptImage(null);
    setEditingReceiptId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryInfo = (value) =>
    CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

  return (
    <div className="space-y-6">
      {/* Receipt Scanner Section */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Camera size={28} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Scan Receipt</h3>
              <p className="text-blue-100 text-sm">Take a photo to log expenses</p>
            </div>
          </div>
          {OCR_API_KEY ? (
            <span className="px-3 py-1 bg-green-400/30 text-green-100 rounded-full text-xs font-semibold">
              OCR Active
            </span>
          ) : (
            <span className="px-3 py-1 bg-blue-400/30 text-blue-100 rounded-full text-xs font-semibold">
              Built-in OCR
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Camera button */}
          <button
            onClick={handleCameraClick}
            className="flex-1 bg-white/20 hover:bg-white/30 transition-colors rounded-xl p-4 text-center border-2 border-dashed border-white/40"
          >
            <Camera className="mx-auto mb-2" size={32} />
            <span className="font-semibold block">Take Photo</span>
            <p className="text-xs text-blue-100 mt-1">Opens camera on mobile</p>
          </button>

          {/* Gallery button */}
          <button
            onClick={handleGalleryClick}
            className="flex-1 bg-white/20 hover:bg-white/30 transition-colors rounded-xl p-4 text-center border-2 border-dashed border-white/40"
          >
            <Receipt className="mx-auto mb-2" size={32} />
            <span className="font-semibold block">Upload Image</span>
            <p className="text-xs text-blue-100 mt-1">Select from gallery</p>
          </button>
        </div>

        {/* Recent Scanned Receipts */}
        {sortedReceipts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <h4 className="text-sm font-semibold mb-2">Recent Receipts (tap to edit)</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sortedReceipts.slice(0, 5).map((receipt) => {
                const cat = getCategoryInfo(receipt.category);
                return (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between p-3 bg-white/10 rounded-xl"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.color}`} />
                      <div className="truncate">
                        <span className="font-semibold">{receipt.merchant || 'Unknown'}</span>
                        <span className="text-blue-100 text-sm ml-2">
                          {new Date(receipt.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="font-bold mr-2">${parseAmt(receipt.amount).toFixed(2)}</span>
                      <button
                        onClick={() => handleEditReceipt(receipt)}
                        className="p-1.5 hover:bg-white/20 rounded"
                        title="Edit receipt"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteReceipt(receipt.id)}
                        className="p-1.5 hover:bg-red-400/30 rounded"
                        title="Delete receipt"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {!receiptOnly && (
      <>
      {/* Actual Pay Entry Section */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="text-emerald-600" size={24} />
          Log Actual Pay
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-sm font-semibold text-slate-600">Pay Date</label>
            <input
              type="date"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">Actual Amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="$0.00"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600">OT Hours (optional)</label>
            <input
              type="number"
              step="0.5"
              placeholder="0"
              className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddPay}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
            >
              Log Pay
            </button>
          </div>
        </div>

        {/* Pay History */}
        {sortedPayEntries.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold text-slate-600 mb-2">Pay History</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {sortedPayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  <div>
                    <span className="font-semibold">
                      {parseLocalDate(entry.payDate).toLocaleDateString()}
                    </span>
                    <span className="mx-2 text-emerald-600 font-bold">
                      ${parseAmt(entry.amount).toFixed(2)}
                    </span>
                    {entry.overtimeHours > 0 && (
                      <span className="text-sm text-slate-500 flex items-center gap-1 inline-flex">
                        <Clock size={14} />
                        {entry.overtimeHours} OT hrs
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteActualPay(entry.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Variable Bills Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">
            Submit Actuals (Variable Bills)
          </h2>
          <div className="text-emerald-100 text-sm">
            Updates estimates based on history.
          </div>
        </div>
        {thisMonthVars.length ? (
          <div className="grid grid-cols-1 gap-3">
            {thisMonthVars.map((i) => (
              <div
                key={i.id}
                className="bg-white rounded-xl p-4 shadow flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="font-semibold">{i.name}</div>
                  <div className="text-sm text-slate-600">
                    Due {parseLocalDate(i.dueDate).toLocaleDateString()} • Est. $
                    {parseAmt(i.amountEstimate).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Actual Paid"
                    className="px-3 py-2 border-2 rounded-xl w-32"
                    value={values[i.id] ?? ''}
                    onChange={(e) =>
                      setValues({ ...values, [i.id]: e.target.value })
                    }
                  />
                  <button
                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={() => onSubmitActual(i.id, values[i.id])}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 text-center text-slate-600">
            No variable bills this month.
          </div>
        )}
      </div>
      </>
      )}

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertCircle className="text-amber-600" size={24} />
              </div>
              <h3 className="text-lg font-bold">Camera Access Required</h3>
            </div>
            <p className="text-slate-600 mb-4">
              To take photos of receipts, please allow camera access when prompted.
            </p>
            {permissionStatus === 'denied' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-red-700 text-sm">
                  Camera access was denied. Please enable it in your browser/device settings, then try again.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const granted = await requestCameraAccess();
                  if (granted) {
                    fileInputRef.current?.click();
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
              >
                Allow Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingReceiptId ? 'Edit Receipt' : 'Review Receipt Details'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              {/* Image Preview */}
              {receiptImage && (
                <div className="mb-4 rounded-xl overflow-hidden bg-slate-100">
                  <img
                    src={receiptImage}
                    alt="Receipt"
                    className="w-full max-h-48 object-contain"
                  />
                </div>
              )}

              {isProcessing ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Processing receipt...</p>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-3 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${ocrProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-400">
                    {OCR_API_KEY ? 'Using Tabscanner API' : 'Using built-in OCR'} ({ocrProgress}%)
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600">Merchant</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                      value={receiptData.merchant}
                      onChange={(e) => setReceiptData({ ...receiptData, merchant: e.target.value })}
                      placeholder="Store name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                      value={receiptData.amount}
                      onChange={(e) => setReceiptData({ ...receiptData, amount: e.target.value })}
                      placeholder="$0.00"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600">Date</label>
                    <input
                      type="date"
                      className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                      value={receiptData.date}
                      onChange={(e) => setReceiptData({ ...receiptData, date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                      <Tag size={16} />
                      Category
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setReceiptData({ ...receiptData, category: cat.value })}
                          className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                            receiptData.category === cat.value
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-600">Notes (optional)</label>
                    <input
                      type="text"
                      className="w-full mt-1 px-3 py-2 border-2 rounded-xl"
                      value={receiptData.notes}
                      onChange={(e) => setReceiptData({ ...receiptData, notes: e.target.value })}
                      placeholder="Add a note..."
                    />
                  </div>

                  {!editingReceiptId && (
                    <p className="text-sm text-slate-500 text-center mb-3">
                      Please review and edit the details above before saving
                    </p>
                  )}

                  <button
                    onClick={handleSaveReceipt}
                    disabled={!receiptData.amount}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-colors"
                  >
                    {editingReceiptId ? 'Update Receipt' : 'Save Receipt'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitActuals;

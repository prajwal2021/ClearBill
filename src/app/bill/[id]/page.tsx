'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Progress } from '~/components/ui/progress';
import { MessageCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react';

// -------------------- Types --------------------

interface BillMetadata {
  filename: string;
  uploaded_at: string;
}

interface LineItem {
  description: string;
  date?: string;
  amount: number;
}

interface BillFlag {
  item_index: number;
  type: 'DUPLICATE_CHARGE' | 'VAGUE_DESCRIPTION' | 'TEMPORAL_INCONSISTENCY' | 'ILLOGICAL_COMBINATION';
  explanation: string;
}

interface FairnessBreakdown {
  initial_score: number;
  deductions: {
    DUPLICATE_CHARGE?: { count: number; points_deducted: number };
    VAGUE_DESCRIPTION?: { count: number; points_deducted: number };
    TEMPORAL_INCONSISTENCY?: { count: number; points_deducted: number };
    ILLOGICAL_COMBINATION?: { count: number; points_deducted: number };
  };
  final_score: number;
}

interface FairnessScoreData {
  score: number;
  breakdown: FairnessBreakdown;
}

interface ChatMessage {
  type: 'user' | 'ai';
  text: string;
}

// -------------------- Page --------------------

export default function BillResultsPage() {
  const params = useParams();
  const billId = params.id as string;

  const [billMetadata, setBillMetadata] = useState<BillMetadata | null>(null);
  const [fairnessScore, setFairnessScore] = useState<FairnessScoreData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [flags, setFlags] = useState<BillFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [potentiallySavedAmount, setPotentiallySavedAmount] = useState<number>(0);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);

  // -------------------- Data Fetch --------------------
  useEffect(() => {
    if (!billId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Bill metadata
        const billRes = await fetch(`/api/bill-data?bill_id=${billId}`);
        const billData = await billRes.json();
        if (!billRes.ok) throw new Error(billData.error || 'Failed to fetch bill metadata');
        setBillMetadata(billData);

        // Fairness score
        const scoreRes = await fetch(`/api/fairness-scores?bill_id=${billId}`);
        const scoreData = await scoreRes.json();
        if (!scoreRes.ok) throw new Error(scoreData.error || 'Failed to fetch fairness score');
        setFairnessScore(scoreData);

        // Parsed line items
        const lineItemsRes = await fetch(`/api/parsed-bills?bill_id=${billId}`);
        const lineItemsData = await lineItemsRes.json();
        if (!lineItemsRes.ok) throw new Error(lineItemsData.error || 'Failed to fetch parsed line items');
        setLineItems(lineItemsData);

        // Analysis flags
        const flagsRes = await fetch(`/api/analysis-flags?bill_id=${billId}`);
        const flagsData = await flagsRes.json();
        if (!flagsRes.ok) throw new Error(flagsData.error || 'Failed to fetch analysis flags');
        setFlags(flagsData.flags || []);

        // Calculate potentially saved amount
        let totalSaved = 0;
        (flagsData.flags || []).forEach((flag: BillFlag) => {
          if (flag.type === 'DUPLICATE_CHARGE' || flag.type === 'VAGUE_DESCRIPTION' || flag.type === 'TEMPORAL_INCONSISTENCY' || flag.type === 'ILLOGICAL_COMBINATION') {
            const item = (lineItemsData as LineItem[])[flag.item_index];
            if (item && item.amount) {
              totalSaved += item.amount;
            }
          }
        });
        setPotentiallySavedAmount(totalSaved);
      } catch (err: any) {
        console.error('Error fetching bill results:', err);
        setError(err.message || 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [billId]);

  // -------------------- Helpers --------------------
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFlagColor = (flagType?: BillFlag['type']) => {
    switch (flagType) {
      case 'DUPLICATE_CHARGE':
        return 'bg-red-500 hover:bg-red-600';
      case 'VAGUE_DESCRIPTION':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'TEMPORAL_INCONSISTENCY':
      case 'ILLOGICAL_COMBINATION':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return 'bg-green-500 hover:bg-green-600';
    }
  };

  // -------------------- Chat --------------------
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !billId) return;

    setChatLoading(true);
    setChatMessages(prev => [...prev, { type: 'user', text: chatInput }]);
    setChatInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: billId, user_question: chatInput }),
      });
      const data = await res.json();

      if (res.ok) {
        setChatMessages(prev => [...prev, { type: 'ai', text: data.answer || data.explanation }]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { type: 'ai', text: `Error: ${data.error || 'Failed to get explanation.'}` }
        ]);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { type: 'ai', text: `Error: ${err.message || "Network error."}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // -------------------- Download Letter --------------------
  const handleDownloadDisputeLetter = async () => {
    try {
      const res = await fetch('/api/dispute-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id: billId }),
      });

      const data = await res.json();

      if (res.ok && data.letter) {
        const blob = new Blob([data.letter], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dispute_letter_${billId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        alert(`Failed to download dispute letter: ${data.error || 'Unknown error.'}`);
      }
    } catch (err: any) {
      alert(`Error downloading dispute letter: ${err.message || 'Network error.'}`);
    }
  };

  // -------------------- UI States --------------------
  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading bill results...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>;
  }

  if (!fairnessScore || !billMetadata) {
    return <div className="flex justify-center items-center min-h-screen">No data found for this bill ID.</div>;
  }

  // -------------------- Render --------------------
  return (
    <React.Fragment>
      <div className="flex min-h-screen">
        {/* Main content area */}
        <div className={`flex-1 overflow-auto p-4 transition-all duration-300 ${isChatPanelOpen ? 'max-w-[calc(100%-320px)]' : 'max-w-full'}`}>
          <div className="container mx-auto">
            <h1 className="text-3xl font-bold mb-6">Bill Analysis Results for: {billMetadata.filename}</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Fairness Score */}
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Fairness Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                    <svg className={`w-full h-full transform -rotate-90 ${getScoreColor(fairnessScore.score)}`} viewBox="0 0 100 100">
                      <circle
                        className="text-gray-200"
                        strokeWidth="10"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                      <circle
                        className={`${getScoreColor(fairnessScore.score)} transition-all duration-500 ease-in-out`}
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 40}
                        strokeDashoffset={2 * Math.PI * 40 - (fairnessScore.score / 100) * (2 * Math.PI * 40)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="40"
                        cx="50"
                        cy="50"
                      />
                    </svg>
                    <span className="absolute text-5xl font-extrabold">
                      {fairnessScore.score}
                    </span>
                  </div>
                  <p className="text-center text-lg font-semibold mb-1">
                    {fairnessScore.score >= 80 ? 'Low Concern' : fairnessScore.score >= 50 ? 'Review Recommended' : 'Needs Attention'}
                  </p>
                  <p className="text-sm text-gray-500 text-center">
                    A higher score indicates fewer potential issues.
                  </p>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Bill Line Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    <Table>
                      <TableCaption>A list of your medical bill line items with analysis flags.</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-center">Flag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((item, index) => {
                          const itemFlags = flags.filter(flag => flag.item_index === index);
                          const hasDuplicate = itemFlags.some(flag => flag.type === 'DUPLICATE_CHARGE');
                          const hasVague = itemFlags.some(flag => flag.type === 'VAGUE_DESCRIPTION');
                          const hasOtherFlag = itemFlags.some(
                            flag => flag.type === 'TEMPORAL_INCONSISTENCY' || flag.type === 'ILLOGICAL_COMBINATION'
                          );

                          let rowClass = 'bg-white dark:bg-gray-900';
                          if (hasDuplicate) rowClass = 'bg-red-100 dark:bg-red-900';
                          else if (hasVague) rowClass = 'bg-yellow-100 dark:bg-yellow-900';
                          else if (hasOtherFlag) rowClass = 'bg-orange-100 dark:bg-orange-900';

                          return (
                            <TableRow key={index} className={rowClass}>
                              <TableCell>{item.date || 'N/A'}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">${item.amount.toFixed(2)}</TableCell>
                              <TableCell className="text-center">
                                {itemFlags.length > 0 ? (
                                  itemFlags.map((flag, flagIdx) => (
                                    <Badge key={flagIdx} className={`${getFlagColor(flag.type)} mx-1 my-0.5`}>
                                      {flag.type.replace(/_/g, ' ')}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge className={`${getFlagColor()} mx-1 my-0.5`}>No Issues</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="mt-4 flex justify-between items-center">
                    {potentiallySavedAmount > 0 && (
                      <p className="text-md font-semibold text-green-600">
                        You could potentially save ${potentiallySavedAmount.toFixed(2)} by disputing flagged items.
                      </p>
                    )}
                    <Button onClick={handleDownloadDisputeLetter}>
                      Generate Dispute Letter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {flags.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Key Issues Detected</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1">
                    {flags.map((flag, index) => (
                      <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                        {flag.type === 'DUPLICATE_CHARGE' && '🔴'}
                        {flag.type === 'VAGUE_DESCRIPTION' && '🟡'}
                        {(flag.type === 'TEMPORAL_INCONSISTENCY' || flag.type === 'ILLOGICAL_COMBINATION') && '🟠'}
                        <span className="font-medium ml-1">{flag.type.replace(/_/g, ' ')}:</span> {flag.explanation}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Chat Button and Text (visible when chat panel is closed) */}
        {!isChatPanelOpen && (
          <div className="fixed bottom-4 right-4 flex flex-col items-center z-50">
            <button
              className="p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              onClick={() => setIsChatPanelOpen(true)}
            >
              <MessageCircle size={24} />
            </button>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Have any Questions about your bill ? Ask ClearBill AI
            </p>
          </div>
        )}

        {/* Chat Sidebar */}
        <div
          className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-40
            ${isChatPanelOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-gray-200 dark:border-gray-700`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">Ask ClearBill About These Issues</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsChatPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 flex flex-col h-[calc(100%-64px)]">
            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium">Suggest some prompts:</p>
              <ul className="list-disc pl-5">
                <li>"Why is this a duplicate?"</li>
                <li>"What does 'Hospital Services' mean?"</li>
                <li>"Which charges should I dispute?"</li>
              </ul>
            </div>
            <ScrollArea className="flex-1 w-full rounded-md border p-4 mb-4">
              {chatMessages.length === 0 ? (
                <p className="text-gray-500">Ask a question about your score or flagged items.</p>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={index} className={`mb-2 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                    <Badge className={`${msg.type === 'user' ? 'bg-blue-500' : 'bg-gray-700'} text-white`}>
                      {msg.type === 'user' ? 'You' : 'ClearBill AI'}
                    </Badge>
                    {msg.type === 'ai' ? (
                      <div className="mt-1 p-3 rounded-lg bg-muted text-left whitespace-pre-wrap">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm">{msg.text}</p>
                    )}
                  </div>
                ))
              )}
            </ScrollArea>
            <div className="flex space-x-2 mt-auto mb-5">
              <Input
                placeholder="e.g., Why is my score low?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleChatSubmit();
                }}
                disabled={chatLoading}
              />
              <Button onClick={handleChatSubmit} disabled={chatLoading}>
                {chatLoading ? 'Sending...' : 'Ask'}
              </Button>
            </div>
          </div>
        </div>
      </div> {/* Closing div for flex min-h-screen */}
      
    </React.Fragment>
  );
}

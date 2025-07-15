"use client"; // This is a Client Component

import { useState } from "react";
import { Input } from "@/components/ui/input"; // Shadcn Input
import { Button } from "@/components/ui/button"; // Shadcn Button
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Shadcn Card
import { Textarea } from "@/components/ui/textarea"; // Shadcn Textarea
import { ReloadIcon } from "@radix-ui/react-icons"; // For loading spinner

export default function Home() {
  const [blogUrl, setBlogUrl] = useState<string>("");
  const [englishSummary, setEnglishSummary] = useState<string>("");
  const [urduSummary, setUrduSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = async () => {
    setLoading(true);
    setError(null);
    setEnglishSummary("");
    setUrduSummary("");

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: blogUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to summarize blog.");
      }

      const data = await response.json();
      setEnglishSummary(data.englishSummary);
      setUrduSummary(data.urduSummary);
    } catch (err: unknown) { // THIS IS THE FIX: 'any' changed to 'unknown'
      let errorMessage = "An unexpected error occurred.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      setError(errorMessage);
      console.error("Frontend error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-gray-100 font-inter">
      <Card className="w-full max-w-2xl p-6 space-y-8 shadow-2xl rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:scale-[1.01]">
        <CardHeader>
          <CardTitle className="text-4xl font-extrabold text-center text-blue-700 dark:text-blue-400 drop-shadow-sm">AI Blog Summarizer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Input
              type="url"
              placeholder="Enter a blog URL (e.g., https://www.freecodecamp.org/news/what-is-a-rest-api/)"
              value={blogUrl}
              onChange={(e) => setBlogUrl(e.target.value)}
              className="flex-grow p-3 h-12 text-lg border border-gray-300 rounded-lg focus:ring-3 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-blue-600"
              disabled={loading}
            />
            <Button
              onClick={handleSummarize}
              disabled={loading || !blogUrl.trim()}
              className="w-full sm:w-auto px-8 py-3 h-12 text-lg font-semibold rounded-lg bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 transform active:scale-95"
            >
              {loading && <ReloadIcon className="mr-2 h-5 w-5 animate-spin" />}
              Summarize Blog
            </Button>
          </div>

          {error && (
            <div className="text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 p-4 rounded-lg text-center font-medium border border-red-300 dark:border-red-700 transition-all duration-300">
              Error: {error}
            </div>
          )}

          {(englishSummary || urduSummary) && (
            <div className="space-y-6 mt-6">
              <Card className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                <CardTitle className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">English Summary</CardTitle>
                <Textarea
                  value={englishSummary}
                  readOnly
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-md resize-y min-h-[120px] focus:ring-2 focus:ring-blue-300 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 transition-all duration-200"
                />
              </Card>

              <Card className="p-5 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                <CardTitle className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-200">اردو خلاصہ (Urdu Summary)</CardTitle>
                <Textarea
                  value={urduSummary}
                  readOnly
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-md resize-y min-h-[120px] text-right focus:ring-2 focus:ring-blue-300 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100 transition-all duration-200"
                  style={{ direction: 'rtl' }} // For right-to-left text
                />
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

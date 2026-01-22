"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Copy, Terminal, Sparkles, Bot } from "lucide-react";

interface SetupPromptProps {
  apiKey: string;
  defaultDomain?: string;
}

export function SetupPrompt({ apiKey, defaultDomain = "mysite.com" }: SetupPromptProps) {
  const [domain, setDomain] = useState(defaultDomain);
  const [copied, setCopied] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // The one-liner command
  const setupCommand = `INDEXYOURNICHE_API_KEY=${apiKey} npx @indexyourniche/cli init -y -d ${domain} && iyn scan && iyn topics --discover && iyn generate -y`;

  // The AI agent prompt
  const agentPrompt = `Add SEO to my project with IndexYourNiche.

Run this command:
${setupCommand}`;

  const copyCommand = () => {
    navigator.clipboard.writeText(setupCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(agentPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle>Quick Setup</CardTitle>
            <CardDescription>Copy & paste to your AI agent</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Domain input */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Your domain
          </label>
          <Input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="font-mono text-sm"
          />
        </div>

        {/* Command preview */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Setup command
          </label>
          <div className="relative group">
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap break-all">
              {setupCommand}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyCommand}
              className="absolute top-2 right-2 h-8 px-2 bg-gray-800 hover:bg-gray-700 text-white"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* AI Agent prompt */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-purple-600" />
            <label className="text-sm font-medium text-gray-700">
              For AI Agents (Claude Code, Cursor, Lovable)
            </label>
          </div>
          <div className="relative group">
            <pre className="bg-purple-950 text-purple-100 p-4 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap">
              {agentPrompt}
            </pre>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyPrompt}
              className="absolute top-2 right-2 h-8 px-2 bg-purple-900 hover:bg-purple-800 text-white"
            >
              {copiedPrompt ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Prompt
                </>
              )}
            </Button>
          </div>
        </div>

        {/* What happens */}
        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">This command will:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Connect your project to IndexYourNiche
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Analyze your website's niche & keywords
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Generate SEO topic ideas
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Create your first GEO-optimized article
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Minimal version for embedding in other pages
 */
export function SetupPromptCompact({ apiKey, domain = "mysite.com" }: { apiKey: string; domain?: string }) {
  const [copied, setCopied] = useState(false);

  const command = `INDEXYOURNICHE_API_KEY=${apiKey} npx @indexyourniche/cli init -y -d ${domain} && iyn scan && iyn topics --discover && iyn generate -y`;

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 relative group">
      <div className="flex items-center gap-2 text-emerald-400 text-xs mb-2">
        <Terminal className="h-3 w-3" />
        <span>Paste this to your AI agent</span>
      </div>
      <pre className="text-gray-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {command}
      </pre>
      <Button
        size="sm"
        variant="ghost"
        onClick={copy}
        className="absolute top-2 right-2 h-7 px-2 bg-gray-800 hover:bg-gray-700 text-white text-xs"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  );
}

"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function UnsupportedBrowser() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-24">
      <Alert className="border-verdict-misleading/40 bg-verdict-misleading/10">
        <AlertTriangle className="h-4 w-4 text-verdict-misleading" />
        <AlertTitle>Browser not supported</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          FactCheck Live uses the Web Speech API for free, browser-native
          transcription. Please open this app in{" "}
          <strong className="text-foreground">Chrome</strong> or{" "}
          <strong className="text-foreground">Edge</strong> on desktop.
        </AlertDescription>
      </Alert>
    </div>
  );
}

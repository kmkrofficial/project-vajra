"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { staffCheckIn } from "@/lib/actions/attendance";

type CheckInState = "idle" | "locating" | "submitting" | "success" | "error";

export function StaffCheckIn() {
  const [state, setState] = useState<CheckInState>("idle");
  const [message, setMessage] = useState("");

  async function handleCheckIn() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setState("locating");
    setMessage("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        setState("submitting");

        const result = await staffCheckIn(latitude, longitude);

        if (result.success) {
          setState("success");
          setMessage("Check-in recorded!");
          toast.success("Check-in successful!");

          // Reset after 5 seconds
          setTimeout(() => {
            setState("idle");
            setMessage("");
          }, 5000);
        } else {
          setState("error");
          setMessage(result.error ?? "Check-in failed.");
          toast.error(result.error ?? "Check-in failed.");

          setTimeout(() => {
            setState("idle");
            setMessage("");
          }, 5000);
        }
      },
      (error) => {
        setState("error");
        let msg = "Failed to get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please enable location access.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location unavailable. Please try again.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out. Please try again.";
        }
        setMessage(msg);
        toast.error(msg);

        setTimeout(() => {
          setState("idle");
          setMessage("");
        }, 5000);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <Card data-testid="staff-checkin-widget">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="size-4" strokeWidth={1.5} />
          Attendance Check-In
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3">
          {state === "success" ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="size-5" />
              <span className="text-sm font-medium">{message}</span>
            </div>
          ) : state === "error" ? (
            <p className="text-center text-sm text-destructive">{message}</p>
          ) : null}

          <Button
            className="h-14 w-full gap-2 text-base font-semibold"
            onClick={handleCheckIn}
            disabled={state === "locating" || state === "submitting"}
            data-testid="staff-checkin-btn"
          >
            {state === "locating" ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Getting location…
              </>
            ) : state === "submitting" ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                Checking in…
              </>
            ) : (
              <>
                <MapPin className="size-5" />
                Check In Now
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            You must be within 200m of your assigned branch to check in.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

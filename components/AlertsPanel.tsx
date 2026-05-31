"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: string;
  message: string;
  urgency: string;
  recommended_price: number;
  created_at: string;
  is_read: boolean;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] =
    useState<Alert[]>([]);

  async function fetchAlerts() {
    try {
      const response = await fetch(
        "/api/alerts"
      );

      const data =
        await response.json();

      setAlerts(data.alerts || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function markAsRead(
    id: string
  ) {
    await fetch("/api/alerts", {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        id,
      }),
    });

    fetchAlerts();
  }

  useEffect(() => {
    const timeout =
      setTimeout(fetchAlerts, 0);

    const interval =
      setInterval(
        fetchAlerts,
        60000
      );

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">
          AI Revenue Alerts
        </h2>

        <span className="text-sm text-gray-400">
          Auto-refreshes every 60s
        </span>
      </div>

      <div className="space-y-4">
        {alerts.length === 0 && (
          <div className="text-gray-400">
            No current alerts
          </div>
        )}

        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`border rounded-xl p-4 ${
              alert.urgency ===
              "high"
                ? "border-red-700 bg-red-950/30"
                : alert.urgency ===
                  "medium"
                ? "border-yellow-700 bg-yellow-950/30"
                : "border-emerald-700 bg-emerald-950/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                  alert.urgency ===
                  "high"
                    ? "bg-red-500 text-white"
                    : alert.urgency ===
                      "medium"
                    ? "bg-yellow-500 text-black"
                    : "bg-emerald-500 text-black"
                }`}
              >
                {alert.urgency}
              </span>

              <span className="text-xs text-gray-400">
                {new Date(
                  alert.created_at
                ).toLocaleString()}
              </span>
            </div>

            <p className="text-white mb-3">
              {alert.message}
            </p>

            <div className="flex items-center justify-between">
              <div className="text-emerald-400 font-semibold">
                Recommended Price:
                ${alert.recommended_price}
              </div>

              {!alert.is_read && (
                <button
                  onClick={() =>
                    markAsRead(
                      alert.id
                    )
                  }
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function HostCalendarPage() {
  const [bookings, setBookings] = useState<Record<string, any>[]>([]);
  const [listings, setListings] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bRes, lRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/listings?status=active"),
        ]);
        if (bRes.ok) {
          const d = await bRes.json();
          setBookings(d.data || []);
        }
        if (lRes.ok) {
          const d = await lRes.json();
          setListings(d.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const bookingsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter((b) => {
      const bDate = new Date(b.eventStart as string).toISOString().split("T")[0];
      return bDate === dateStr;
    });
  };

  const selectedBookings = selectedDay ? bookingsForDay(selectedDay) : [];

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "calendar" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Calendar</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">View your bookings on a calendar</p>
        </div>

        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
        ) : (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <button onClick={prevMonth} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-[var(--color-surface-alt)]">
                <ChevronLeft size={20} />
              </button>
              <h2 className="min-w-0 truncate text-center font-semibold text-[var(--color-ink)]">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-[var(--color-surface-alt)]">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--color-ink-muted)] mb-2">
              {DAYS.map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayBookings = bookingsForDay(day);
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const isSelected = selectedDay === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`relative flex min-h-[44px] items-center justify-center rounded-lg p-1 text-sm transition-colors sm:p-2 ${
                      isSelected ? "bg-[var(--color-primary)] text-white" :
                      isToday ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-bold" :
                      "hover:bg-[var(--color-surface-alt)]"
                    }`}
                  >
                    {day}
                    {dayBookings.length > 0 && (
                      <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-white" : "bg-[var(--color-primary)]"
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedDay && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
            <h3 className="mb-3 truncate font-semibold text-[var(--color-ink)]">
              Bookings for {MONTHS[month]} {selectedDay}
            </h3>
            {selectedBookings.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)]">No bookings on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{b.bookingType === "exclusive" ? "Exclusive" : "Capacity"}</p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {new Date(b.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })} – {new Date(b.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{b.headcount} guest{b.headcount > 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${
                      b.status === "confirmed" ? "bg-[#DCFCE7] text-[#166534]" :
                      b.status === "pending_approval" ? "bg-[#FEF3C7] text-[#B45309]" :
                      "bg-[#F3F4F6] text-[#6B7280]"
                    }`}>
                      {b.status.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

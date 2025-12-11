import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { GYM_CONSTANTS } from "../config/gymConstants";
import Swal from "sweetalert2";

export const AdminAgenda = () => {
  // Desktop State
  const [currentWeekStart, setCurrentWeekStart] = useState(
    getMonday(new Date())
  );

  // Mobile State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Shared State
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Helper to get Monday of the current week
  function getMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- LOGIC: Mobile Calendar Generation ---
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    // Lun=0... Dom=6 adaptation
    let startPadding = startingDay - 1;
    if (startPadding === -1) startPadding = 6;

    const days = [];
    for (let i = 0; i < startPadding; i++) days.push({ day: null });
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, date: new Date(year, month, i) });
    }
    setCalendarDays(days);
  }, [currentMonth]);

  // --- LOGIC: Fetch Data ---
  useEffect(() => {
    if (isMobile) {
      // Fetch Month
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const start = new Date(year, month, 1).toISOString().split("T")[0];
      const end = new Date(year, month + 1, 0).toISOString().split("T")[0];
      fetchReservations(start, end);
    } else {
      // Fetch Week
      const start = weekDays[0].toISOString().split("T")[0];
      const end = weekDays[4].toISOString().split("T")[0];
      fetchReservations(start, end);
    }
  }, [currentWeekStart, currentMonth, isMobile]);

  const fetchReservations = async (startDate, endDate) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reservas")
        .select(`*, usuario:usuarios(nombre)`)
        .gte("fecha", startDate)
        .lte("fecha", endDate)
        .neq("estado", "cancelada");

      if (error) throw error;
      setReservas(data || []);
    } catch (error) {
      console.error("Error fetching agenda:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: Navigation ---
  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentMonth(newDate);
  };

  // --- HELPERS ---
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const getSlotData = (date, time) => {
    const dateStr = date.toISOString().split("T")[0];
    const slotReservations = reservas.filter(
      (r) => r.fecha === dateStr && r.hora.slice(0, 5) === time
    );
    return slotReservations;
  };

  const allTimes = [
    ...GYM_CONSTANTS.TURNOS.MAÑANA.horarios,
    ...GYM_CONSTANTS.TURNOS.TARDE.horarios,
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-fade-in transition-all">
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:block">
        {/* Header Desktop */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">
              Disponibilidad Semanal
            </h2>
          </div>

          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => changeWeek(-1)}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="px-4 font-semibold text-gray-700">
              {weekDays[0].toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
              })}{" "}
              -{" "}
              {weekDays[4].toLocaleDateString("es-AR", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <button
              onClick={() => changeWeek(1)}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Table Desktop */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 bg-gray-50 border border-gray-100 text-left text-xs font-bold text-gray-500 uppercase">
                    Horario
                  </th>
                  {weekDays.map((day, i) => (
                    <th
                      key={i}
                      className="p-3 bg-gray-50 border border-gray-100 text-center min-w-[120px]"
                    >
                      <div className="text-xs font-bold text-gray-500 uppercase">
                        {day.toLocaleDateString("es-AR", { weekday: "long" })}
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {day.getDate()}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allTimes.map((time) => (
                  <tr key={time} className="hover:bg-gray-50/50">
                    <td className="p-3 border border-gray-100 font-mono font-bold text-gray-600 bg-gray-50/30">
                      {time}
                    </td>
                    {weekDays.map((day, i) => {
                      const slotReservs = getSlotData(day, time);
                      const count = slotReservs.length;
                      const isFull = count >= 6;
                      return (
                        <td
                          key={i}
                          className="p-2 border border-gray-100 text-center align-middle"
                        >
                          <button
                            onClick={() =>
                              setSelectedSlot({
                                day,
                                time,
                                reservations: slotReservs,
                              })
                            }
                            className={`w-full py-3 rounded-lg flex flex-col items-center justify-center transition-all ${
                              isFull
                                ? "bg-red-50 border border-red-200 hover:bg-red-100"
                                : "bg-green-50 border border-green-200 hover:bg-green-100"
                            }`}
                          >
                            <span
                              className={`text-lg font-bold ${
                                isFull ? "text-red-600" : "text-green-600"
                              }`}
                            >
                              {count}/6
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="block md:hidden">
        {/* Header Mobile */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 -mx-6 -mt-6 p-6 mb-6 rounded-b-3xl shadow-lg text-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Disponibilidad</h2>
            <CalendarIcon className="w-6 h-6 opacity-80" />
          </div>

          <div className="flex items-center justify-between bg-white/20 rounded-xl p-2 backdrop-blur-sm">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg capitalize">
              {currentMonth.toLocaleDateString("es-AR", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Calendar Grid Mobile */}
        <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-400 mb-2">
          <div>LU</div>
          <div>MA</div>
          <div>MI</div>
          <div>JU</div>
          <div>VI</div>
          <div>SA</div>
          <div>DO</div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-6">
          {calendarDays.map((d, i) => {
            if (!d.day) return <div key={i}></div>;
            const isSelected =
              selectedDate &&
              d.date.getDate() === selectedDate.getDate() &&
              d.date.getMonth() === selectedDate.getMonth();
            const isToday = new Date().toDateString() === d.date.toDateString();

            // Capacity Logic
            const dateStr = d.date.toISOString().split("T")[0];
            const dayReservs = reservas.filter((r) => r.fecha === dateStr);
            const hasReservations = dayReservs.length > 0;

            // Estimate if fully booked (simplified check: if > 90% capacity or strict check)
            // Strict: 6 beds * number of slots (approx 10) = 60 capacity
            const dayOfWeek = d.date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const maxCapacity = isWeekend ? 0 : allTimes.length * 6;
            const isFull = maxCapacity > 0 && dayReservs.length >= maxCapacity;

            // Visual Style
            let statusClass = "text-gray-700 hover:bg-purple-50"; // Default
            if (isFull)
              statusClass = "bg-red-100 text-red-600 border border-red-200";
            else if (hasReservations)
              statusClass =
                "bg-green-50 text-green-600 border border-green-200";

            if (isSelected)
              statusClass =
                "bg-purple-600 text-white shadow-lg scale-110 border-transparent";

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(d.date)}
                className={`
                            custom-transition h-10 w-10 mx-auto flex items-center justify-center rounded-full font-bold text-sm border
                            ${statusClass}
                            ${
                              isToday && !isSelected
                                ? "ring-2 ring-purple-400 ring-offset-2"
                                : ""
                            }
                        `}
              >
                {d.day}
              </button>
            );
          })}
        </div>

        {/* Slots List for Selected Date */}
        <div className="space-y-3 animate-slide-up">
          <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 capitalize">
            {selectedDate.toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>

          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : (
            allTimes
              .map((time) => {
                const slotReservs = getSlotData(selectedDate, time);
                const count = slotReservs.length;
                const isFull = count >= 6;

                // Only show slots for days M-F? Gym Logic
                const dayNum = selectedDate.getDay(); // 0 Sun, 6 Sat
                if (dayNum === 0 || dayNum === 6) return null; // Simple filter for weekends if needed

                return (
                  <div
                    key={time}
                    onClick={() =>
                      setSelectedSlot({
                        day: selectedDate,
                        time,
                        reservations: slotReservs,
                      })
                    }
                    className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center justify-between active:scale-95 transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-100 p-2 rounded-lg">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <span className="font-bold text-gray-700 text-lg">
                        {time} hs
                      </span>
                    </div>
                    <div
                      className={`px-4 py-2 rounded-lg font-bold ${
                        isFull
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {count}/6 {isFull ? "LLENO" : "LIBRE"}
                    </div>
                  </div>
                );
              })
              .filter(Boolean).length === 0 && (
              <p className="text-center text-gray-400 py-4">
                No hay horarios disponibles este día.
              </p>
            )
          )}
        </div>
      </div>

      {/* Modal De Talle (Shared) */}
      {selectedSlot && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 capitalize">
                {selectedSlot.day.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <p className="text-purple-600 font-bold text-lg">
                {selectedSlot.time} hs
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[1, 2, 3, 4, 5, 6].map((bedId) => {
                const reservation = selectedSlot.reservations.find(
                  (r) => r.cama_id === bedId
                );
                return (
                  <div
                    key={bedId}
                    className={`p-3 rounded-xl border-2 ${
                      reservation
                        ? "border-red-100 bg-red-50"
                        : "border-green-100 bg-green-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-bold ${
                          reservation ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        Cama #{bedId}
                      </span>
                    </div>
                    {reservation ? (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-semibold text-gray-700 truncate">
                          {reservation.usuario?.nombre || "Ocupada"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-green-600 font-medium">
                        Libre
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedSlot(null)}
              className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Cerrar Detalle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

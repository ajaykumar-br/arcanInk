"use client";

import { Button } from "@ajaykumar_br/ui/button";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HTTP_BACKEND_URL } from "@/config";

type RoomForm = {
  name: string;
};

type RoomSummary = {
  id: number;
  slug: string;
  createdAt: string;
  isOwner: boolean;
  shapeCount: number;
};

const inputClass = "w-full p-2 border border-input bg-background text-foreground rounded";

const errorMessage = (e: unknown, fallback: string) =>
  axios.isAxiosError(e) && e.response?.data?.msg ? String(e.response.data.msg) : fallback;

export default function Room() {
  const router = useRouter();
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");

  const create = useForm<RoomForm>();
  const join = useForm<RoomForm>();

  const authHeaders = useCallback(() => ({ Authorization: localStorage.getItem("token") ?? "" }), []);

  const loadRooms = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      router.replace("/signin");
      return;
    }
    try {
      const res = await axios.get(`${HTTP_BACKEND_URL}/rooms`, { headers: authHeaders() });
      setRooms(res.data.rooms);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        // expired or invalid token
        localStorage.removeItem("token");
        router.replace("/signin");
        return;
      }
      setLoadError("Couldn't load your rooms. Is the server running?");
    }
  }, [router, authHeaders]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const onCreate = async (data: RoomForm) => {
    setCreateError("");
    try {
      const res = await axios.post(`${HTTP_BACKEND_URL}/room`, data, { headers: authHeaders() });
      router.push(`/canvas/${res.data.roomId}`);
    } catch (e) {
      setCreateError(errorMessage(e, "Couldn't create the room."));
    }
  };

  const onJoin = async (data: RoomForm) => {
    setJoinError("");
    try {
      const res = await axios.get(`${HTTP_BACKEND_URL}/room/${encodeURIComponent(data.name)}`);
      if (!res.data.room) {
        setJoinError(`No room named "${data.name}".`);
        return;
      }
      router.push(`/canvas/${res.data.room.id}`);
    } catch (e) {
      setJoinError(errorMessage(e, "Couldn't look up that room."));
    }
  };

  return (
    <div className="min-h-screen bg-accent pt-24 pb-12 px-4">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <form
            onSubmit={create.handleSubmit(onCreate)}
            className="border border-border rounded-md bg-card text-card-foreground shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Create a room</h2>
            <input
              type="text"
              placeholder="Room name (3–20 characters)"
              className={inputClass}
              {...create.register("name", {
                required: "Room name is required",
                minLength: { value: 3, message: "At least 3 characters" },
                maxLength: { value: 20, message: "At most 20 characters" },
              })}
            />
            {create.formState.errors.name && (
              <p className="mt-2 text-sm text-red-500">{create.formState.errors.name.message}</p>
            )}
            {createError && <p className="mt-2 text-sm text-red-500">{createError}</p>}
            <Button
              type="submit"
              className="py-2 w-full mt-4 text-lg rounded-sm text-white bg-primary hover:bg-blue-800"
              variant="outline"
              size="sm"
            >
              {create.formState.isSubmitting ? "Creating..." : "Create room"}
            </Button>
          </form>

          <form
            onSubmit={join.handleSubmit(onJoin)}
            className="border border-border rounded-md bg-card text-card-foreground shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4">Join a room</h2>
            <input
              type="text"
              placeholder="Room name"
              className={inputClass}
              {...join.register("name", { required: "Enter a room name" })}
            />
            {join.formState.errors.name && (
              <p className="mt-2 text-sm text-red-500">{join.formState.errors.name.message}</p>
            )}
            {joinError && <p className="mt-2 text-sm text-red-500">{joinError}</p>}
            <Button type="submit" className="py-2 w-full mt-4 text-lg rounded-sm" variant="secondary" size="sm">
              {join.formState.isSubmitting ? "Looking up..." : "Join room"}
            </Button>
          </form>
        </div>

        <section className="border border-border rounded-md bg-card text-card-foreground shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your rooms</h2>
          {loadError && <p className="text-sm text-red-500">{loadError}</p>}
          {!loadError && rooms === null && <p className="text-muted-foreground">Loading...</p>}
          {rooms?.length === 0 && (
            <p className="text-muted-foreground">
              You haven&apos;t created or drawn in any rooms yet. Create one above, or join a friend&apos;s by name.
            </p>
          )}
          {rooms && rooms.length > 0 && (
            <ul className="divide-y divide-border">
              {rooms.map((room) => (
                <li key={room.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{room.slug}</span>
                      {room.isOwner && (
                        <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5">Owner</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {room.shapeCount} {room.shapeCount === 1 ? "drawing" : "drawings"} · created{" "}
                      {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/canvas/${room.id}`}
                    className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

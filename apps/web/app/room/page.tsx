"use client";

import { Button } from "@repo/ui/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { HTTP_BACKEND_URL } from "@/config";

type createRoom = {
    name: string;
}

export default function Room() {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors, isSubmitting }} = useForm<createRoom>();

    const onSubmit = async (data: createRoom) => {
        try {
            //todo: create room
            const res = await axios.post(`${HTTP_BACKEND_URL}/room`, data, {
              headers: {
                Authorization: localStorage.getItem("token"),
              },
            });
            router.push(`/canvas/${res.data.roomId}`);
        } catch (e) {
            console.error(e);
        }
    }
    return (
      <div className="w-screen h-screen flex justify-center items-center bg-accent">
        <div className="border border-gray-300 rounded-md w-[400px] bg-white shadow-lg">
          <h1 className="text-4xl font-semibold text-white bg-primary flex justify-center items-center h-[100px] rounded-t-md">
            AracanInk Room
          </h1>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="py-16 px-8">
              <input
                type="text"
                placeholder="Room Name"
                className="w-full p-2 border border-gray-300 rounded"
                {...register("name", { required: true })}
              />
              {errors.name && <span>errors.slug.message</span>}
              <Button
                type="submit"
                className="py-2 w-full mt-8 text-lg rounded-sm text-semibold text-white bg-primary hover:bg-blue-800"
                variant="outline"
                size="sm"
              >
                {isSubmitting ? "Creating Room..." : "Create Room"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
}
"use client";

import { Button } from "@ajaykumar_br/ui/button";
import axios from "axios";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HTTP_BACKEND_URL } from "@/config";
import { useState } from "react";

type signUp = {
  username: string;
  name?: string;
  password: string;
};

export function AuthPage({ isSignin }: { isSignin: boolean }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<signUp>();
  const [signInFlag, setSignInFlag] = useState(false);

  const onSubmit = async (data: signUp) => {
    try {
      const response = await axios.post(
        `${HTTP_BACKEND_URL}/${isSignin ? "signin" : "signup"}`,
        data
      );
      if (isSignin) {
        localStorage.setItem("token", response.data.token);
        router.push("/room");
      } else {
        router.push("/signin");
      }
    } catch (e) {
      setSignInFlag(true);
      setTimeout(() => {
        setSignInFlag(false);
      }, 2000);
      console.error(e);
    }
  };

  return (
    <div>
      <div className="relative">
        <div
          className={`${signInFlag ? "absolute z-20 left-[40%] top-20 bg-red-500 text-white text-lg flex justify-center items-center py-4 px-20 rounded shadow-lg shadow-red-500/50" : "hidden"}`}
        >
          Invalid Credentials
        </div>
      </div>
      <div className="w-screen h-screen flex justify-center items-center bg-accent">
        <div className="border border-gray-300 rounded-md w-[400px] bg-white shadow-lg">
          <h1
            className={`text-4xl font-semibold text-white flex justify-center items-center h-[100px] rounded-t-md ${isSignin ? "bg-green-500" : "bg-red-500"}`}
          >
            {isSignin ? "Login Form" : "Register Form"}
          </h1>
          <form className="px-6 py-8" onSubmit={handleSubmit(onSubmit)}>
            <div className="p-2">
              <input
                type="text"
                {...register("username", { required: "email required" })}
                placeholder="Email"
                className="w-full p-2 border border-gray-300 rounded"
              />
              {errors.username && (
                <p className="text-red-500">{errors.username.message}</p>
              )}
            </div>
            {!isSignin && (
              <div className="p-2">
                <input
                  type="text"
                  {...register("name", { required: "name required" })}
                  placeholder="name"
                  className="w-full p-2 border border-gray-300 rounded"
                />
                {errors.name && (
                  <p className="text-red-500">{errors.name.message}</p>
                )}
              </div>
            )}
            <div className="p-2">
              <input
                type="password"
                {...register("password", { required: "password required" })}
                placeholder="password"
                className="w-full p-2 border border-gray-300 rounded"
              />
              {errors.password && (
                <p className="text-red-500">{errors.password.message}</p>
              )}
            </div>
            <div className="pt-6 text-center">
              <Button
                type="submit"
                className={`text-white rounded-sm p-2 w-[96%] text-md font-semibold ${isSignin ? "bg-green-500 hover:bg-green-700" : "bg-red-500 hover:bg-red-700"}`}
                variant="outline"
                size="sm"
              >
                {isSubmitting
                  ? "Submitting..."
                  : isSignin
                    ? "Login"
                    : "Register"}
              </Button>
            </div>
            <div className="pt-4 text-center">
              <p className="text-gray-500">
                {isSignin
                  ? "Don't have an account? |"
                  : "Already have an account? |"}
                <Link
                  href={isSignin ? "/signup" : "/signin"}
                  className="text-primary hover:underline ml-1"
                >
                  {isSignin ? "Register" : "Login"}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

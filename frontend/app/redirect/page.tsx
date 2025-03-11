"use client";

import { LoginCallBack, useOCAuth } from "@opencampus/ocid-connect-js";
import { useRouter } from "next/navigation";
import { DotLoader } from "react-spinners";
import { toast } from "react-toastify";

export default function RedirectPage() {
  const router = useRouter();

  const loginSuccess = () => {
    router.push("/contests"); // Redirect after successful login
  };

  const loginError = (error: any) => {
    console.error(error)
    router.push("/");
    toast.error("Couldn't Login", {
      position: "top-center",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
    });
  };

  function CustomErrorComponent() {
    const { authState } = useOCAuth();
    return <div>Error Logging in: {authState.error?.message}</div>;
  }

  function CustomLoadingComponent() {
    return (
      <div className="h-[90vh] w-full flex items-center justify-center">
        <DotLoader color="#fff" />
      </div>
    );
  }

  return (
    <LoginCallBack
      errorCallback={loginError}
      successCallback={loginSuccess}
      customErrorComponent={<CustomErrorComponent />}
      customLoadingComponent={<CustomLoadingComponent />}
    />
  );
}

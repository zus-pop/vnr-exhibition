"use client";
import { SocketProvider } from "@/provider/SocketProvider";
import React from "react";

const ExhibitionLayout = ({
  children,
}: {
  children: Readonly<React.ReactNode>;
}) => {
  return (
    <SocketProvider>
      <div className="w-screen h-screen">{children}</div>
    </SocketProvider>
  );
};

export default ExhibitionLayout;

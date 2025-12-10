"use client";
import { SocketProvider } from "@/provider/SocketProvider";
import React from "react";
import MyQuery from "../../components/MyQuery";

const ExhibitionLayout = ({
  children,
}: {
  children: Readonly<React.ReactNode>;
}) => {
  return (
    <MyQuery>
      <SocketProvider>
        <div className="w-screen h-screen">{children}</div>
      </SocketProvider>
    </MyQuery>
  );
};

export default ExhibitionLayout;

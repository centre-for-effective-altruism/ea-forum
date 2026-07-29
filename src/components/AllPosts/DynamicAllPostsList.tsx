"use client";

import dynamic from "next/dynamic";

const DynamicAllPostsList = dynamic(() => import("./AllPostsList"), { ssr: false });

export default DynamicAllPostsList;

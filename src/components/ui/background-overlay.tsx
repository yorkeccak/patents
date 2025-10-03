"use client";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface BackgroundOverlayProps {
  children: ReactNode;
  defaultBackground?: string;
  hoverBackground?: string;
  className?: string;
  onClick?: () => void;
}

export function BackgroundOverlay({
  children,
  defaultBackground,
  hoverBackground,
  className,
  onClick,
}: BackgroundOverlayProps) {
  return (
    <div
      className={cn(
        "group w-full cursor-pointer overflow-hidden relative rounded-md transition-all duration-500",
        className
      )}
      onClick={onClick}
      style={{
        backgroundImage: defaultBackground
          ? `url(${defaultBackground})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Hover background overlay */}
      {hoverBackground && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-cover bg-center"
          style={{
            backgroundImage: `url(${hoverBackground})`,
          }}
        />
      )}

      {/* Dark overlay on hover */}
      {hoverBackground && (
        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

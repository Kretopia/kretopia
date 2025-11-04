import { ReactNode, forwardRef } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { X, Heart } from "lucide-react";

interface SwipeCardProps {
  children: ReactNode;
  dragOffset: { x: number; y: number };
  swipeDirection: "left" | "right" | null;
  isDragging: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: () => void;
  className?: string;
  showOverlay?: boolean;
}

export const SwipeCard = forwardRef<HTMLDivElement, SwipeCardProps>(
  (
    {
      children,
      dragOffset,
      swipeDirection,
      isDragging,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      className,
      showOverlay = true
    },
    ref
  ) => {
    const rotation = dragOffset.x * 0.05;
    const opacity = 1 - Math.abs(dragOffset.x) / (window.innerWidth * 0.7);

    return (
      <Card
        ref={ref}
        className={cn(
          "relative overflow-hidden shadow-xl border-2 transition-shadow cursor-grab active:cursor-grabbing",
          isDragging && "shadow-2xl",
          className
        )}
        style={{
          transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`,
          transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: Math.max(opacity, 0.3)
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {children}

        {/* Swipe Direction Overlays */}
        {showOverlay && swipeDirection && (
          <>
            {swipeDirection === "left" && (
              <div className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <div className="bg-red-500 text-white p-4 rounded-full">
                  <X className="h-12 w-12" />
                </div>
              </div>
            )}
            {swipeDirection === "right" && (
              <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                <div className="bg-green-500 text-white p-4 rounded-full">
                  <Heart className="h-12 w-12" />
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    );
  }
);

SwipeCard.displayName = "SwipeCard";

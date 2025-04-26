'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedNumberProps {
  /**
   * The target value to animate to
   */
  value: number;

  /**
   * Duration of the animation in milliseconds
   * @default 1000
   */
  duration?: number;

  /**
   * Number of decimal places to display
   * @default 0
   */
  decimals?: number;

  /**
   * Format function to customize the displayed value
   * For example, adding currency symbols, percentage signs, etc.
   */
  formatter?: (value: number) => string;

  /**
   * Additional class name for the container
   */
  className?: string;
}

/**
 * A component that animates between number values using requestAnimationFrame
 * for optimal performance
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  decimals = 0,
  formatter,
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const startValueRef = useRef<number>(value);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const runAnimation = useCallback(() => {
    // Store the current display value as the starting point
    startValueRef.current = displayValue;
    // Reset the start time
    startTimeRef.current = null;

    // Cancel any in-progress animation
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    // Skip animation if the component just mounted
    if (displayValue === value) {
      return;
    }

    // Animation step function using requestAnimationFrame for optimal performance
    const animateValue = (timestamp: number) => {
      // Initialize start time on first frame
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      // Calculate elapsed time as a fraction of the total duration
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Calculate the current value based on progress
      const currentValue =
        startValueRef.current + (value - startValueRef.current) * progress;

      // Update the display value
      setDisplayValue(currentValue);

      // Continue the animation if not complete
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animateValue);
      }
    };

    // Start the animation
    frameRef.current = requestAnimationFrame(animateValue);

    // Clean up animation on unmount or value change
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [displayValue, value, duration]);

  // Format the display value based on decimal places and optional formatter
  const formattedValue = formatter
    ? formatter(displayValue)
    : displayValue.toFixed(decimals);

  // Run the animation effect when the component mounts or the value changes
  useEffect(runAnimation, []);

  return (
    <span className={cn('inline-block', className)}>{formattedValue}</span>
  );
}

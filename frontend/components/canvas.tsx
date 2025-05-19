"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Size, Point } from "@/lib/utils";
import Grid from "@/components/grid"

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_STEP_FACTOR = 1.05;

export default function Canvas() {
    const viewportRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState<number>(1);
    const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });

    // Touch Panning State (Two Fingers)
    const [isTwoFingerPanning, setIsTwoFingerPanning] = useState<boolean>(false);
    const [lastTwoFingerMidpoint, setLastTwoFingerMidpoint] = useState<Point | null>(null);

    const [viewportSize, setViewportSize] = useState<Size | null>(null);

    useEffect(() => {
        const viewportElement = viewportRef.current;
        if (!viewportElement) return;
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const newWidth = entry.contentRect.width;
                const newHeight = entry.contentRect.height;
                setViewportSize({ width: newWidth, height: newHeight });
                setPanOffset(prev => {
                    if (prev.x === 0 && prev.y === 0 && newWidth > 0 && newHeight > 0) {
                        return { x: newWidth / 2, y: newHeight / 2 };
                    }
                    return prev;
                });
            }
        });
        resizeObserver.observe(viewportElement);
        return () => resizeObserver.unobserve(viewportElement);
    }, []);

    const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        const mouseX: number = event.clientX - rect.left;
        const mouseY: number = event.clientY - rect.top;
        const oldZoom = zoom;
        let newZoom: number;
        if (event.deltaY < 0) {
            newZoom = Math.min(MAX_ZOOM, oldZoom * ZOOM_STEP_FACTOR);
        } else {
            newZoom = Math.max(MIN_ZOOM, oldZoom / ZOOM_STEP_FACTOR);
        }
        if (newZoom === oldZoom) return;
        const worldMouseX: number = (mouseX - panOffset.x) / oldZoom;
        const worldMouseY: number = (mouseY - panOffset.y) / oldZoom;
        const newPanX: number = mouseX - worldMouseX * newZoom;
        const newPanY: number = mouseY - worldMouseY * newZoom;
        setZoom(newZoom);
        setPanOffset({ x: newPanX, y: newPanY });
    }, [zoom, panOffset]);

    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
        if (event.touches.length === 2) {
            event.preventDefault();
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            setIsTwoFingerPanning(true);
            setLastTwoFingerMidpoint({
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2,
            });
            if (viewportRef.current) viewportRef.current.style.cursor = 'move';
        }
    }, []);

    const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
        if (isTwoFingerPanning && event.touches.length === 2 && lastTwoFingerMidpoint) {
            event.preventDefault();
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentMidpoint = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2,
            };
            const dx = currentMidpoint.x - lastTwoFingerMidpoint.x;
            const dy = currentMidpoint.y - lastTwoFingerMidpoint.y;
            setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastTwoFingerMidpoint(currentMidpoint);
        } else if (isTwoFingerPanning && event.touches.length !== 2) {
            setIsTwoFingerPanning(false);
            setLastTwoFingerMidpoint(null);
            if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
        }
    }, [isTwoFingerPanning, lastTwoFingerMidpoint]);

    const handleTouchEndOrCancel = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
        if (isTwoFingerPanning && event.touches.length < 2) {
            setIsTwoFingerPanning(false);
            setLastTwoFingerMidpoint(null);
            if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
        }
    }, [isTwoFingerPanning]);

    return (
        <div
            ref={viewportRef}
            className="w-full h-full bg-gray-50 rounded-md shadow-lg overflow-hidden relative select-none touch-none"
            style={{ cursor: 'grab' }}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEndOrCancel}
            onTouchCancel={handleTouchEndOrCancel}
        >
            <Grid zoom={zoom} panOffset={panOffset} viewportSize={viewportSize} />
            <div
                className="absolute top-0 left-0"
                style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: '0 0',
                }}
            >
                <div
                    style={{
                        position: 'absolute', left: 0, top: 0, width: 5, height: 5,
                        backgroundColor: 'rgba(0, 255, 0, 0.8)',
                    }}
                    title="World Origin (0,0)"
                />
            </div>
            <div className="absolute bottom-2 right-2 p-2 bg-gray-800 text-white text-xs rounded opacity-80 pointer-events-none">
                <div>Zoom: {zoom.toFixed(2)}x</div>
                <div>Pan: X: {panOffset.x.toFixed(0)}, Y: {panOffset.y.toFixed(0)}</div>
            </div>
        </div>
    );
}
